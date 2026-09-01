using System.Text.Json.Serialization;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  PROGRAM DETAIL + STAMP ACTIVITY DTOs
//  Reports the relationship Business → Program → Customer → Stamps
//  so the owner/staff can review activity end-to-end.
// ═══════════════════════════════════════════════════════════════

/// <summary>POST /v1/programs/me/{id}/duplicate body — optional new name.</summary>
public sealed class DuplicateProgramRequest
{
    [JsonPropertyName("newName")]
    public string? NewName { get; set; }
}

/// <summary>GET /v1/programs/me/{id}/details — program + live performance metrics.</summary>
public sealed class ProgramDetailResponse
{
    [JsonPropertyName("program")]
    public LoyaltyProgramResponse Program { get; set; } = null!;

    /// <summary>Human-readable summary derived by the program rule engine.</summary>
    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("activeCustomers")]
    public int ActiveCustomers { get; set; }

    [JsonPropertyName("stampsIssued")]
    public int StampsIssued { get; set; }

    [JsonPropertyName("rewardsEarned")]
    public int RewardsEarned { get; set; }

    [JsonPropertyName("rewardsRedeemed")]
    public int RewardsRedeemed { get; set; }

    [JsonPropertyName("completionRate")]
    public double CompletionRate { get; set; }

    [JsonPropertyName("redemptionRate")]
    public double RedemptionRate { get; set; }
}

/// <summary>Query for the stamp activity feed (owner + staff).</summary>
public sealed class StampActivityQuery
{
    [JsonPropertyName("programId")]
    public Guid? ProgramId { get; set; }

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }

    [JsonPropertyName("staffId")]
    public Guid? StaffId { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("from")]
    public DateTime? From { get; set; }

    [JsonPropertyName("to")]
    public DateTime? To { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; } = 25;
}

/// <summary>A single stamp row in the activity feed (immutable ledger entry).</summary>
public sealed class StampActivityItem
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("programId")]
    public Guid ProgramId { get; set; }

    [JsonPropertyName("programName")]
    public string ProgramName { get; set; } = string.Empty;

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("awardedByUserId")]
    public Guid? AwardedByUserId { get; set; }

    [JsonPropertyName("awardedByName")]
    public string? AwardedByName { get; set; }

    [JsonPropertyName("awardedByRole")]
    public string? AwardedByRole { get; set; }

    [JsonPropertyName("stampedAt")]
    public DateTime StampedAt { get; set; }
}

/// <summary>Paged stamp activity feed result.</summary>
public sealed class StampActivityPage
{
    [JsonPropertyName("items")]
    public List<StampActivityItem> Items { get; set; } = new();

    [JsonPropertyName("total")]
    public long Total { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; } = 25;
}