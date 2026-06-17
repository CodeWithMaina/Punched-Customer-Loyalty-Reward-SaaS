using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace PunchedApi.Application.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserService> _logger;

    public UserService(IUnitOfWork unitOfWork, ILogger<UserService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ApiResponse<UserProfileResponse>> UpdateProfileAsync(Guid userAuthId, UpdateProfileRequest request)
    {
        try
        {
            var userAuth = await _unitOfWork.UserAuths.GetByIdAsync(userAuthId);
            if (userAuth == null)
                return ApiResponse<UserProfileResponse>.Fail("NOT_FOUND", "User not found.");

            var user = await _unitOfWork.Users
                .FirstOrDefaultAsync(u => u.Email == userAuth.Email);
            if (user == null)
                return ApiResponse<UserProfileResponse>.Fail("NOT_FOUND", "User profile not found.");

            if (request.FullName != null)
                user.FullName = request.FullName.Trim();
            if (request.PhoneNumber != null)
                user.PhoneNumber = request.PhoneNumber.Trim();
            if (request.AvatarUrl != null)
                user.AvatarUrl = request.AvatarUrl.Trim();
            if (request.DateOfBirth.HasValue)
                user.DateOfBirth = request.DateOfBirth.Value;
            if (request.Gender != null)
                user.Gender = request.Gender.Trim();

            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<UserProfileResponse>.Ok(new UserProfileResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Phone = user.PhoneNumber,
                AvatarUrl = user.AvatarUrl,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for userAuthId {Id}", userAuthId);
            return ApiResponse<UserProfileResponse>.Fail("UPDATE_FAILED", "An error occurred updating the profile.");
        }
    }
}
