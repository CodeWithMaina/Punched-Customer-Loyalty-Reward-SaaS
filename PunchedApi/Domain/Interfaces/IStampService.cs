using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

public interface IStampService
{
    Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(Guid staffOrBusinessUserId, AwardStampRequest request);
    Task<ApiResponse<Stamp>> CreateEnrollmentStampAsync(Guid cardId, int stampNumber);
    Task<ApiResponse<Stamp>> CreateScanStampAsync(Guid cardId, int stampNumber, Guid staffUserId);
    Task<ApiResponse<List<StampDto>>> GetRecentStampsAsync(Guid businessId, Guid? staffUserId, int limit = 20);
}
