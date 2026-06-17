using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  BUSINESS DTOs
// ═══════════════════════════════════════════════════════════════

public class CreateBusinessRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("logoUrl")]
    public string? LogoUrl { get; set; }

    [JsonPropertyName("mpesaNumber")]
    public string MpesaNumber { get; set; } = string.Empty;
}

public class UpdateBusinessRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("location")]
    public string? Location { get; set; }

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("logoUrl")]
    public string? LogoUrl { get; set; }

    [JsonPropertyName("mpesaNumber")]
    public string? MpesaNumber { get; set; }
}

public class BusinessResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("logoUrl")]
    public string? LogoUrl { get; set; }

    [JsonPropertyName("ownerId")]
    public Guid? OwnerId { get; set; }

    [JsonPropertyName("loyaltyProgram")]
    public LoyaltyProgramResponse? LoyaltyProgram { get; set; }

    [JsonPropertyName("loyaltyPrograms")]
    public List<LoyaltyProgramResponse> LoyaltyPrograms { get; set; } = new();

    [JsonPropertyName("hasReferralProgram")]
    public bool HasReferralProgram { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  LOYALTY PROGRAM DTOs
// ═══════════════════════════════════════════════════════════════

public class CreateLoyaltyProgramRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "Loyalty Program";

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;
}

public class UpdateLoyaltyProgramRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("stampsRequired")]
    public int? StampsRequired { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal? RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string? RewardDescription { get; set; }
}

/// <summary>Legacy upsert kept for backward-compatibility.</summary>
public class UpsertLoyaltyProgramRequest
{
    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    /// <summary>Hours customer has to claim after reaching stamp goal. 0 = no expiry.</summary>
    [JsonPropertyName("rewardExpirationHours")]
    public int RewardExpirationHours { get; set; } = 48;
}

public class LoyaltyProgramResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    [JsonPropertyName("rewardExpirationHours")]
    public int RewardExpirationHours { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  LOYALTY CARD DTOs
// ═══════════════════════════════════════════════════════════════

public class EnrollCardRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

public class LoyaltyCardResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("businessLogoUrl")]
    public string? BusinessLogoUrl { get; set; }

    [JsonPropertyName("programId")]
    public Guid ProgramId { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("lifetimeStamps")]
    public int LifetimeStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("lastStampAt")]
    public DateTime? LastStampAt { get; set; }

    [JsonPropertyName("enrolledAt")]
    public DateTime EnrolledAt { get; set; }

    [JsonPropertyName("rewardExpiresAt")]
    public DateTime? RewardExpiresAt { get; set; }

    [JsonPropertyName("program")]
    public LoyaltyProgramResponse Program { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════
//  STAMP DTOs
// ═══════════════════════════════════════════════════════════════

public class AwardStampRequest
{
    /// <summary>Plain QR token value from scanning.</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    /// <summary>Business ID scanned at.</summary>
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

public class StampAwardedResponse
{
    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardReady")]
    public bool RewardReady { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string? RewardDescription { get; set; }

    [JsonPropertyName("stampedAt")]
    public DateTime StampedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  QR TOKEN DTOs
// ═══════════════════════════════════════════════════════════════

public class GenerateQrRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

public class QrTokenResponse
{
    /// <summary>Plain token to encode into the QR image (not stored on server).</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  USER MANAGEMENT DTOs
// ═══════════════════════════════════════════════════════════════

public class UpdateProfileRequest
{
    [JsonPropertyName("fullName")]
    public string? FullName { get; set; }

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }
}

public class BusinessCustomerResponse
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("lifetimeStamps")]
    public int LifetimeStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("enrolledAt")]
    public DateTime EnrolledAt { get; set; }

    [JsonPropertyName("lastStampAt")]
    public DateTime? LastStampAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  SSE DTOs
// ═══════════════════════════════════════════════════════════════

public class SseStampEvent
{
    [JsonPropertyName("event")]
    public string Event { get; set; } = "stamp_awarded";

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardReady")]
    public bool RewardReady { get; set; }

    [JsonPropertyName("stampedAt")]
    public DateTime StampedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  REDEMPTION DTOs
// ═══════════════════════════════════════════════════════════════

public class ClaimRewardRequest
{
    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }
}

public class RedemptionResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("redeemedAt")]
    public DateTime RedeemedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  BUSINESS DASHBOARD DTOs
// ═══════════════════════════════════════════════════════════════

public class BusinessDashboardResponse
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("activeCards")]
    public int ActiveCards { get; set; }

    [JsonPropertyName("totalStampsIssued")]
    public int TotalStampsIssued { get; set; }

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("rewardReadyCards")]
    public int RewardReadyCards { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  STAFF DTOs
// ═══════════════════════════════════════════════════════════════

public class StaffBusinessResponse
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;
}

public class StaffMemberResponse
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("stampsIssued")]
    public int StampsIssued { get; set; }
}

public class StaffAnalyticsResponse
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("staffName")]
    public string StaffName { get; set; } = string.Empty;

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("stampsThisWeek")]
    public int StampsThisWeek { get; set; }

    [JsonPropertyName("stampsThisMonth")]
    public int StampsThisMonth { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }

    [JsonPropertyName("rewardReadyCount")]
    public int RewardReadyCount { get; set; }

    [JsonPropertyName("recentActivity")]
    public List<StaffActivityItem> RecentActivity { get; set; } = [];
}

