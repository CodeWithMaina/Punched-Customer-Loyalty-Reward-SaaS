using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IBusinessService
{
    Task<ApiResponse<BusinessResponse>> CreateBusinessAsync(Guid ownerId, CreateBusinessRequest request);
    Task<ApiResponse<BusinessResponse>> GetMyBusinessAsync(Guid ownerId);
    Task<ApiResponse<BusinessResponse>> UpdateMyBusinessAsync(Guid ownerId, UpdateBusinessRequest request);
    Task<ApiResponse<BusinessResponse>> GetBusinessByIdAsync(Guid businessId);
    Task<ApiResponse<List<BusinessResponse>>> ListBusinessesAsync(string? category, string? search, int page, int pageSize);
    Task<ApiResponse<List<BusinessCustomerResponse>>> GetBusinessCustomersAsync(Guid ownerId, string? search);
    Task<ApiResponse<BusinessCustomerResponse>> GetSingleCustomerAsync(Guid ownerId, Guid customerId);
    Task<ApiResponse<BusinessDashboardResponse>> GetDashboardAsync(Guid ownerId);
    Task<ApiResponse<StaffBusinessResponse>> GetStaffBusinessAsync(Guid staffUserId);
    Task<ApiResponse<StaffAnalyticsResponse>> GetStaffAnalyticsAsync(Guid staffUserId);
    Task<ApiResponse<List<StaffMemberResponse>>> GetMyStaffAsync(Guid ownerId, string? search = null, string sort = "alpha");
    Task<ApiResponse<StaffMemberAnalyticsResponse>> GetStaffMemberAnalyticsAsync(Guid ownerId, Guid staffUserId, string period);
    Task<ApiResponse<StaffActivityFeedResponse>> GetStaffActivityForOwnerAsync(Guid ownerId, Guid staffUserId, StaffActivityFilterRequest request);
    Task<ApiResponse<StaffActivityFeedResponse>> GetMyStaffActivityAsync(Guid staffUserId, StaffActivityFilterRequest request);
    Task<ApiResponse<CustomerPeriodStatsResponse>> GetCustomerPeriodStatsAsync(Guid ownerId, Guid customerId, string period);
    Task<ApiResponse<MessageResponse>> LinkStaffToBusinessAsync(Guid ownerId, Guid staffUserId);
    Task<ApiResponse<BusinessAnalyticsResponse>> GetBusinessAnalyticsAsync(Guid ownerId, string period);
    Task<ApiResponse<BusinessAnalyticsComparisonResponse>> GetBusinessAnalyticsComparisonAsync(
        Guid ownerId, string period, string? prev, DateOnly? start, DateOnly? end);
    Task<ApiResponse<List<InsightResponse>>> GetBusinessInsightsAsync(Guid ownerId, bool includeDismissed = false);
    Task<ApiResponse<MessageResponse>> DismissBusinessInsightAsync(Guid ownerId, Guid actorUserId, Guid insightId);
    Task<ApiResponse<List<CustomerSegmentResponse>>> GetBusinessCustomerSegmentsAsync(Guid ownerId, string? segment = null);
    Task<ApiResponse<NotificationAnalyticsResponse>> GetNotificationAnalyticsAsync(Guid ownerId, int days = 30);
    Task<ApiResponse<List<StaffUtilizationResponse>>> GetStaffUtilizationAsync(Guid ownerId, DateOnly? from = null, DateOnly? to = null);
    Task<ApiResponse<List<StaffShiftResponse>>> GetStaffShiftsAsync(Guid ownerId, Guid staffUserId, DateOnly? from = null, DateOnly? to = null);
    Task<ApiResponse<MessageResponse>> UpsertStaffShiftAsync(Guid ownerId, Guid staffUserId, UpsertStaffShiftRequest request);
}
