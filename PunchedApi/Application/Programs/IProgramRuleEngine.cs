using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Programs;

/// <summary>
/// Evaluates configuration against customer activity. This is the boundary
/// between what a business owner *defines* (the scoped columns + JSON config)
/// and how the system *computes* progress/rewards, so new program types can be
/// added here without touching UI or the stamping pipeline.
///
/// Backward compatibility: programs that predate flexible config have no
/// <c>ConfigJson</c> — the engine synthesises a single-reward "stamp" config
/// from the legacy scalar columns, so existing programs keep working unchanged.
/// </summary>
public interface IProgramRuleEngine
{
    /// <summary>Resolves the effective config, synthesising a legacy fallback when no JSON is stored.</summary>
    ProgramConfig ResolveConfig(LoyaltyProgram program);

    /// <summary>Number of stamps awarded for a single qualifying action (respects the per-visit cap).</summary>
    int StampsForAction(LoyaltyProgram program, decimal qualificationAmount = 0);

    /// <summary>True when the program can currently accept new stamps (status + schedule).</summary>
    bool IsEarningAllowed(LoyaltyProgram program, DateTime? now = null);

    /// <summary>Whether a customer is eligible to participate based on the content rules.</summary>
    bool IsEligible(LoyaltyProgram program, string? segmentId = null);

    /// <summary>Smallest reward threshold strictly greater than <paramref name="currentStamps"/>; null when the top reward is reached.</summary>
    int? NextRewardThreshold(LoyaltyProgram program, int currentStamps);

    /// <summary>Stamps remaining to the next reward (0 when no milestone is remaining).</summary>
    int StampsRemaining(LoyaltyProgram program, int currentStamps);

    /// <summary>All rewards unlockable at or below <paramref name="stamps"/> (for multi-milestone programs).</summary>
    IReadOnlyList<RewardMilestone> RewardsForStamps(LoyaltyProgram program, int stamps);

    /// <summary>The first reward whose threshold is at/under <paramref name="stamps"/> (highest reachable), or null.</summary>
    RewardMilestone? LatestReward(LoyaltyProgram program, int stamps);

    /// <summary>The elite tier for the given lifetime-stamp count (tiered programs), or null.</summary>
    Tier? CurrentTier(LoyaltyProgram program, int lifetimeStamps);

    /// <summary>Human-readable summary used by the creation wizard's review step and the details page.</summary>
    string Describe(LoyaltyProgram program);
}