public class StaffActivityItem
{
    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("stampedAt")]
    public DateTime StampedAt { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  STAFF MEMBER INDIVIDUAL ANALYTICS (owner view, per-period)
// ═══════════════════════════════════════════════════════════════

public class StaffMemberAnalyticsResponse
{
    [JsonPropertyName("staffId")]
    public Guid StaffId { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("period")]
    public string Period { get; set; } = "all";

    [JsonPropertyName("stampsIssued")]
    public int StampsIssued { get; set; }

    [JsonPropertyName("customersServed")]
    public int CustomersServed { get; set; }

    [JsonPropertyName("totalStampsAllTime")]
    public int TotalStampsAllTime { get; set; }

    [JsonPropertyName("totalCustomersAllTime")]
    public int TotalCustomersAllTime { get; set; }

    [JsonPropertyName("recentActivity")]
    public List<StaffActivityItem> RecentActivity { get; set; } = [];
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER PERIOD STATS (owner view, time-filtered)
// ═══════════════════════════════════════════════════════════════

public class CustomerPeriodStatsResponse
{
    [JsonPropertyName("period")]
    public string Period { get; set; } = "all";

    [JsonPropertyName("stampsInPeriod")]
    public int StampsInPeriod { get; set; }

    [JsonPropertyName("visitsInPeriod")]
    public int VisitsInPeriod { get; set; }

    [JsonPropertyName("lastVisitInPeriod")]
    public DateTime? LastVisitInPeriod { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  BUSINESS ANALYTICS DTOs (decision-making dashboard)
// ═══════════════════════════════════════════════════════════════

public class BusinessAnalyticsResponse
{
    [JsonPropertyName("hourlyActivity")]
    public List<HourlyActivityPoint> HourlyActivity { get; set; } = [];

    [JsonPropertyName("weeklyHeatmap")]
    public List<HeatmapCell> WeeklyHeatmap { get; set; } = [];

    [JsonPropertyName("genderBreakdown")]
    public List<DemographicSlice> GenderBreakdown { get; set; } = [];

    [JsonPropertyName("ageBreakdown")]
    public List<DemographicSlice> AgeBreakdown { get; set; } = [];

    [JsonPropertyName("engagementTrends")]
    public List<EngagementTrendPoint> EngagementTrends { get; set; } = [];

    [JsonPropertyName("programPerformance")]
    public List<ProgramPerformanceItem> ProgramPerformance { get; set; } = [];

    [JsonPropertyName("customerGrowth")]
    public List<GrowthPoint> CustomerGrowth { get; set; } = [];

    [JsonPropertyName("retentionData")]
    public RetentionSummary Retention { get; set; } = new();

    [JsonPropertyName("staffPerformance")]
    public List<StaffPerformanceItem> StaffPerformance { get; set; } = [];

    [JsonPropertyName("funnelData")]
    public FunnelData Funnel { get; set; } = new();

    [JsonPropertyName("topCustomers")]
    public List<TopCustomerItem> TopCustomers { get; set; } = [];
}

public class HourlyActivityPoint
{
    [JsonPropertyName("hour")]
    public int Hour { get; set; }

    [JsonPropertyName("stamps")]
    public int Stamps { get; set; }

    [JsonPropertyName("redemptions")]
    public int Redemptions { get; set; }
}

public class HeatmapCell
{
    [JsonPropertyName("day")]
    public int Day { get; set; }

    [JsonPropertyName("hour")]
    public int Hour { get; set; }

    [JsonPropertyName("value")]
    public int Value { get; set; }
}

public class DemographicSlice
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public class EngagementTrendPoint
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("stamps")]
    public int Stamps { get; set; }

    [JsonPropertyName("redemptions")]
    public int Redemptions { get; set; }

    [JsonPropertyName("enrollments")]
    public int Enrollments { get; set; }
}

public class ProgramPerformanceItem
{
    [JsonPropertyName("programId")]
    public Guid ProgramId { get; set; }

    [JsonPropertyName("programName")]
    public string ProgramName { get; set; } = string.Empty;

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("activeCards")]
    public int ActiveCards { get; set; }

    [JsonPropertyName("completionRate")]
    public double CompletionRate { get; set; }
}

public class GrowthPoint
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("newCount")]
    public int NewCount { get; set; }
}

public class RetentionSummary
{
    [JsonPropertyName("newCustomers")]
    public int NewCustomers { get; set; }

    [JsonPropertyName("returningCustomers")]
    public int ReturningCustomers { get; set; }

    [JsonPropertyName("dormantCustomers")]
    public int DormantCustomers { get; set; }

    [JsonPropertyName("retentionRate")]
    public double RetentionRate { get; set; }
}

public class StaffPerformanceItem
{
    [JsonPropertyName("staffId")]
    public Guid StaffId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("stampsIssued")]
    public int StampsIssued { get; set; }

    [JsonPropertyName("customersServed")]
    public int CustomersServed { get; set; }
}

public class FunnelData
{
    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }

    [JsonPropertyName("stampedAtLeastOnce")]
    public int StampedAtLeastOnce { get; set; }

    [JsonPropertyName("completedCard")]
    public int CompletedCard { get; set; }

    [JsonPropertyName("redeemed")]
    public int Redeemed { get; set; }
}

public class TopCustomerItem
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("lifetimeStamps")]
    public int LifetimeStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("lastVisit")]
    public DateTime? LastVisit { get; set; }
}
