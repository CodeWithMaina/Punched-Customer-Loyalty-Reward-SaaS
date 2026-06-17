using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IStampService
{
    Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(Guid staffOrBusinessUserId, AwardStampRequest request);
}
