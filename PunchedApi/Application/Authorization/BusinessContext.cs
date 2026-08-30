using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Modules;
using PunchedApi.Application.Services;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Authorization;

/// <summary>
/// Request-scoped module authorization context. Resolves the caller's
/// business/role once per request (server-side only — never from client
/// input), loads effective module entitlements lazily on the first module
/// check, applies the dependency closure, and memoizes so every subsequent
/// <c>[RequireModule]</c> check in the request is an in-memory lookup.
/// </summary>
public interface IBusinessContext
{
    /// <summary>The caller's role (Customer, Business, Staff, Admin) or null.</summary>
    string? GetRole();

    /// <summary>
    /// Server-resolved business id for the caller: owner via
    /// IBusinessScopeResolver, staff via User.StaffBusinessId. Null for
    /// Customer/Admin. Memoized per request.
    /// </summary>
    Task<Guid?> GetBusinessIdAsync();

    /// <summary>
    /// Effective module keys (entitlements + closed dependencies), loaded
    /// lazily and memoized. Empty until first load.
    /// </summary>
    HashSet<string> EffectiveModules { get; }

    /// <summary>Does the caller have access to the given module?</summary>
    Task<bool> HasModuleAsync(string moduleKey);
}

public sealed class BusinessContext : IBusinessContext
{
    private readonly IBusinessScopeResolver _scopeResolver;
    private readonly IModuleEntitlementService _entitlementService;
    private readonly ApplicationDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private Guid? _businessId;
    private bool _businessIdResolved;
    private HashSet<string>? _effectiveModules;

    public BusinessContext(
        IBusinessScopeResolver scopeResolver,
        IModuleEntitlementService entitlementService,
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor)
    {
        _scopeResolver = scopeResolver;
        _entitlementService = entitlementService;
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public string? GetRole() =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role)
        ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("role");

    private Guid? GetUserId()
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public async Task<Guid?> GetBusinessIdAsync()
    {
        if (_businessIdResolved) return _businessId;
        _businessIdResolved = true;

        var role = GetRole();
        var userId = GetUserId();
        if (userId == null) return _businessId = null;

        _businessId = role switch
        {
            // Owner: via the existing cached resolver (never from client input).
            "Business" => await _scopeResolver.GetOwnedBusinessIdAsync(userId.Value),

            // Staff: resolve the linked business server-side.
            "Staff" => await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId.Value)
                .Select(u => u.StaffBusinessId)
                .FirstOrDefaultAsync(),

            // Customers and Admins are not business-scoped.
            _ => null
        };

        return _businessId;
    }

    public HashSet<string> EffectiveModules =>
        _effectiveModules ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    public async Task<bool> HasModuleAsync(string moduleKey)
    {
        var role = GetRole();

        // Admin is platform-level; module gating does not apply.
        if (role == "Admin") return true;

        // Customers: read-side access derives from the catalog's
        // customer-facing visibility (plan §17), not from business plans.
        if (role == "Customer")
        {
            var customerModule = ModuleCatalog.Find(moduleKey);
            return customerModule != null &&
                   customerModule.RequiredRoles.Contains("Customer", StringComparer.OrdinalIgnoreCase);
        }

        // Business/Staff: resolve business + entitlements once, memoize.
        if (_effectiveModules == null)
        {
            var businessId = await GetBusinessIdAsync();
            _effectiveModules = businessId == null
                ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : ModuleCatalog.CloseDependencies(
                    await _entitlementService.GetEffectiveModuleKeysAsync(businessId.Value));
        }

        return _effectiveModules.Contains(moduleKey);
    }
}
