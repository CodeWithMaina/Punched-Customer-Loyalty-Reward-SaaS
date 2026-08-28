namespace PunchedApi.Application.Authorization;

/// <summary>
/// Static role→permission matrix. Single source of truth for fine-grained
/// operation checks. Built once from <see cref="Modules.ModuleCatalog"/> at
/// startup (catalog permissions are the authority).
/// </summary>
public static class PermissionMatrix
{
    private static readonly IReadOnlyDictionary<string, IReadOnlySet<string>> Matrix = Build();

    /// <summary>Does the given role hold the given permission code?</summary>
    public static bool HasPermission(string role, string permissionCode) =>
        Matrix.TryGetValue(role, out var perms) && perms.Contains(permissionCode);

    /// <summary>All permission codes granted to the given role.</summary>
    public static IReadOnlySet<string> PermissionsForRole(string role) =>
        Matrix.TryGetValue(role, out var perms) ? perms : EmptySet;

    private static readonly IReadOnlySet<string> EmptySet = new HashSet<string>();

    private static IReadOnlyDictionary<string, IReadOnlySet<string>> Build()
    {
        var map = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var module in Modules.ModuleCatalog.Modules)
        foreach (var perm in module.Permissions)
        foreach (var role in perm.Roles)
        {
            if (!map.TryGetValue(role, out var set))
                map[role] = set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            set.Add(perm.Code);
        }
        return map.ToDictionary(kv => kv.Key, kv => (IReadOnlySet<string>)kv.Value.ToHashSet());
    }
}