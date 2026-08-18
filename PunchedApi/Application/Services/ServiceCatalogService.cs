using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Application.Services;

/// <summary>
/// Backs the ServiceCatalog endpoints and the public per-business service list.
/// Owner-scoped methods resolve the business from the ownerUserId and assert ownership.
/// </summary>
public class ServiceCatalogService : IServiceCatalogService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ServiceCatalogService> _logger;

    public ServiceCatalogService(IUnitOfWork unitOfWork, ILogger<ServiceCatalogService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetServicesForBusinessAsync(Guid businessId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.Id == businessId);
        if (business == null)
            return ApiResponse<List<ServiceCatalogItemResponse>>.Fail("NOT_FOUND", "Business not found.");

        var services = await _unitOfWork.ServiceCatalogItems
            .FindAsync(s => s.BusinessId == businessId && s.IsActive);

        return ApiResponse<List<ServiceCatalogItemResponse>>.Ok(
            services.OrderBy(s => s.CreatedAt).Select(Map).ToList());
    }

    public async Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetMyServicesAsync(Guid ownerUserId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<List<ServiceCatalogItemResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var services = await _unitOfWork.ServiceCatalogItems
            .FindAsync(s => s.BusinessId == business.Id);

        return ApiResponse<List<ServiceCatalogItemResponse>>.Ok(
            services.OrderBy(s => s.CreatedAt).Select(Map).ToList());
    }

    public async Task<ApiResponse<ServiceCatalogItemResponse>> GetServiceAsync(Guid ownerUserId, Guid serviceId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var service = await _unitOfWork.ServiceCatalogItems.FirstOrDefaultAsync(s => s.Id == serviceId);
        if (service == null)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("NOT_FOUND", "Service not found.");
        if (service.BusinessId != business.Id)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("FORBIDDEN", "Not authorized to access this service.");

        return ApiResponse<ServiceCatalogItemResponse>.Ok(Map(service));
    }

    public async Task<ApiResponse<ServiceCatalogItemResponse>> CreateServiceAsync(Guid ownerUserId, CreateServiceRequest request)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var service = new ServiceCatalogItem
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            Name = request.Name.Trim(),
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.ServiceCatalogItems.AddAsync(service);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<ServiceCatalogItemResponse>.Ok(Map(service));
    }

    public async Task<ApiResponse<ServiceCatalogItemResponse>> UpdateServiceAsync(Guid ownerUserId, Guid serviceId, UpdateServiceRequest request)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var service = await _unitOfWork.ServiceCatalogItems.FirstOrDefaultAsync(s => s.Id == serviceId);
        if (service == null)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("NOT_FOUND", "Service not found.");
        if (service.BusinessId != business.Id)
            return ApiResponse<ServiceCatalogItemResponse>.Fail("FORBIDDEN", "Not authorized to access this service.");

        if (!string.IsNullOrWhiteSpace(request.Name))
            service.Name = request.Name.Trim();
        if (request.DurationMinutes.HasValue)
            service.DurationMinutes = request.DurationMinutes.Value;
        if (request.Price.HasValue)
            service.Price = request.Price.Value;
        if (request.IsActive.HasValue)
            service.IsActive = request.IsActive.Value;

        _unitOfWork.ServiceCatalogItems.Update(service);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<ServiceCatalogItemResponse>.Ok(Map(service));
    }

    public async Task<ApiResponse<bool>> DeleteServiceAsync(Guid ownerUserId, Guid serviceId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "No business found for this account.");

        var service = await _unitOfWork.ServiceCatalogItems.FirstOrDefaultAsync(s => s.Id == serviceId);
        if (service == null)
            return ApiResponse<bool>.Fail("NOT_FOUND", "Service not found.");
        if (service.BusinessId != business.Id)
            return ApiResponse<bool>.Fail("FORBIDDEN", "Not authorized to access this service.");

        // Soft delete: ServiceCatalogItem has no IsDeleted column, so deactivate.
        service.IsActive = false;
        _unitOfWork.ServiceCatalogItems.Update(service);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true);
    }

    private static ServiceCatalogItemResponse Map(ServiceCatalogItem s) => new()
    {
        Id = s.Id,
        BusinessId = s.BusinessId,
        Name = s.Name,
        DurationMinutes = s.DurationMinutes,
        Price = s.Price ?? 0,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt
    };
}
