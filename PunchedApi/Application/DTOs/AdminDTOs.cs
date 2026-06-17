using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  ADMIN DTOs — Platform-wide analytics, management, insights
// ═══════════════════════════════════════════════════════════════

// ── Dashboard Overview ──────────────────────────────────────

public class AdminDashboardResponse
{
    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }

    [JsonPropertyName("totalBusinesses")]
    public int TotalBusinesses { get; set; }

    [JsonPropertyName("totalStaff")]
    public int TotalStaff { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("totalCards")]
    public int TotalCards { get; set; }

    [JsonPropertyName("totalReferrals")]
    public int TotalReferrals { get; set; }

    [JsonPropertyName("newCustomersToday")]
    public int NewCustomersToday { get; set; }

    [JsonPropertyName("newBusinessesToday")]
    public int NewBusinessesToday { get; set; }

    [JsonPropertyName("stampsToday")]
    public int StampsToday { get; set; }

    [JsonPropertyName("redemptionsToday")]
    public int RedemptionsToday { get; set; }

    [JsonPropertyName("newCustomers7d")]
    public int NewCustomers7d { get; set; }

    [JsonPropertyName("newBusinesses7d")]
    public int NewBusinesses7d { get; set; }

    [JsonPropertyName("stamps7d")]
    public int Stamps7d { get; set; }

    [JsonPropertyName("redemptions7d")]
    public int Redemptions7d { get; set; }
}

// ── Growth / Time-series ────────────────────────────────────

public class GrowthDataPoint
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public class AdminGrowthResponse
{
    [JsonPropertyName("period")]
    public string Period { get; set; } = "30d";

    [JsonPropertyName("customers")]
    public List<GrowthDataPoint> Customers { get; set; } = [];

    [JsonPropertyName("businesses")]
    public List<GrowthDataPoint> Businesses { get; set; } = [];

    [JsonPropertyName("stamps")]
    public List<GrowthDataPoint> Stamps { get; set; } = [];

    [JsonPropertyName("redemptions")]
    public List<GrowthDataPoint> Redemptions { get; set; } = [];
}

// ── Business Analytics ──────────────────────────────────────

public class CategoryBreakdown
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }
}

public class AdminBusinessAnalyticsResponse
{
    [JsonPropertyName("categoryBreakdown")]
    public List<CategoryBreakdown> CategoryBreakdown { get; set; } = [];

    [JsonPropertyName("topBusinesses")]
    public List<AdminBusinessSummary> TopBusinesses { get; set; } = [];

    [JsonPropertyName("recentBusinesses")]
    public List<AdminBusinessSummary> RecentBusinesses { get; set; } = [];
}

public class AdminBusinessSummary
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("ownerName")]
    public string OwnerName { get; set; } = string.Empty;

    [JsonPropertyName("ownerEmail")]
    public string OwnerEmail { get; set; } = string.Empty;

    [JsonPropertyName("totalCustomers")]
    public int TotalCustomers { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("totalStaff")]
    public int TotalStaff { get; set; }

    [JsonPropertyName("programCount")]
    public int ProgramCount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ── Customer Analytics ──────────────────────────────────────

public class AdminCustomerAnalyticsResponse
{
    [JsonPropertyName("genderBreakdown")]
    public List<DemographicItem> GenderBreakdown { get; set; } = [];

    [JsonPropertyName("ageBreakdown")]
    public List<DemographicItem> AgeBreakdown { get; set; } = [];

    [JsonPropertyName("topCustomers")]
    public List<AdminCustomerSummary> TopCustomers { get; set; } = [];

    [JsonPropertyName("engagementBreakdown")]
    public EngagementBreakdown EngagementBreakdown { get; set; } = new();
}

public class DemographicItem
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public class EngagementBreakdown
{
    [JsonPropertyName("highlyActive")]
    public int HighlyActive { get; set; }

    [JsonPropertyName("active")]
    public int Active { get; set; }

    [JsonPropertyName("occasional")]
    public int Occasional { get; set; }

    [JsonPropertyName("dormant")]
    public int Dormant { get; set; }
}

public class AdminCustomerSummary
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("totalCards")]
    public int TotalCards { get; set; }

    [JsonPropertyName("lifetimeStamps")]
    public int LifetimeStamps { get; set; }

    [JsonPropertyName("totalRedemptions")]
    public int TotalRedemptions { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ── Staff Analytics ─────────────────────────────────────────

public class AdminStaffAnalyticsResponse
{
    [JsonPropertyName("totalStaff")]
    public int TotalStaff { get; set; }

    [JsonPropertyName("linkedStaff")]
    public int LinkedStaff { get; set; }

    [JsonPropertyName("unlinkedStaff")]
    public int UnlinkedStaff { get; set; }

    [JsonPropertyName("topStaff")]
    public List<AdminStaffSummary> TopStaff { get; set; } = [];
}

public class AdminStaffSummary
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("businessName")]
    public string? BusinessName { get; set; }

    [JsonPropertyName("totalStampsIssued")]
    public int TotalStampsIssued { get; set; }

    [JsonPropertyName("customersServed")]
    public int CustomersServed { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// ── Smart Insights ──────────────────────────────────────────

public class AdminInsightsResponse
{
    [JsonPropertyName("insights")]
    public List<SmartInsight> Insights { get; set; } = [];
}

public class SmartInsight
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("metric")]
    public string? Metric { get; set; }

    [JsonPropertyName("trend")]
    public string? Trend { get; set; }
}

// ── Paginated List Responses ────────────────────────────────

public class PaginatedResponse<T>
{
    [JsonPropertyName("items")]
    public List<T> Items { get; set; } = [];

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

// ── Admin User Management ───────────────────────────────────

public class AdminUserResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("role")]
    public UserRole Role { get; set; }

    [JsonPropertyName("isVerified")]
    public bool IsVerified { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class AdminUpdateUserRequest
{
    [JsonPropertyName("fullName")]
    public string? FullName { get; set; }

    [JsonPropertyName("role")]
    public UserRole? Role { get; set; }

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }
}
