using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Service catalog management for business owners plus a public per-business active list.
/// </summary>
public interface IServiceCatalogService
{
    /// <summary>Public list of a business's active services.</summary>
    Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetServicesForBusinessAsync(Guid businessId);

    /// <summary>Owner list of all services (including inactive).</summary>
    Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetMyServicesAsync(Guid ownerUserId);

    /// <summary>Owner-scoped single-service lookup.</summary>
    Task<ApiResponse<ServiceCatalogItemResponse>> GetServiceAsync(Guid ownerUserId, Guid serviceId);

    /// <summary>Creates a new active service for the owner's business.</summary>
    Task<ApiResponse<ServiceCatalogItemResponse>> CreateServiceAsync(Guid ownerUserId, CreateServiceRequest request);

    /// <summary>Partially updates an owner-scoped service.</summary>
    Task<ApiResponse<ServiceCatalogItemResponse>> UpdateServiceAsync(Guid ownerUserId, Guid serviceId, UpdateServiceRequest request);

    /// <summary>Soft-deletes a service by setting IsActive = false.</summary>
    Task<ApiResponse<bool>> DeleteServiceAsync(Guid ownerUserId, Guid serviceId);

    /// <summary>
    /// Public: staff who can perform ALL of the given services for a business.
    /// When no serviceIds are supplied, every staff member of the business is returned.
    /// </summary>
    Task<ApiResponse<List<EligibleStaffResponse>>> GetEligibleStaffAsync(Guid businessId, Guid[] serviceIds);
}
