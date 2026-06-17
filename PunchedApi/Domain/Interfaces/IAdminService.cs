using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IAdminService
{
    // ── Dashboard Overview ──────────────────────────────────
    Task<ApiResponse<AdminDashboardResponse>> GetDashboardAsync();

    // ── Growth / Trends ─────────────────────────────────────
    Task<ApiResponse<AdminGrowthResponse>> GetGrowthDataAsync(string period);

    // ── Business Analytics ──────────────────────────────────
    Task<ApiResponse<AdminBusinessAnalyticsResponse>> GetBusinessAnalyticsAsync();

    // ── Customer Analytics ──────────────────────────────────
    Task<ApiResponse<AdminCustomerAnalyticsResponse>> GetCustomerAnalyticsAsync();

    // ── Staff Analytics ─────────────────────────────────────
    Task<ApiResponse<AdminStaffAnalyticsResponse>> GetStaffAnalyticsAsync();

    // ── Smart Insights ──────────────────────────────────────
    Task<ApiResponse<AdminInsightsResponse>> GetInsightsAsync();

    // ── User Management ─────────────────────────────────────
    Task<ApiResponse<PaginatedResponse<AdminUserResponse>>> GetUsersAsync(
        string? role, string? search, int page, int pageSize);
    Task<ApiResponse<AdminUserResponse>> GetUserByIdAsync(Guid userId);
    Task<ApiResponse<AdminUserResponse>> UpdateUserAsync(Guid userId, AdminUpdateUserRequest request);
    Task<ApiResponse<MessageResponse>> DeleteUserAsync(Guid userId);

    // ── Business Management ─────────────────────────────────
    Task<ApiResponse<PaginatedResponse<AdminBusinessSummary>>> GetBusinessesAsync(
        string? category, string? search, int page, int pageSize);
    Task<ApiResponse<AdminBusinessSummary>> GetBusinessDetailAsync(Guid businessId);
    Task<ApiResponse<MessageResponse>> DeleteBusinessAsync(Guid businessId);

    // ── Reward / Stamp Management ───────────────────────────
    Task<ApiResponse<PaginatedResponse<RedemptionResponse>>> GetRedemptionsAsync(
        string? search, int page, int pageSize);
}
