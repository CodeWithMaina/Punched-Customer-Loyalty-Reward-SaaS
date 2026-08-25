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

/// <summary>Sets the business-level default daily-stamp goal for staff.</summary>
public class UpdateBusinessDailyGoalRequest
{
    [JsonPropertyName("dailyGoal")]
    public int? DailyGoal { get; set; }
}

/// <summary>Sets (or clears, when null) a staff member's personal daily-stamp goal override.</summary>
public class SetStaffDailyGoalRequest
{
    [JsonPropertyName("dailyGoal")]
    public int? DailyGoal { get; set; }
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

    [JsonPropertyName("defaultDailyGoal")]
    public int? DefaultDailyGoal { get; set; }

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

    /// <summary>Welcome stamps granted automatically to a new customer on enrollment (0-100).</summary>
    [JsonPropertyName("defaultEnrollmentStamps")]
    public int DefaultEnrollmentStamps { get; set; }
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

    /// <summary>Welcome stamps granted automatically to a new customer on enrollment (0-100).</summary>
    [JsonPropertyName("defaultEnrollmentStamps")]
    public int? DefaultEnrollmentStamps { get; set; }
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

    /// <summary>Welcome stamps granted automatically to a new customer on enrollment (0-100).</summary>
    [JsonPropertyName("defaultEnrollmentStamps")]
    public int DefaultEnrollmentStamps { get; set; }
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

    /// <summary>Welcome stamps granted automatically to a new customer on enrollment (0-100).</summary>
    [JsonPropertyName("defaultEnrollmentStamps")]
    public int DefaultEnrollmentStamps { get; set; }

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

    /// <summary>Effective reward threshold (stamps required to redeem) for this business.</summary>
    [JsonPropertyName("stampsRequired")]
    public int? StampsRequired { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER OVERVIEW / DASHBOARD (owner view)
// ═══════════════════════════════════════════════════════════════

public class CustomerOverviewResponse
{
    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }

    /// <summary>Customers with at least one stamp in the trailing 7 days.</summary>
    [JsonPropertyName("active7d")]
    public int Active7d { get; set; }

    /// <summary>Customers whose current cycle has reached the reward threshold.</summary>
    [JsonPropertyName("rewardReady")]
    public int RewardReady { get; set; }

    /// <summary>Customers enrolled within the trailing 7 days.</summary>
    [JsonPropertyName("newThisWeek")]
    public int NewThisWeek { get; set; }

    /// <summary>Customers with no stamp in the last 21 days (cooling / at-risk).</summary>
    [JsonPropertyName("atRisk")]
    public int AtRisk { get; set; }

    [JsonPropertyName("stampsThisWeek")]
    public int StampsThisWeek { get; set; }

    [JsonPropertyName("topCustomers")]
    public List<BusinessCustomerResponse> TopCustomers { get; set; } = [];

    /// <summary>Customers within a few stamps of the reward threshold.</summary>
    [JsonPropertyName("soonToReward")]
    public List<BusinessCustomerResponse> SoonToReward { get; set; } = [];

    [JsonPropertyName("recentlyActive")]
    public List<BusinessCustomerResponse> RecentlyActive { get; set; } = [];
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER ACTIVITY FEED (owner view, paginated)
// ═══════════════════════════════════════════════════════════════

public class CustomerActivityItem
{
    [JsonPropertyName("activityId")]
    public Guid ActivityId { get; set; }

    [JsonPropertyName("activityType")]
    public string ActivityType { get; set; } = "stamp";

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal? RewardValue { get; set; }

    /// <summary>Staff member who performed the action (nullable for redemptions by the customer).</summary>
    [JsonPropertyName("staffName")]
    public string? StaffName { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}

public class CustomerActivityFeedResponse
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<CustomerActivityItem> Items { get; set; } = [];

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }
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

    [JsonPropertyName("staffMini")]
    public List<StaffMiniDto> StaffMini { get; set; } = new();
}

/// <summary>
/// Lightweight staff summary used on the owner business dashboard.
/// </summary>
public class StaffMiniDto
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("dailyGoal")]
    public int DailyGoal { get; set; }

    [JsonPropertyName("isOnShift")]
    public bool IsOnShift { get; set; }
}

