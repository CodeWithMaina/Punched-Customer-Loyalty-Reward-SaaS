using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Admin module management: view a business's effective modules and
/// force-enable/disable any module (source=ADMIN), with an audit reason.
/// All endpoints require Admin role. Target businesses are validated to
/// exist (404) to avoid business-id probing.
/// Base route: /v1/admin/businesses/{businessId}/modules
/// </summary>
[ApiController]
[Produces("application/json")]
[Authorize(Roles = "Admin")]
public class AdminModulesController : ControllerBase
{
    private readonly IModuleEntitlementService _entitlementService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminModulesController> _logger;

    public AdminModulesController(
        IModuleEntitlementService entitlementService,
        ApplicationDbContext context,
        ILogger<AdminModulesController> logger)
    {
        _entitlementService = entitlementService;
        _context = context;
        _logger = logger;
    }

    // ── Business Module Management ──────────────────────────

    /// <summary>
    /// The target business's full per-module entitlement detail (plan, source,
    /// access) for the admin module-management console.
    /// </summary>
    [HttpGet("v1/admin/businesses/{businessId:guid}/modules")]
    [ProducesResponseType(typeof(ApiResponse<AdminBusinessModulesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBusinessModules(Guid businessId)
    {
        var businessExists = await _context.Businesses.AsNoTracking().AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            return NotFound(ApiResponse<AdminBusinessModulesResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business exists with the given id."));

        var entitlements = await _entitlementService.GetBusinessModulesAsync(businessId);
        var response = new AdminBusinessModulesResponse
        {
            Modules = entitlements.Modules.Select(m => new BusinessModuleDetail
            {
                Key = m.Key,
                Name = m.Name,
                Description = m.Description,
                Enabled = m.IsEnabled,
                Source = m.Source,
                HasAccess = m.HasAccess,
                Dependencies = m.Dependencies,
                IsCore = m.IsCore
            }).ToList()
        };

        if (entitlements.CurrentPlan != null)
        {
            response.Plan = new CallerPlanInfo
            {
                Key = entitlements.CurrentPlan.Key,
                Name = entitlements.CurrentPlan.Name,
                Status = entitlements.SubscriptionStatus ?? "active",
                EndsAt = entitlements.SubscriptionEndsAt
            };
        }

        return Ok(ApiResponse<AdminBusinessModulesResponse>.Ok(response));
    }

    /// <summary>
    /// Force-enable or force-disable any module for the target business by
    /// upserting a <c>business_modules</c> row with source=ADMIN. The reason
    /// is logged for audit purposes. Invalidates the entitlement cache.
    /// </summary>
    [HttpPut("v1/admin/businesses/{businessId:guid}/modules/{moduleKey}")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetBusinessModuleOverride(
        Guid businessId, string moduleKey, [FromBody] AdminSetModuleOverrideRequest request)
    {
        var businessExists = await _context.Businesses.AsNoTracking().AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business exists with the given id."));

        var module = await _context.Modules.FirstOrDefaultAsync(m => m.Key == moduleKey && m.IsActive);
        if (module == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "MODULE_NOT_FOUND", $"No active module with key '{moduleKey}'."));

        // Dependency validation (G7): validate the RESULTING override set —
        // the new value for this module layered over the existing overrides.
        // Force=true bypasses the check for deliberate out-of-band grants.
        if (!request.Force)
        {
            var existingOverrides = await _context.BusinessModules
                .Where(bm => bm.BusinessId == businessId && bm.ModuleId != module.Id)
                .Join(_context.Modules,
                    bm => bm.ModuleId,
                    m => m.Id,
                    (bm, m) => new { m.Key, bm.IsEnabled })
                .Select(x => new { x.Key, x.IsEnabled })
                .ToListAsync();

            var overrideSet = existingOverrides
                .Select(x => (ModuleKey: x.Key, Enabled: x.IsEnabled))
                .ToList();
            overrideSet.Add((module.Key, request.Enabled));

            var problems = _entitlementService.ValidateConfiguration(overrideSet);
            if (problems.Count > 0)
                return BadRequest(ApiResponse<MessageResponse>.Fail(
                    "DEPENDENCY_MISSING",
                    $"Override rejected: {string.Join("; ", problems)}. Retry with force=true to bypass."));
        }

        var adminUserId = CurrentUserId();
        var overrideRow = await _context.BusinessModules
            .FirstOrDefaultAsync(bm => bm.BusinessId == businessId && bm.ModuleId == module.Id);

        if (overrideRow == null)
        {
            overrideRow = new BusinessModule
            {
                BusinessId = businessId,
                ModuleId = module.Id
            };
            _context.BusinessModules.Add(overrideRow);
        }

        overrideRow.IsEnabled = request.Enabled;
        overrideRow.Source = "ADMIN";
        overrideRow.OverridesAt = DateTime.UtcNow;
        overrideRow.OverriddenByUserId = adminUserId;
        await _context.SaveChangesAsync();

        _entitlementService.Invalidate(businessId);
        _logger.LogWarning(
            "ADMIN module override: business {BusinessId} module {ModuleKey} {Action} by admin {AdminUserId}. Reason: {Reason}",
            businessId, moduleKey, request.Enabled ? "FORCE-ENABLED" : "FORCE-DISABLED",
            adminUserId, request.Reason ?? "(none)");

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = $"Module '{moduleKey}' {(request.Enabled ? "force-enabled" : "force-disabled")} for the business."
        }));
    }

    /// <summary>
    /// Removes any override row (ADMIN or OVERRIDE) for the target business's
    /// module, reverting it to plan-driven entitlement. Invalidates the cache.
    /// </summary>
    [HttpDelete("v1/admin/businesses/{businessId:guid}/modules/{moduleKey}")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveBusinessModuleOverride(Guid businessId, string moduleKey)
    {
        var module = await _context.Modules.FirstOrDefaultAsync(m => m.Key == moduleKey);
        if (module == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "MODULE_NOT_FOUND", $"No module with key '{moduleKey}'."));

        var overrideRow = await _context.BusinessModules
            .FirstOrDefaultAsync(bm => bm.BusinessId == businessId && bm.ModuleId == module.Id);
        if (overrideRow == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "OVERRIDE_NOT_FOUND", $"No override exists for module '{moduleKey}'."));

        _context.BusinessModules.Remove(overrideRow);
        await _context.SaveChangesAsync();

        _entitlementService.Invalidate(businessId);
        _logger.LogInformation(
            "ADMIN override removal: business {BusinessId} module {ModuleKey} reverted to plan entitlement by {AdminUserId}.",
            businessId, moduleKey, CurrentUserId());

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = $"Override for '{moduleKey}' removed; reverting to plan entitlement."
        }));
    }

    /// <summary>The authenticated admin's user id from the JWT, or null.</summary>
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
