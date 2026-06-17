using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Service interface for authentication operations.
/// Handles registration, login, verification, token management, and logout.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Registers a new user with email, password, and full name.
    /// Creates UserAuth + User records and sends verification code.
    /// </summary>
    Task<ApiResponse<MessageResponse>> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// Verifies a user's email with the 6-digit code.
    /// On success, returns JWT tokens and user profile.
    /// </summary>
    Task<ApiResponse<AuthResponse>> VerifyEmailAsync(VerifyEmailRequest request);

    /// <summary>
    /// Authenticates a user with email and password.
    /// Returns JWT tokens and user profile on success.
    /// </summary>
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);

    /// <summary>
    /// Rotates refresh token — issues new access + refresh tokens.
    /// Revokes the old refresh token.
    /// </summary>
    Task<ApiResponse<TokenResponse>> RefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Logs out by revoking all refresh tokens for the user.
    /// </summary>
    Task<ApiResponse<MessageResponse>> LogoutAsync(Guid userAuthId);

    /// <summary>
    /// Requests a new verification code be sent to the email.
    /// Rate limited: max 3 per email per 15 minutes.
    /// </summary>
    Task<ApiResponse<MessageResponse>> RequestVerificationCodeAsync(RequestEmailRequest request);

    /// <summary>
    /// Gets the authenticated user's profile.
    /// </summary>
    Task<ApiResponse<UserProfileResponse>> GetProfileAsync(Guid userAuthId);

    /// <summary>
    /// Sends a password-reset verification code to the email.
    /// Does not reveal whether the email exists.
    /// </summary>
    Task<ApiResponse<MessageResponse>> ForgotPasswordAsync(ForgotPasswordRequest request);

    /// <summary>
    /// Resets the password using a verification code.
    /// </summary>
    Task<ApiResponse<MessageResponse>> ResetPasswordAsync(ResetPasswordRequest request);

    /// <summary>
    /// Changes password for an authenticated user.
    /// Requires current password verification.
    /// </summary>
    Task<ApiResponse<MessageResponse>> ChangePasswordAsync(Guid userAuthId, ChangePasswordRequest request);
}
