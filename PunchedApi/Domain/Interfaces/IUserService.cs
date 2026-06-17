using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IUserService
{
    Task<ApiResponse<UserProfileResponse>> UpdateProfileAsync(Guid userAuthId, UpdateProfileRequest request);
}
