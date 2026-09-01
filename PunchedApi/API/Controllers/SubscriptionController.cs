using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Infrastructure.Data;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Subscription lifecycle and billing (Steps 7.4/7.5):
/// - GET  /v1/plans                                        (anonymous)   — active plans + bundled modules
/// - PUT  /v1/admin/businesses/{id}/subscription           (Admin)       — manual plan assignment
/// - DELETE /v1/admin/businesses/{id}/subscription         (Admin)       — cancel
/// - POST /v1/businesses/me/subscription/upgrade           (Owner)       — self-service upgrade
/// - POST /v1/webhooks/payments                            (anonymous)   — payment gateway webhook
/// Every lifecycle mutation flows through <see cref="ISubscriptionLifecycleService"/>,
/// which invalidates the business's entitlement cache.
/// </summary>
[ApiController]
[Produces("application/json")]
[Authorize]
[EnableRateLimiting("general")]
public class SubscriptionController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ISubscriptionLifecycleService _lifecycle;
    private readonly IBillingGateway _billingGateway;
    private readonly IBusinessContext _businessContext;
    private readonly ILogger<SubscriptionController> _logger;

    public SubscriptionController(
        ApplicationDbContext context,
        ISubscriptionLifecycleService lifecycle,
        IBillingGateway billingGateway,
        IBusinessContext businessContext,
        ILogger<SubscriptionController> logger)
    {
        _context = context;
        _lifecycle = lifecycle;
        _billingGateway = billingGateway;
        _businessContext = businessContext;
        _logger = logger;
    }

    // ── Plans API (G11) ─────────────────────────────────────

    /// <summary>All active subscription plans with their bundled module keys.</summary>
    [HttpGet("v1/plans")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<PlanSummary>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _context.SubscriptionPlans
            .Include(p => p.PlanModules)
            .ThenInclude(pm => pm.Module)
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Price)
            .ToListAsync();

        var response = plans.Select(p => new PlanSummary
        {
            Key = p.Key,
            Name = p.Name,
            Description = p.Description,
            Price = p.Price,
            BillingInterval = p.BillingInterval,
            Modules = p.PlanModules.Select(pm => pm.Module.Key).ToList()
        }).ToList();

        return Ok(ApiResponse<List<PlanSummary>>.Ok(response));
    }

    // ── Admin manual plan assignment (G4) ───────────────────

    /// <summary>
    /// Manually assigns (or changes) a business's plan. Creates a new active
    /// subscription and cancels the previous one. Requires Admin.
    /// </summary>
    [HttpPut("v1/admin/businesses/{businessId:guid}/subscription")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<UpgradePlanResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AdminAssignPlan(Guid businessId, [FromBody] AdminAssignPlanRequest request)
    {
        var businessExists = await _context.Businesses.AsNoTracking().AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            return NotFound(ApiResponse<UpgradePlanResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business exists with the given id."));

        var plan = await _context.SubscriptionPlans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == request.PlanKey);
        if (plan == null)
            return NotFound(ApiResponse<UpgradePlanResponse>.Fail(
                "PLAN_NOT_FOUND", $"No plan with key '{request.PlanKey}'."));

        if (!plan.IsActive)
            return BadRequest(ApiResponse<UpgradePlanResponse>.Fail(
                "PLAN_INACTIVE", $"Plan '{request.PlanKey}' is inactive and cannot be assigned."));

        var adminUserId = CurrentUserId();
        var subscription = await _lifecycle.ChangePlanAsync(businessId, plan.Id, adminUserId, request.Reason);

        return Ok(ApiResponse<UpgradePlanResponse>.Ok(new UpgradePlanResponse
        {
            PlanKey = plan.Key,
            Status = subscription.Status
        }));
    }

    /// <summary>Cancels the business's active subscription. Requires Admin.</summary>
    [HttpDelete("v1/admin/businesses/{businessId:guid}/subscription")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminCancelSubscription(Guid businessId)
    {
        var businessExists = await _context.Businesses.AsNoTracking().AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business exists with the given id."));

        await _lifecycle.CancelAsync(businessId, reason: $"Cancelled by admin {CurrentUserId()}");

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = "Subscription canceled for the business."
        }));
    }

    // ── Owner self-service upgrade (G11) ────────────────────

    /// <summary>
    /// Owner-initiated plan upgrade: initiates a payment via the billing
    /// gateway and, on confirmation (deterministic in the fake gateway),
    /// switches the business's plan immediately.
    /// </summary>
    [HttpPost("v1/businesses/me/subscription/upgrade")]
    [ProducesResponseType(typeof(ApiResponse<UpgradePlanResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Upgrade([FromBody] UpgradePlanRequest request)
    {
        var businessId = await _businessContext.GetBusinessIdAsync();
        if (businessId == null)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<UpgradePlanResponse>.Fail(
                "NO_BUSINESS", "The caller is not associated with a business."));

        var plan = await _context.SubscriptionPlans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == request.PlanKey);
        if (plan == null)
            return NotFound(ApiResponse<UpgradePlanResponse>.Fail(
                "PLAN_NOT_FOUND", $"No plan with key '{request.PlanKey}'."));
        if (!plan.IsActive)
            return BadRequest(ApiResponse<UpgradePlanResponse>.Fail(
                "PLAN_INACTIVE", $"Plan '{request.PlanKey}' is not available for subscription."));

        var initiation = await _billingGateway.InitiateAsync(plan, businessId.Value);
        if (!initiation.Success)
            return BadRequest(ApiResponse<UpgradePlanResponse>.Fail(
                "PAYMENT_FAILED", initiation.ErrorMessage ?? "Payment initiation failed."));

        // Deterministic fake gateway: confirmation is immediate. A real
        // integration defers ChangePlanAsync to the payments webhook.
        var subscription = await _lifecycle.ChangePlanAsync(
            businessId.Value, plan.Id, actorUserId: CurrentUserId(), reason: $"Owner upgrade (ref {initiation.Reference})");

        _logger.LogInformation(
            "Owner upgrade: business {BusinessId} → plan {PlanKey} (ref {Reference}).",
            businessId, plan.Key, initiation.Reference);

        return Ok(ApiResponse<UpgradePlanResponse>.Ok(new UpgradePlanResponse
        {
            PlanKey = plan.Key,
            Status = subscription.Status,
            PaymentReference = initiation.Reference
        }));
    }

    // ── Payment webhook (G11) ───────────────────────────────

    /// <summary>
    /// Payment gateway webhook. Documented payload:
    /// <c>{ "event": "payment.completed", "reference": "…", "businessId": "…",
    /// "planKey": "…", "occurredAt": "…" }</c>. "payment.completed" switches
    /// (or renews) the business's plan. The request MUST carry an
    /// <c>X-Punched-Signature</c> header with the HMAC-SHA256 (hex) of the raw
    /// body computed with <c>Billing:WebhookSecret</c>; verification is
    /// fail-closed, so unsigned or wrongly signed payloads are always rejected.
    /// </summary>
    [HttpPost("v1/webhooks/payments")]
    [AllowAnonymous]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PaymentWebhook(CancellationToken cancellationToken)
    {
        byte[] rawPayload;
        using (var ms = new MemoryStream())
        {
            await Request.Body.CopyToAsync(ms, cancellationToken);
            rawPayload = ms.ToArray();
        }

        if (!_billingGateway.VerifyWebhookSignature(rawPayload, Request.Headers["X-Punched-Signature"].FirstOrDefault()))
            return Unauthorized(ApiResponse<MessageResponse>.Fail(
                "INVALID_SIGNATURE", "Webhook signature verification failed."));

        PaymentWebhookRequest? request;
        try
        {
            request = System.Text.Json.JsonSerializer.Deserialize<PaymentWebhookRequest>(
                rawPayload, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (System.Text.Json.JsonException)
        {
            request = null;
        }

        if (request == null || request.BusinessId == Guid.Empty || string.IsNullOrWhiteSpace(request.PlanKey))
            return BadRequest(ApiResponse<MessageResponse>.Fail(
                "INVALID_PAYLOAD", "Webhook payload is invalid."));

        if (!string.Equals(request.Event, "payment.completed", StringComparison.OrdinalIgnoreCase))
        {
            // Other events (payment.failed, payment.pending…) are acknowledged
            // but do not change the subscription.
            return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = $"Event '{request.Event}' acknowledged."
            }));
        }

        var plan = await _context.SubscriptionPlans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == request.PlanKey);
        if (plan == null)
            return BadRequest(ApiResponse<MessageResponse>.Fail(
                "PLAN_NOT_FOUND", $"No plan with key '{request.PlanKey}'."));

        var activeSub = await _context.BusinessSubscriptions.AsNoTracking()
            .AnyAsync(s => s.BusinessId == request.BusinessId && s.PlanId == plan.Id &&
                (s.Status == "active" || s.Status == "trial"));

        if (activeSub)
        {
            await _lifecycle.RenewAsync(request.BusinessId);
        }
        else
        {
            await _lifecycle.ChangePlanAsync(request.BusinessId, plan.Id, actorUserId: null,
                reason: $"Webhook payment.completed (ref {request.Reference})");
        }

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = "Subscription updated."
        }));
    }

    /// <summary>The authenticated caller's user id from the JWT, or null.</summary>
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}

