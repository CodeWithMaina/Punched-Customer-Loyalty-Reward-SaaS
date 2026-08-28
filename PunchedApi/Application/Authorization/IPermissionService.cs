using System.Security.Claims;

namespace PunchedApi.Application.Authorization;

/// <summary>
/// Fine-grained permission checks (role → permission matrix). Complements the
/// role-based <c>[Authorize]</c> checks: entitlement decides whether a module
/// is available, permissions decide what may be done inside it.
/// </summary>
public interface IPermissionService
{
    /// <summary>Does the given role hold the given permission code?</summary>
    bool HasPermission(string role, string permissionCode);

    /// <summary>Does the authenticated principal's role hold the permission?</summary>
    Task<bool> CanAsync(ClaimsPrincipal user, string permissionCode);
}

/// <inheritdoc />
public class PermissionService : IPermissionService
{
    // The role claim type matches JwtTokenService (ClaimTypes.Role).
    public bool HasPermission(string role, string permissionCode) =>
        PermissionMatrix.HasPermission(role, permissionCode);

    public Task<bool> CanAsync(ClaimsPrincipal user, string permissionCode)
    {
        var role = user.FindFirstValue(ClaimTypes.Role)
                   ?? user.FindFirstValue("role");
        return Task.FromResult(role != null && HasPermission(role, permissionCode));
    }
}