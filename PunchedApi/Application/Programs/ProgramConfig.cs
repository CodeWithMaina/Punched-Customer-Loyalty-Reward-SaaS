using System.Text.Json;
using System.Text.Json.Serialization;

namespace PunchedApi.Application.Programs;

/// <summary>
/// Structured, extensible configuration of a loyalty program.
///
/// This replaces ad-hoc boolean flags (isVisitBased / isPurchaseBased / ...)
/// with a small set of nested, versioned concepts:
///
///     ProgramConfig
///      ├── EarningMode    — how customers earn progress
///      ├── Rewards        — one or more reward milestones (tiers of rewards)
///      ├── Eligibility    — who may participate
///      ├── Constraints    — limiting rules (daily cap, min spend, expiry)
///      └── Tiers          — optional named elite tiers (tiered loyalty)
///
/// It is stored as JSON (<c>LoyaltyProgram.ConfigJson</c>) and is forward
/// compatible: unknown properties are ignored, missing ones fall back to
/// sensible defaults. Existing non-flexible programs have no config and are
/// described entirely by the legacy scalar columns
/// (<see cref="ProgramRuleEngine"/> falls back to them).
/// </summary>
public sealed class ProgramConfig
{
    public const string DefaultEarningMode = "stamp";

    /// <summary>Earning model — one of <see cref="PunchedApi.Domain.Entities.ProgramTypes"/>.</summary>
    [JsonPropertyName("earningMode")]
    public string EarningMode { get; set; } = DefaultEarningMode;

    /// <summary>
    /// For purchase-based programs: the amount (KES) that earns one stamp.
    /// For service/category programs this may be null.
    /// </summary>
    [JsonPropertyName("earningThreshold")]
    public decimal? EarningThreshold { get; set; }

    /// <summary>For service-based programs: the qualifying service catalog id.</summary>
    [JsonPropertyName("qualifyingServiceId")]
    public string? QualifyingServiceId { get; set; }

    /// <summary>For category-based programs: the qualifying business category.</summary>
    [JsonPropertyName("qualifyingCategory")]
    public string? QualifyingCategory { get; set; }

    /// <summary>One or more rewards reachable by collecting stamps.</summary>
    [JsonPropertyName("rewards")]
    public List<RewardMilestone> Rewards { get; set; } = new();

    /// <summary>Who may participate.</summary>
    [JsonPropertyName("eligibility")]
    public EligibilityConfig Eligibility { get; set; } = new();

    /// <summary>Limiting rules that constrain awarding/eligibility.</summary>
    [JsonPropertyName("constraints")]
    public ConstraintConfig Constraints { get; set; } = new();

    /// <summary>Optional named elite tiers for tiered loyalty programs.</summary>
    [JsonPropertyName("tiers")]
    public List<Tier> Tiers { get; set; } = new();

    // ── Serialization helpers ──────────────────────────────────

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Serialises this config to JSON for the <c>ConfigJson</c> column.</summary>
    public string ToJson() => JsonSerializer.Serialize(this, Options);

    /// <summary>
    /// Deserialises a JSON config, or returns <see langword="null"/> when the
    /// payload is null/empty/invalid (caller then falls back to legacy scalars).
    /// </summary>
    public static ProgramConfig? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<ProgramConfig>(json, Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

/// <summary>A single reward reachable at a stamp threshold.</summary>
public sealed class RewardMilestone
{
    /// <summary>Stamps required to unlock this reward (relative to the current cycle).</summary>
    [JsonPropertyName("stamps")]
    public int Stamps { get; set; }

    /// <summary>Human-readable reward description (e.g. "Free large coffee").</summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>Optional monetary value in KES (used for payout purposes).</summary>
    [JsonPropertyName("value")]
    public decimal? Value { get; set; }

    /// <summary>Redemption kind: product | service | discount | voucher | custom.</summary>
    [JsonPropertyName("redemptionType")]
    public string? RedemptionType { get; set; }
}

/// <summary>Who may participate in a program.</summary>
public sealed class EligibilityConfig
{
    /// <summary>everyone | invitation | segment</summary>
    [JsonPropertyName("scope")]
    public string Scope { get; set; } = "everyone";

    /// <summary>Segment id when scope == "segment".</summary>
    [JsonPropertyName("segmentId")]
    public string? SegmentId { get; set; }
}

/// <summary>Limiting rules that constrain awarding/eligibility.</summary>
public sealed class ConstraintConfig
{
    /// <summary>Maximum stamps a customer can earn in one calendar day.</summary>
    [JsonPropertyName("maxStampsPerDay")]
    public int? MaxStampsPerDay { get; set; }

    /// <summary>Minimum purchase (KES) before a purchase-based stamp counts.</summary>
    [JsonPropertyName("minPurchase")]
    public decimal? MinPurchase { get; set; }

    /// <summary>Days after which earned stamps expire (null = never).</summary>
    [JsonPropertyName("stampExpiryDays")]
    public int? StampExpiryDays { get; set; }
}

/// <summary>A named elite tier for tiered loyalty programs.</summary>
public sealed class Tier
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Minimum lifetime stamps to reach this tier.</summary>
    [JsonPropertyName("minStamps")]
    public int MinStamps { get; set; }

    /// <summary>Human-readable benefit description.</summary>
    [JsonPropertyName("benefit")]
    public string? Benefit { get; set; }
}