/// <summary>
/// Recent stamp entry for the business activity feed.
/// </summary>
public class StampDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("rewardDescription")]
    public string? RewardDescription { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("source")]
    public string Source { get; set; } = StampSource.Scan;
}

/// <summary>
/// In-app notification for staff.
/// </summary>
public class NotificationDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid? BusinessId { get; set; }

    [JsonPropertyName("stampsCount")]
    public int StampsCount { get; set; }

    [JsonPropertyName("isRead")]
    public bool IsRead { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request for marking a notification (or all) as read.
/// </summary>
public class MarkNotificationReadRequest
{
    [JsonPropertyName("notificationId")]
    public Guid? NotificationId { get; set; }
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

    /// <summary>Personal daily-stamp goal override (null = fall back to business default).</summary>
    [JsonPropertyName("dailyGoalOverride")]
    public int? DailyGoalOverride { get; set; }

    /// <summary>Effective daily-stamp goal (override, else business default, else null).</summary>
    [JsonPropertyName("dailyGoal")]
    public int? DailyGoal { get; set; }

    /// <summary>Stamps issued today (business-scoped, from staff daily analytics).</summary>
    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    /// <summary>Stamps issued in the trailing 7 days (business-scoped).</summary>
    [JsonPropertyName("stampsLast7d")]
    public int StampsLast7d { get; set; }

    /// <summary>UTC timestamp of this staff member's most recent stamp activity (null = never active).</summary>
    [JsonPropertyName("lastActivityAt")]
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>Paginated staff list envelope with filter metadata.</summary>
public class StaffListResponse
{
    [JsonPropertyName("items")]
    public List<StaffMemberResponse> Items { get; set; } = [];

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  STAFF OVERVIEW / DASHBOARD (owner view)
// ═══════════════════════════════════════════════════════════════

public class StaffOverviewResponse
{
    [JsonPropertyName("totalStaff")]
    public int TotalStaff { get; set; }

    /// <summary>Staff with at least one stamp in the trailing 7 days.</summary>
    [JsonPropertyName("activeStaff7d")]
    public int ActiveStaff7d { get; set; }

    /// <summary>Linked staff with no stamp activity in the trailing 7 days.</summary>
    [JsonPropertyName("inactiveStaff")]
    public int InactiveStaff { get; set; }

    [JsonPropertyName("pendingInvitations")]
    public int PendingInvitations { get; set; }

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("stampsThisWeek")]
    public int StampsThisWeek { get; set; }

    /// <summary>Staff who met or exceeded their effective daily goal today.</summary>
    [JsonPropertyName("goalsMetToday")]
    public int GoalsMetToday { get; set; }

    /// <summary>Total staff with an effective daily goal configured.</summary>
    [JsonPropertyName("staffWithGoals")]
    public int StaffWithGoals { get; set; }

    [JsonPropertyName("topPerformers")]
    public List<StaffMemberResponse> TopPerformers { get; set; } = [];

    /// <summary>Active-in-the-past staff with zero stamps today while having a goal set.</summary>
    [JsonPropertyName("needsAttention")]
    public List<StaffMemberResponse> NeedsAttention { get; set; } = [];

    [JsonPropertyName("recentlyActive")]
    public List<StaffMemberResponse> RecentlyActive { get; set; } = [];
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

    /// <summary>Effective daily-stamp goal (staff override, else business default).</summary>
    [JsonPropertyName("dailyGoal")]
    public int? DailyGoal { get; set; }

    [JsonPropertyName("recentActivity")]
    public List<StaffActivityItem> RecentActivity { get; set; } = [];
}

public class StaffActivityItem
{
    [JsonPropertyName("activityId")]
    public Guid? ActivityId { get; set; }

    [JsonPropertyName("activityType")]
    public string ActivityType { get; set; } = "stamp";

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }

    [JsonPropertyName("stampNumber")]
    public int StampNumber { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("rewardValue")]
    public decimal? RewardValue { get; set; }

    [JsonPropertyName("stampedAt")]
    public DateTime StampedAt { get; set; }
}

public class StaffActivityFilterRequest
{
    [JsonPropertyName("activityType")]
    public string? ActivityType { get; set; }

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }

    [JsonPropertyName("from")]
    public DateTime? From { get; set; }

    [JsonPropertyName("to")]
    public DateTime? To { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; } = 50;
}

