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
    Task<ApiResponse<CustomerPeriodStatsResponse>> GetCustomerPeriodStatsAsync(Guid ownerId, Guid customerId, string period);
    Task<ApiResponse<MessageResponse>> LinkStaffToBusinessAsync(Guid ownerId, Guid staffUserId);
    Task<ApiResponse<BusinessAnalyticsResponse>> GetBusinessAnalyticsAsync(Guid ownerId, string period);
}
