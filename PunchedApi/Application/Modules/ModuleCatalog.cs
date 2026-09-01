namespace PunchedApi.Application.Modules;

/// <summary>
/// Packaging tier of a module. Informational (drives pricing/plan grouping);
/// the DB <c>modules</c> table remains the join target while this catalog is
/// the runtime metadata + permission authority.
/// </summary>
public enum ModuleVisibility { Core, Standard, Premium, Enterprise, Internal }

/// <summary>
/// A module's static definition: identity, dependencies, the roles that can
/// see it, and the fine-grained permissions it grants per role.
/// </summary>
public sealed record ModuleDefinition(
    string Key,
    string Name,
    string Description,
    string Version,
    ModuleVisibility Visibility,
    IReadOnlyList<string> Dependencies,
    IReadOnlyList<string> RequiredRoles,
    IReadOnlyList<PermissionDefinition> Permissions
);

/// <summary>
/// A single permission code and the roles it is granted to.
/// </summary>
public sealed record PermissionDefinition(string Code, IReadOnlyList<string> Roles);

/// <summary>
/// Runtime module catalog. The <c>Key</c> values MUST match
/// <c>PunchedApi.Infrastructure.SeedData.ModuleSeedData</c> exactly — the DB
/// <c>modules</c> table is the join/entitlement target and this catalog is the
/// metadata + permission authority. All keys are lowercase and immutable once
/// released.
/// </summary>
public static class ModuleCatalog
{
    public static readonly IReadOnlyList<ModuleDefinition> Modules = new[]
    {
        // ── Core (always available to every business) ───────────
        new ModuleDefinition(
            Key: "customers", Name: "Customers",
            Description: "Customer management and profiles",
            Version: "1.0.0", Visibility: ModuleVisibility.Core,
            Dependencies: Array.Empty<string>(),
            RequiredRoles: new[] { "Business", "Staff" },
            Permissions: new[]
            {
                new PermissionDefinition("customers.view",   new[] { "Business", "Staff" }),
                new PermissionDefinition("customers.manage", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "staff", Name: "Staff",
            Description: "Staff management, shifts and invitations",
            Version: "1.0.0", Visibility: ModuleVisibility.Core,
            Dependencies: Array.Empty<string>(),
            RequiredRoles: new[] { "Business", "Staff" },
            Permissions: new[]
            {
                new PermissionDefinition("staff.view",   new[] { "Business", "Staff" }),
                new PermissionDefinition("staff.manage", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "settings", Name: "Settings",
            Description: "Business settings and profile",
            Version: "1.0.0", Visibility: ModuleVisibility.Core,
            Dependencies: Array.Empty<string>(),
            RequiredRoles: new[] { "Business" },
            Permissions: new[]
            {
                new PermissionDefinition("settings.view",   new[] { "Business" }),
                new PermissionDefinition("settings.manage", new[] { "Business" }),
            }),

        // ── Standard ────────────────────────────────────────────
        new ModuleDefinition(
            Key: "appointments", Name: "Appointments",
            Description: "Booking management",
            Version: "1.0.0", Visibility: ModuleVisibility.Standard,
            Dependencies: new[] { "customers", "staff" },
            RequiredRoles: new[] { "Business", "Staff", "Customer" },
            Permissions: new[]
            {
                new PermissionDefinition("appointments.view",   new[] { "Business", "Staff", "Customer" }),
                new PermissionDefinition("appointments.manage", new[] { "Business" }),
                new PermissionDefinition("appointments.create", new[] { "Customer" }),
            }),
        new ModuleDefinition(
            Key: "stamps", Name: "Stamps",
            Description: "Digital stamp cards",
            Version: "1.0.0", Visibility: ModuleVisibility.Standard,
            Dependencies: new[] { "customers" },
            RequiredRoles: new[] { "Business", "Staff", "Customer" },
            Permissions: new[]
            {
                                new PermissionDefinition("stamps.view",  new[] { "Business", "Staff", "Customer" }),
                new PermissionDefinition("stamps.award", new[] { "Business", "Staff" }),
                new PermissionDefinition("stamps.adjust", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "notifications", Name: "Notifications",
            Description: "Push notifications",
            Version: "1.0.0", Visibility: ModuleVisibility.Standard,
            Dependencies: new[] { "customers", "staff" },
            RequiredRoles: new[] { "Business", "Staff", "Customer" },
            Permissions: new[]
            {
                new PermissionDefinition("notifications.view",   new[] { "Business", "Staff", "Customer" }),
                new PermissionDefinition("notifications.manage", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "serviceCatalog", Name: "Service Catalog",
            Description: "Bookable services the business offers",
            Version: "1.0.0", Visibility: ModuleVisibility.Standard,
            Dependencies: Array.Empty<string>(),
            RequiredRoles: new[] { "Business", "Customer" },
            Permissions: new[]
            {
                new PermissionDefinition("serviceCatalog.view",   new[] { "Business", "Customer" }),
                new PermissionDefinition("serviceCatalog.manage", new[] { "Business" }),
            }),


        // ── Premium ─────────────────────────────────────────────
        new ModuleDefinition(
            Key: "loyalty", Name: "Loyalty Programs",
            Description: "Loyalty program management",
            Version: "1.0.0", Visibility: ModuleVisibility.Premium,
            Dependencies: new[] { "customers", "stamps" },
            RequiredRoles: new[] { "Business", "Customer" },
            Permissions: new[]
            {
                new PermissionDefinition("loyalty.view",   new[] { "Business", "Customer" }),
                new PermissionDefinition("loyalty.manage", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "rewards", Name: "Rewards",
            Description: "Reward catalog",
            Version: "1.0.0", Visibility: ModuleVisibility.Premium,
            Dependencies: new[] { "loyalty", "stamps" },
            RequiredRoles: new[] { "Business", "Customer" },
            Permissions: new[]
            {
                                new PermissionDefinition("rewards.view",   new[] { "Business", "Customer" }),
                new PermissionDefinition("rewards.manage", new[] { "Business" }),
                new PermissionDefinition("redemptions.fulfill", new[] { "Business", "Staff" }),
            }),
        new ModuleDefinition(
            Key: "analytics", Name: "Analytics",
            Description: "Business analytics",
            Version: "1.0.0", Visibility: ModuleVisibility.Premium,
            // Must stay in sync with ModuleSeedData.DependenciesJson
            // (["customers","stamps","loyalty"]) — asserted by
            // ModuleCatalogSyncTests.
            Dependencies: new[] { "customers", "stamps", "loyalty" },
            RequiredRoles: new[] { "Business" },
            Permissions: new[]
            {
                new PermissionDefinition("analytics.view", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "programs", Name: "Programs",
            Description: "Custom program builder",
            Version: "1.0.0", Visibility: ModuleVisibility.Premium,
            Dependencies: new[] { "loyalty" },
            RequiredRoles: new[] { "Business" },
            Permissions: new[]
            {
                new PermissionDefinition("programs.view",   new[] { "Business" }),
                new PermissionDefinition("programs.manage", new[] { "Business" }),
            }),
        new ModuleDefinition(
            Key: "referral", Name: "Referrals",
            Description: "Customer referral program",
            Version: "1.0.0", Visibility: ModuleVisibility.Premium,
            Dependencies: new[] { "loyalty", "stamps" },
            RequiredRoles: new[] { "Business", "Customer" },
            Permissions: new[]
            {
                new PermissionDefinition("referral.view",   new[] { "Business", "Customer" }),
                new PermissionDefinition("referral.manage", new[] { "Business" }),
            }),
    };

    /// <summary>Finds a module definition by key (case-insensitive).</summary>
    public static ModuleDefinition? Find(string key) =>
        Modules.FirstOrDefault(m => m.Key.Equals(key, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Transitive dependency closure of the given module keys, per the catalog.
    /// A module's dependencies are treated as available for access purposes even
    /// when not separately enabled (plan §14.1).
    /// </summary>
    public static HashSet<string> CloseDependencies(IEnumerable<string> moduleKeys)
    {
        var closed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var queue = new Queue<string>(moduleKeys);

        while (queue.Count > 0)
        {
            var key = queue.Dequeue();
            if (!closed.Add(key)) continue;

            var definition = Find(key);
            if (definition == null) continue;

            foreach (var dependency in definition.Dependencies)
            {
                if (!closed.Contains(dependency))
                    queue.Enqueue(dependency);
            }
        }

        return closed;
    }
}