public class StaffIdentityResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

public class StaffActivitySummaryResponse
{
    [JsonPropertyName("totalScans")]
    public int TotalScans { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("customersServed")]
    public int CustomersServed { get; set; }

    [JsonPropertyName("totalActivities")]
    public int TotalActivities { get; set; }
}

public class StaffActivityFeedResponse
{
    [JsonPropertyName("staff")]
    public StaffIdentityResponse Staff { get; set; } = new();

    [JsonPropertyName("summary")]
    public StaffActivitySummaryResponse Summary { get; set; } = new();

    [JsonPropertyName("activity")]
    public List<StaffActivityItem> Activity { get; set; } = [];

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }
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

    /// <summary>Effective daily-stamp goal (staff override, else business default).</summary>
    [JsonPropertyName("dailyGoal")]
    public int? DailyGoal { get; set; }

    /// <summary>Personal override if set (null = using business default).</summary>
    [JsonPropertyName("dailyGoalOverride")]
    public int? DailyGoalOverride { get; set; }

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
    [JsonPropertyName("period")]
    public string Period { get; set; } = "30d";

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

    // ── New analytics sections (P0 executive / P1 revenue, traffic, recommendations) ──

    [JsonPropertyName("overview")]
    public ExecutiveOverviewResponse Overview { get; set; } = new();

    [JsonPropertyName("revenue")]
    public BusinessRevenueResponse Revenue { get; set; } = new();

    [JsonPropertyName("traffic")]
    public BusinessTrafficResponse Traffic { get; set; } = new();

    [JsonPropertyName("recommendations")]
    public List<BusinessRecommendation> Recommendations { get; set; } = [];
}

public class ExecutiveOverviewResponse
{
    [JsonPropertyName("totalEnrolledCustomers")] public int TotalEnrolledCustomers { get; set; }
    [JsonPropertyName("newCustomers")] public int NewCustomers { get; set; }
    [JsonPropertyName("returningCustomers")] public int ReturningCustomers { get; set; }
    [JsonPropertyName("totalStamps")] public int TotalStamps { get; set; }
    [JsonPropertyName("stampsThisWeek")] public int StampsThisWeek { get; set; }
    [JsonPropertyName("avgStampsPerCustomer")] public double AvgStampsPerCustomer { get; set; }
    [JsonPropertyName("rewardPayoutKes")] public decimal RewardPayoutKes { get; set; }
    [JsonPropertyName("redemptionRate")] public double RedemptionRate { get; set; }
    [JsonPropertyName("netEngagementValueKes")] public decimal NetEngagementValueKes { get; set; }
    [JsonPropertyName("rewardReadyCustomers")] public int RewardReadyCustomers { get; set; }
    [JsonPropertyName("dormantCustomers")] public int DormantCustomers { get; set; }
    [JsonPropertyName("churnedCustomers")] public int ChurnedCustomers { get; set; }
}

public class BusinessRevenueResponse
{
    [JsonPropertyName("rewardPayoutKes")] public decimal RewardPayoutKes { get; set; }
    [JsonPropertyName("rewardPayoutTrend")] public List<RewardPayoutPoint> RewardPayoutTrend { get; set; } = [];
    [JsonPropertyName("accruedLiabilityKes")] public decimal AccruedLiabilityKes { get; set; }
    [JsonPropertyName("payoutSuccessRate")] public double PayoutSuccessRate { get; set; }
    [JsonPropertyName("rewardsEarnedKes")] public decimal RewardsEarnedKes { get; set; }
    [JsonPropertyName("rewardsPaidKes")] public decimal RewardsPaidKes { get; set; }
    [JsonPropertyName("pendingPayoutKes")] public decimal PendingPayoutKes { get; set; }
    [JsonPropertyName("avgPayoutLatencyDays")] public double? AvgPayoutLatencyDays { get; set; }
    [JsonPropertyName("failedPayouts")] public int FailedPayouts { get; set; }
}

