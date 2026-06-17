using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IQrService
{
    Task<ApiResponse<QrTokenResponse>> GenerateTokenAsync(Guid customerId, GenerateQrRequest request);
}
