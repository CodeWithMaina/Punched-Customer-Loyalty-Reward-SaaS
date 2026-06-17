using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  REFERRAL PROGRAM DTOs
// ═══════════════════════════════════════════════════════════════

public class UpsertReferralProgramRequest
{
    [JsonPropertyName("referralsRequired")]
    public int ReferralsRequired { get; set; } = 1;

    [JsonPropertyName("rewardType")]
    public ReferralRewardType RewardType { get; set; } = ReferralRewardType.Stamp;

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    [JsonPropertyName("expirationDays")]
    public int ExpirationDays { get; set; } = 30;
}

public class ReferralProgramResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("referralsRequired")]
    public int ReferralsRequired { get; set; }

    [JsonPropertyName("rewardType")]
    public ReferralRewardType RewardType { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("expirationDays")]
    public int ExpirationDays { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  REFERRAL LINK DTOs
// ═══════════════════════════════════════════════════════════════

public class GenerateReferralLinkRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

public class ReferralLinkResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("referrerId")]
    public Guid ReferrerId { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("businessLogoUrl")]
    public string? BusinessLogoUrl { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("referralUrl")]
    public string ReferralUrl { get; set; } = string.Empty;

    [JsonPropertyName("successfulReferrals")]
    public int SuccessfulReferrals { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  REFERRAL DTOs
// ═══════════════════════════════════════════════════════════════

public class ResolveReferralRequest
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}

public class ResolveReferralResponse
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("businessLogoUrl")]
    public string? BusinessLogoUrl { get; set; }

    [JsonPropertyName("referrerName")]
    public string ReferrerName { get; set; } = string.Empty;

    [JsonPropertyName("referralId")]
    public Guid ReferralId { get; set; }

    [JsonPropertyName("enrolled")]
    public bool Enrolled { get; set; }
}

public class ReferralResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("referrerId")]
    public Guid ReferrerId { get; set; }

    [JsonPropertyName("referrerName")]
    public string ReferrerName { get; set; } = string.Empty;

    [JsonPropertyName("refereeId")]
    public Guid RefereeId { get; set; }

    [JsonPropertyName("refereeName")]
    public string RefereeName { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public ReferralStatus Status { get; set; }

    [JsonPropertyName("activatedAt")]
    public DateTime? ActivatedAt { get; set; }

    [JsonPropertyName("qualifiedAt")]
    public DateTime? QualifiedAt { get; set; }

    [JsonPropertyName("rewardedAt")]
    public DateTime? RewardedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  REFERRAL STATS DTOs
// ═══════════════════════════════════════════════════════════════

public class ReferralStatsResponse
{
    [JsonPropertyName("totalReferrals")]
    public int TotalReferrals { get; set; }

    [JsonPropertyName("pendingReferrals")]
    public int PendingReferrals { get; set; }

    [JsonPropertyName("activatedReferrals")]
    public int ActivatedReferrals { get; set; }

    [JsonPropertyName("qualifiedReferrals")]
    public int QualifiedReferrals { get; set; }

    [JsonPropertyName("rewardedReferrals")]
    public int RewardedReferrals { get; set; }

    [JsonPropertyName("expiredReferrals")]
    public int ExpiredReferrals { get; set; }

    [JsonPropertyName("totalRewardsEarned")]
    public int TotalRewardsEarned { get; set; }
}