public class RewardPayoutPoint
{
    [JsonPropertyName("date")] public string Date { get; set; } = string.Empty;
    [JsonPropertyName("value")] public decimal Value { get; set; }
}

public class BusinessTrafficResponse
{
    [JsonPropertyName("peakHours")] public List<PeakHourItem> PeakHours { get; set; } = [];
    [JsonPropertyName("busiestDayOfWeek")] public string? BusiestDayOfWeek { get; set; }
    [JsonPropertyName("busiestDayStamps")] public int BusiestDayStamps { get; set; }
    [JsonPropertyName("underutilizedHours")] public List<UnderutilizedHourItem> UnderutilizedHours { get; set; } = [];
    [JsonPropertyName("visitCadenceDays")] public double? VisitCadenceDays { get; set; }
}

public class PeakHourItem
{
    [JsonPropertyName("hour")] public int Hour { get; set; }
    [JsonPropertyName("stampCount")] public int StampCount { get; set; }
}

public class UnderutilizedHourItem
{
    [JsonPropertyName("hour")] public int Hour { get; set; }
    [JsonPropertyName("stampCount")] public int StampCount { get; set; }
    [JsonPropertyName("label")] public string Label { get; set; } = string.Empty;
}

public class BusinessRecommendation
{
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("priority")] public string Priority { get; set; } = "low";
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
    [JsonPropertyName("actionUrl")] public string? ActionUrl { get; set; }
    [JsonPropertyName("entityId")] public string? EntityId { get; set; }
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

    [JsonPropertyName("rewardPayoutKes")]
    public decimal RewardPayoutKes { get; set; }

    [JsonPropertyName("rewardsPaidKes")]
    public decimal RewardsPaidKes { get; set; }

    [JsonPropertyName("rewardsPendingKes")]
    public decimal RewardsPendingKes { get; set; }

    /// <summary>Completion activity per day over the period (date → completion count).</summary>
    [JsonPropertyName("completionTrend")]
    public List<CompletionTrendPoint> CompletionTrend { get; set; } = [];
}

public class CompletionTrendPoint
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; set; }
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

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("stampsLast7Days")]
    public int StampsLast7Days { get; set; }

    [JsonPropertyName("stampsLast30Days")]
    public int StampsLast30Days { get; set; }

    [JsonPropertyName("stampsAllTime")]
    public int StampsAllTime { get; set; }

    /// <summary>Stamps issued per distinct active day (working-hours data is not yet available).</summary>
    [JsonPropertyName("stampsPerActiveDay")]
    public double StampsPerActiveDay { get; set; }

    [JsonPropertyName("personalBest")]
    public int PersonalBest { get; set; }
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

    [JsonPropertyName("repeatRedeemer")]
    public int RepeatRedeemer { get; set; }

    /// <summary>Stage 3 (completed a card) over stage 1 (enrolled) as a percentage.</summary>
    [JsonPropertyName("completionRate")]
    public double CompletionRate { get; set; }
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

public class InsightResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("audience")]
    public string Audience { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("metric")]
    public string Metric { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public string Confidence { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("recommendation")]
    public string Recommendation { get; set; } = string.Empty;

    [JsonPropertyName("dataJson")]
    public string DataJson { get; set; } = "{}";

    [JsonPropertyName("generatedAt")]
    public DateTime GeneratedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("dismissed")]
    public bool Dismissed { get; set; }
}

public class CustomerSegmentResponse
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("segment")]
    public string Segment { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public int Score { get; set; }

    [JsonPropertyName("computedAt")]
    public DateTime ComputedAt { get; set; }

    [JsonPropertyName("lastStampAt")]
    public DateTime? LastStampAt { get; set; }
}

