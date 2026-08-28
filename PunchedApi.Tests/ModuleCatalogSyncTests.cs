using System.Text.Json;
using PunchedApi.Application.Modules;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// G9 catalog sync tests: the runtime <see cref="ModuleCatalog"/> (code
/// authority), the DB seed definitions (<see cref="ModuleSeedData"/>,
/// <see cref="SubscriptionPlanSeedData"/>, <see cref="PlanModuleSeedData"/>)
/// and the frontend manifest registry must stay in key parity.
/// Seed data is checked in memory — no database required.
/// </summary>
public class ModuleCatalogSyncTests
{
    private static IReadOnlyList<ModuleDefinition> Catalog => ModuleCatalog.Modules;
    private static List<Module> SeedModules => ModuleSeedData.GetModules();

    private static string[] ParseDependencies(Module module) =>
        string.IsNullOrWhiteSpace(module.DependenciesJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(module.DependenciesJson,
                  new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
              ?? Array.Empty<string>();

    [Fact]
    public void CatalogKeys_AndSeedKeys_AreExactMirrorSets()
    {
        var catalogKeys = Catalog.Select(m => m.Key).ToHashSet(StringComparer.Ordinal);
        var seedKeys = SeedModules.Select(m => m.Key).ToHashSet(StringComparer.Ordinal);

        Assert.Superset(catalogKeys, seedKeys); // no seed orphans
        Assert.Superset(seedKeys, catalogKeys); // no catalog orphans
    }

    [Fact]
    public void MatchingModules_VersionIsCoreAndDependencies_Match()
    {
        var seedByKey = SeedModules.ToDictionary(m => m.Key, StringComparer.Ordinal);

        foreach (var definition in Catalog)
        {
            var seed = seedByKey[definition.Key];

            Assert.True(definition.Version == seed.Version,
                $"Version mismatch for '{definition.Key}': catalog={definition.Version}, seed={seed.Version}");

            Assert.True(definition.Visibility == ModuleVisibility.Core == seed.IsCore,
                $"IsCore mismatch for '{definition.Key}': catalog={definition.Visibility}, seed.IsCore={seed.IsCore}");

            Assert.Equal(
                definition.Dependencies.OrderBy(d => d, StringComparer.Ordinal),
                ParseDependencies(seed).OrderBy(d => d, StringComparer.Ordinal));
        }
    }

    [Fact]
    public void PlanModuleReferences_UseExistingPlanAndModuleKeys()
    {
        var planKeys = SubscriptionPlanSeedData.GetPlans().Select(p => p.Key).ToHashSet(StringComparer.Ordinal);
        var moduleKeys = SeedModules.Select(m => m.Key).ToHashSet(StringComparer.Ordinal);

        foreach (var (planKey, moduleKey) in PlanModuleSeedData.GetPlanModules())
        {
            Assert.True(planKeys.Contains(planKey), $"Plan-module seed references unknown plan '{planKey}'.");
            Assert.True(moduleKeys.Contains(moduleKey), $"Plan-module seed references unknown module '{moduleKey}'.");
        }
    }

    /// <summary>
    /// Rule the seed uses: every plan grant includes each granted module's
    /// dependency keys EXPLICITLY in the same plan (no runtime dependency
    /// closure needed at seed time — the closure in ModuleCatalog /
    /// ModuleEntitlementService is a safety net, not the seed mechanism).
    /// </summary>
    [Fact]
    public void EveryPlanGrant_CoversItsDependenciesExplicitly()
    {
        var seedByKey = SeedModules.ToDictionary(m => m.Key, StringComparer.Ordinal);
        var grantsByPlan = PlanModuleSeedData.GetPlanModules()
            .GroupBy(pm => pm.PlanKey, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Select(pm => pm.ModuleKey).ToHashSet(StringComparer.Ordinal));

        foreach (var (planKey, granted) in grantsByPlan)
        {
            foreach (var moduleKey in granted)
            {
                foreach (var dependency in ParseDependencies(seedByKey[moduleKey]))
                {
                    Assert.True(granted.Contains(dependency),
                        $"Plan '{planKey}' grants '{moduleKey}' but not its dependency '{dependency}'.");
                }
            }
        }
    }

    [Fact]
    public void PlanSeed_StarterProEnterprise_ExistAndAreActive()
    {
        var plans = SubscriptionPlanSeedData.GetPlans();

        foreach (var key in new[] { "starter", "pro", "enterprise" })
        {
            var plan = plans.Single(p => p.Key == key);
            Assert.True(plan.IsActive, $"Plan '{key}' must be active.");
        }
    }
}
