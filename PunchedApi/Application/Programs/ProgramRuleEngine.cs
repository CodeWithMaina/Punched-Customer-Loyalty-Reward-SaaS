using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Programs;

/// <inheritdoc />
public sealed class ProgramRuleEngine : IProgramRuleEngine
{
    public ProgramConfig ResolveConfig(LoyaltyProgram program)
    {
        if (program == null) throw new ArgumentNullException(nameof(program));

        var fromJson = ProgramConfig.FromJson(program.ConfigJson);
        if (fromJson != null) return fromJson;

        // Legacy fallback: synthesise a single-reward stamp config from scalars.
        var mode = string.IsNullOrWhiteSpace(program.ProgramType)
            ? ProgramTypes.Stamp
            : program.ProgramType;

        return new ProgramConfig
        {
            EarningMode = mode,
            Rewards = new List<RewardMilestone>
            {
                new()
                {
                    Stamps = program.StampsRequired,
                    Description = program.RewardDescription,
                    Value = program.RewardValue
                }
            }
        };
    }

    public int StampsForAction(LoyaltyProgram program, decimal qualificationAmount = 0)
    {
        var mode = ResolveMode(program);
        var cap = Math.Max(1, program.MaxStampsPerVisit);

        if (mode == ProgramTypes.Purchase)
        {
            var threshold = ResolveConfig(program).EarningThreshold ?? 0m;
            if (threshold <= 0) return 1; // no configured threshold → one stamp per action
            if (qualificationAmount <= 0) return 1;
            var earned = (int)Math.Floor(qualificationAmount / threshold);
            return Math.Clamp(earned, 1, cap);
        }

        return 1;
    }

    public bool IsEarningAllowed(LoyaltyProgram program, DateTime? now = null)
    {
        if (program == null) return false;
        if (program.Status is ProgramStatus.Archived or ProgramStatus.Draft or ProgramStatus.Paused)
            return false;

        var at = now ?? DateTime.UtcNow;
        if (program.StartsAt.HasValue && at < program.StartsAt.Value) return false;
        if (program.EndsAt.HasValue && at > program.EndsAt.Value) return false;
        return true;
    }

    public bool IsEligible(LoyaltyProgram program, string? segmentId = null)
    {
        if (program == null) return false;
        if (program.Status == ProgramStatus.Archived) return false;

        var config = ResolveConfig(program);
        var scope = string.IsNullOrWhiteSpace(config.Eligibility.Scope)
            ? "everyone"
            : config.Eligibility.Scope;

        return scope switch
        {
            "invitation" => true, // participation is owner-driven; invitation token gating lives elsewhere
            "segment" => !string.IsNullOrWhiteSpace(config.Eligibility.SegmentId),
            _ => true
        };
    }
public int? NextRewardThreshold(LoyaltyProgram program, int currentStamps)
    {
        var rewards = ResolveConfig(program).Rewards
            .Where(r => r.Stamps > currentStamps)
            .OrderBy(r => r.Stamps)
            .ToList();

        return rewards.Count == 0 ? null : rewards[0].Stamps;
    }

    public int StampsRemaining(LoyaltyProgram program, int currentStamps)
    {
        var next = NextRewardThreshold(program, currentStamps);
        return next.HasValue ? Math.Max(0, next.Value - currentStamps) : 0;
    }

    public IReadOnlyList<RewardMilestone> RewardsForStamps(LoyaltyProgram program, int stamps)
    {
        return ResolveConfig(program).Rewards
            .Where(r => r.Stamps <= stamps)
            .OrderBy(r => r.Stamps)
            .ToList();
    }

    public RewardMilestone? LatestReward(LoyaltyProgram program, int stamps)
    {
        return RewardsForStamps(program, stamps).LastOrDefault();
    }

    public Tier? CurrentTier(LoyaltyProgram program, int lifetimeStamps)
    {
        var tiers = ResolveConfig(program).Tiers;
        if (tiers == null || tiers.Count == 0) return null;

        return tiers
            .Where(t => lifetimeStamps >= t.MinStamps)
            .OrderByDescending(t => t.MinStamps)
            .FirstOrDefault();
    }

    public string Describe(LoyaltyProgram program)
    {
        var config = ResolveConfig(program);
        var lines = new List<string> { EarningText(config) };

        var rewards = config.Rewards.OrderBy(r => r.Stamps).ToList();
        if (rewards.Count > 0)
        {
            lines.Add("Rewards:");
            foreach (var r in rewards)
            {
                var desc = string.IsNullOrWhiteSpace(r.Description) ? "Reward" : r.Description;
                var unit = r.Stamps == 1 ? "stamp" : "stamps";
                lines.Add($"- After {r.Stamps} {unit}: {desc}");
            }
        }

        if (config.Tiers is { Count: > 0 })
        {
            lines.Add("Tiers:");
            foreach (var t in config.Tiers.OrderBy(t => t.MinStamps))
            {
                var benefit = string.IsNullOrWhiteSpace(t.Benefit) ? "" : $" ({t.Benefit})";
                lines.Add($"- {t.Name} — from {t.MinStamps} lifetime stamps{benefit}");
            }
        }

        return string.Join("\n", lines);
    }

    private static string ResolveMode(LoyaltyProgram program)
    {
        var mode = string.IsNullOrWhiteSpace(program.ProgramType)
            ? ProgramConfig.DefaultEarningMode
            : program.ProgramType;
        return ProgramTypes.IsKnown(mode) ? mode : ProgramTypes.Stamp;
    }

    private static string EarningText(ProgramConfig config)
    {
        return config.EarningMode switch
        {
            ProgramTypes.Purchase when config.EarningThreshold is > 0 =>
                $"Customers earn 1 stamp for every KES {config.EarningThreshold:0} spent.",
            ProgramTypes.Purchase =>
                "Customers earn 1 stamp per qualifying purchase.",
            ProgramTypes.Visit =>
                "Customers earn 1 stamp per visit.",
            ProgramTypes.Service when string.IsNullOrWhiteSpace(config.QualifyingServiceId) =>
                "Customers earn 1 stamp when booking a qualifying service.",
            ProgramTypes.Service =>
                "Customers earn 1 stamp when booking the qualifying service.",
            ProgramTypes.Category when string.IsNullOrWhiteSpace(config.QualifyingCategory) =>
                "Customers earn 1 stamp on qualifying purchases.",
            ProgramTypes.Category =>
                $"Customers earn 1 stamp on purchases in {config.QualifyingCategory}.",
            ProgramTypes.Tiered =>
                "Customers earn 1 stamp per qualifying action and advance through tiers.",
            _ =>
                "Customers earn 1 stamp for every qualifying action."
        };
    }
}