public class NotificationAnalyticsResponse
{
    [JsonPropertyName("periodDays")]
    public int PeriodDays { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("sent")]
    public int Sent { get; set; }

    [JsonPropertyName("failed")]
    public int Failed { get; set; }

    [JsonPropertyName("delivered")]
    public int Delivered { get; set; }

    [JsonPropertyName("opened")]
    public int Opened { get; set; }
}

public class StaffUtilizationResponse
{
    [JsonPropertyName("staffUserId")]
    public Guid StaffUserId { get; set; }

    [JsonPropertyName("staffName")]
    public string StaffName { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("workingHours")]
    public int WorkingHours { get; set; }

    [JsonPropertyName("stamps")]
    public int Stamps { get; set; }

    [JsonPropertyName("stampsPerHour")]
    public double StampsPerHour { get; set; }
}

public class StaffShiftResponse
{
    [JsonPropertyName("staffUserId")]
    public Guid StaffUserId { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("date")]
    public DateOnly Date { get; set; }

    [JsonPropertyName("startHour")]
    public int StartHour { get; set; }

    [JsonPropertyName("endHour")]
    public int EndHour { get; set; }

    [JsonPropertyName("isWorking")]
    public bool IsWorking { get; set; }
}

public class UpsertStaffShiftRequest
{
    [JsonPropertyName("date")]
    public DateOnly Date { get; set; }

    [JsonPropertyName("startHour")]
    public int StartHour { get; set; }

    [JsonPropertyName("endHour")]
    public int EndHour { get; set; }

    [JsonPropertyName("isWorking")]
    public bool IsWorking { get; set; } = true;
}

// ═══════════════════════════════════════════════════════════════
//  PERIOD-OVER-PERIOD COMPARISON (NEW)
// ═══════════════════════════════════════════════════════════════

public class BusinessAnalyticsComparisonResponse
{
    [JsonPropertyName("period")]
    public string Period { get; set; } = "30d";

    [JsonPropertyName("previousPeriod")]
    public string PreviousPeriod { get; set; } = "30d";

    [JsonPropertyName("windows")]
    public ComparisonWindowInfo? Windows { get; set; }

    /// <summary>Full ordered list of per-metric comparisons.</summary>
    [JsonPropertyName("metrics")]
    public List<MetricComparisonResult> Metrics { get; set; } = [];

    /// <summary>Convenience accessor for the headline overview metrics.</summary>
    [JsonPropertyName("summary")]
    public BusinessComparisonSummary Summary { get; set; } = new();
}

public class ComparisonWindowInfo
{
    [JsonPropertyName("currentStart")]
    public DateTime CurrentStart { get; set; }

    [JsonPropertyName("currentEnd")]
    public DateTime CurrentEnd { get; set; }

    [JsonPropertyName("previousStart")]
    public DateTime PreviousStart { get; set; }

    [JsonPropertyName("previousEnd")]
    public DateTime PreviousEnd { get; set; }
}

public class MetricComparisonResult
{
    [JsonPropertyName("metric")]
    public string Metric { get; set; } = string.Empty;

    [JsonPropertyName("previousValue")]
    public double PreviousValue { get; set; }

    [JsonPropertyName("currentValue")]
    public double CurrentValue { get; set; }

    /// <summary>Percentage change; null when not meaningful (previous == 0).</summary>
    [JsonPropertyName("changePct")]
    public double? ChangePct { get; set; }

    /// <summary>up | down | flat — never Infinity/NaN.</summary>
    [JsonPropertyName("trend")]
    public string Trend { get; set; } = "flat";
}

public class BusinessComparisonSummary
{
    [JsonPropertyName("stamps")]
    public MetricComparisonResult Stamps { get; set; } = new();

    /// <summary>Active customers (LastStampAt within window) — surfaced as "customers".</summary>
    [JsonPropertyName("customers")]
    public MetricComparisonResult Customers { get; set; } = new();

    [JsonPropertyName("payoutKes")]
    public MetricComparisonResult PayoutKes { get; set; } = new();
}
