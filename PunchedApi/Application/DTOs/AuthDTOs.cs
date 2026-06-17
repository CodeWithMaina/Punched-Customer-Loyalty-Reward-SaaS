using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  COMMON RESPONSE WRAPPERS
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// Standard API response wrapper matching the spec format.
/// All endpoints return this structure for consistency.
/// </summary>
/// <typeparam name="T">Type of the data payload.</typeparam>
public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("error")]
    public ApiError? Error { get; set; }

    /// <summary>Creates a successful response.</summary>
    public static ApiResponse<T> Ok(T data) => new()
    {
        Success = true,
        Data = data,
        Error = null
    };

    /// <summary>Creates a failure response with an error.</summary>
    public static ApiResponse<T> Fail(string code, string message) => new()
    {
        Success = false,
        Data = default,
        Error = new ApiError { Code = code, Message = message }
    };
}

/// <summary>
/// Error details included in failed API responses.
/// </summary>
public class ApiError
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH REQUESTS
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// POST /auth/register request body.
/// </summary>
public class RegisterRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Role of the registering user. Defaults to Customer if not provided.</summary>
    [JsonPropertyName("role")]
    public UserRole Role { get; set; } = UserRole.Customer;
}

/// <summary>
/// POST /auth/verify-email request body.
/// </summary>
public class VerifyEmailRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/login request body.
/// </summary>
public class LoginRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/refresh-token request body.
/// </summary>
public class RefreshTokenRequest
{
    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/request-email request body.
/// </summary>
public class RequestEmailRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/forgot-password request body.
/// Initiates password reset by sending a code to the email.
/// </summary>
public class ForgotPasswordRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/reset-password request body.
/// Resets the password using the code sent via forgot-password.
/// </summary>
public class ResetPasswordRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>
/// POST /auth/change-password request body.
/// Changes password for the currently authenticated user.
/// </summary>
public class ChangePasswordRequest
{
    [JsonPropertyName("currentPassword")]
    public string CurrentPassword { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH RESPONSES
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// Generic message response (e.g., registration success, logout).
/// </summary>
public class MessageResponse
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Authentication response containing tokens and user profile.
/// Returned by login and verify-email endpoints.
/// </summary>
public class AuthResponse
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("user")]
    public UserProfileResponse User { get; set; } = null!;
}

/// <summary>
/// Token-only response for refresh-token endpoint.
/// </summary>
public class TokenResponse
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; }
}

/// <summary>
/// User profile data returned in auth and profile endpoints.
/// </summary>
public class UserProfileResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("role")]
    public UserRole Role { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
