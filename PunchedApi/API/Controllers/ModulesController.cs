using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Module endpoints: the caller's effective modules + permissions, and the
/// owner's full per-module entitlement detail. Also retains the Phase 3
/// admin-only diagnostic endpoint.
/// Routes: /v1/me/modules, /v1/businesses/me/modules, /v1/modules/entitlements/{businessId}
/// </summary>
[ApiController]
[Produces("application/json")]
[Authorize]
[EnableRateLimiting("general")]
public class ModulesController : ControllerBase
{
    private readonly IModuleEntitlementService _entitlementService;
    private readonly IBusinessContext _businessContext;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ModulesController> _logger;

    public ModulesController(
        IModuleEntitlementService entitlementService,
        IBusinessContext businessContext,
        ApplicationDbContext context,
        ILogger<ModulesController> logger)
    {
        _entitlementService = entitlementService;
        _businessContext = businessContext;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// The caller's effective modules and permissions, scoped to the
    /// SERVER-RESOLVED business (no businessId parameter). Admins get the full
    /// catalog; Customers get the catalog's customer-facing read modules.
    /// </summary>
    [HttpGet("v1/me/modules")]
    [ProducesResponseType(typeof(ApiResponse<MyModulesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyModules()
    {
        var role = _businessContext.GetRole();
        var response = new MyModulesResponse();

        if (role == "Admin")
        {
            // Admin is platform-level, not business-scoped: full catalog.
            response.Entitlements = ModuleCatalog.Modules.Select(m => m.Key).ToList();
            response.Permissions = PermissionMatrix.PermissionsForRole("Admin").ToList();
        }
        else if (role == "Customer")
        {
            // Customer: customer-facing read-side visibility from the catalog.
            var customerModules = ModuleCatalog.Modules
                .Where(m => m.RequiredRoles.Contains("Customer", StringComparer.OrdinalIgnoreCase))
                .Select(m => m.Key)
                .ToList();
            response.Entitlements = customerModules;
            var accessible = new HashSet<string>(customerModules, StringComparer.OrdinalIgnoreCase);
            response.Permissions = PermissionMatrix.PermissionsForRole("Customer")
                .Where(code => accessible.Contains(PermissionModuleKey(code)))
                .ToList();
        }
        else
        {
            // Business/Staff: tenant-scoped to the server-resolved business.
            var businessId = await _businessContext.GetBusinessIdAsync();
            if (businessId != null)
            {
                var entitlements = await _entitlementService.GetBusinessModulesAsync(businessId.Value);
                var entitledKeys = entitlements.Modules
                    .Where(m => m.HasAccess)
                    .Select(m => m.Key)
                    .ToList();

                // Nav list = explicit entitlements; access set = + closed deps (plan §14.1).
                response.Entitlements = entitledKeys;
                var accessSet = ModuleCatalog.CloseDependencies(entitledKeys);
                response.Permissions = PermissionMatrix.PermissionsForRole(role ?? string.Empty)
                    .Where(code => accessSet.Contains(PermissionModuleKey(code)))
                    .ToList();

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
            }
            else
            {
                _logger.LogWarning(
                    "GET v1/me/modules: no resolvable business for {Role} caller; returning empty entitlements.",
                    role);
            }
        }

        return Ok(ApiResponse<MyModulesResponse>.Ok(response));
    }

    /// <summary>
    /// The authenticated business owner's full per-module entitlement detail
    /// (enabled, source, dependencies) for the module-management view.
    /// </summary>
    [HttpGet("v1/businesses/me/modules")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessModulesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyBusinessModules()
    {
        var businessId = await _businessContext.GetBusinessIdAsync();
        if (businessId == null)
            return NotFound(ApiResponse<BusinessModulesResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business found for the authenticated owner."));

        var entitlements = await _entitlementService.GetBusinessModulesAsync(businessId.Value);
        var response = new BusinessModulesResponse
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

        return Ok(ApiResponse<BusinessModulesResponse>.Ok(response));
    }

    /// <summary>
    /// Diagnostic: resolves the effective module entitlements for a business.
    /// Admin-only; used to validate plan/override/subscription resolution.
    /// </summary>
    [HttpGet("v1/modules/entitlements/{businessId:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<ModuleEntitlementResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetBusinessEntitlements(Guid businessId)
    {
        var result = await _entitlementService.GetBusinessModulesAsync(businessId);
        return Ok(ApiResponse<ModuleEntitlementResult>.Ok(result));
    }

    /// <summary>
    /// Owner toggle: enable or disable a module for the caller's business by
    /// upserting a <c>business_modules</c> row with source=OVERRIDE. Core
    /// modules cannot be disabled; Premium/Enterprise add-ons cannot be
    /// self-enabled (admin/plan-gated). Invalidates the entitlement cache.
    /// </summary>
    [HttpPut("v1/businesses/me/modules/{moduleKey}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetModuleOverride(string moduleKey, [FromBody] SetModuleOverrideRequest request)
    {
        var businessId = await _businessContext.GetBusinessIdAsync();
        if (businessId == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business found for the authenticated owner."));

        var module = await _context.Modules.FirstOrDefaultAsync(m => m.Key == moduleKey && m.IsActive);
        if (module == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "MODULE_NOT_FOUND", $"No active module with key '{moduleKey}'."));

        var catalog = ModuleCatalog.Find(moduleKey);
        if (!request.Enabled && module.IsCore)
            return BadRequest(ApiResponse<MessageResponse>.Fail(
                "CORE_MODULE", $"Core module '{moduleKey}' cannot be disabled."));

        if (request.Enabled)
        {
            // Premium/Enterprise add-ons are never self-serviceable.
            if (catalog != null &&
                (catalog.Visibility == ModuleVisibility.Premium || catalog.Visibility == ModuleVisibility.Enterprise))
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<MessageResponse>.Fail(
                    "PLAN_UPGRADE_REQUIRED",
                    $"Module '{moduleKey}' requires a plan upgrade or an admin grant."));

            // A Standard module can only be self-enabled when the caller's
            // CURRENT plan already bundles it — otherwise this would be a
            // plan-tier bypass (e.g. Starter self-granting appointments).
            var businessIdForPlan = businessId.Value;
            var bundledInPlan = await _context.BusinessSubscriptions
                .Where(s => s.BusinessId == businessIdForPlan && (s.Status == "active" || s.Status == "trial"))
                .OrderByDescending(s => s.CreatedAt)
                .SelectMany(s => s.Plan.PlanModules)
                .AnyAsync(pm => pm.ModuleId == module.Id);

            if (!bundledInPlan)
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<MessageResponse>.Fail(
                    "PLAN_UPGRADE_REQUIRED",
                    $"Module '{moduleKey}' is not part of your current plan. Upgrade or contact an admin."));
        }

        var userId = CurrentUserId();
        var overrideRow = await _context.BusinessModules
            .FirstOrDefaultAsync(bm => bm.BusinessId == businessId.Value && bm.ModuleId == module.Id);

        if (overrideRow == null)
        {
            overrideRow = new BusinessModule
            {
                BusinessId = businessId.Value,
                ModuleId = module.Id
            };
            _context.BusinessModules.Add(overrideRow);
        }

        overrideRow.IsEnabled = request.Enabled;
        overrideRow.Source = "OVERRIDE";
        overrideRow.OverridesAt = DateTime.UtcNow;
        overrideRow.OverriddenByUserId = userId;
        await _context.SaveChangesAsync();

        _entitlementService.Invalidate(businessId.Value);
        _logger.LogInformation(
            "Module override applied: business {BusinessId} {Action} module {ModuleKey} (by user {UserId}).",
            businessId, request.Enabled ? "enabled" : "disabled", moduleKey, userId);

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = $"Module '{moduleKey}' {(request.Enabled ? "enabled" : "disabled")}."
        }));
    }

    /// <summary>
    /// Owner toggle removal: deletes the OVERRIDE row so the module reverts
    /// to plan-driven entitlement. Invalidates the entitlement cache.
    /// </summary>
    [HttpDelete("v1/businesses/me/modules/{moduleKey}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveModuleOverride(string moduleKey)
    {
        var businessId = await _businessContext.GetBusinessIdAsync();
        if (businessId == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "BUSINESS_NOT_FOUND", "No business found for the authenticated owner."));

        var module = await _context.Modules.FirstOrDefaultAsync(m => m.Key == moduleKey);
        if (module == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "MODULE_NOT_FOUND", $"No module with key '{moduleKey}'."));

        var overrideRow = await _context.BusinessModules
            .FirstOrDefaultAsync(bm => bm.BusinessId == businessId.Value && bm.ModuleId == module.Id);
        if (overrideRow == null)
            return NotFound(ApiResponse<MessageResponse>.Fail(
                "OVERRIDE_NOT_FOUND", $"No override exists for module '{moduleKey}'."));

        _context.BusinessModules.Remove(overrideRow);
        await _context.SaveChangesAsync();

        _entitlementService.Invalidate(businessId.Value);
        _logger.LogInformation(
            "Module override removed: business {BusinessId} reverted module {ModuleKey} to plan entitlement.",
            businessId, moduleKey);

        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = $"Override for '{moduleKey}' removed; reverting to plan entitlement."
        }));
    }

    /// <summary>The authenticated caller's user id from the JWT, or null.</summary>
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;

    /// <summary>Permission codes are "&lt;moduleKey&gt;.&lt;action&gt;" — extract the module key.</summary>
    private static string PermissionModuleKey(string permissionCode)
    {
        var dot = permissionCode.IndexOf('.');
        return dot > 0 ? permissionCode[..dot] : permissionCode;
    }
}
