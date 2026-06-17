using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Authentication controller handling user registration, login,
/// email verification, token management, and logout.
/// Base route: /v1/auth
/// </summary>
[ApiController]
[Route("v1/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user with email, password, and full name.
    /// Sends a 6-digit verification code to the provided email.
    /// </summary>
    /// <param name="request">Registration details.</param>
    /// <returns>Success message or error.</returns>
    /// <response code="201">Registration successful, verification code sent.</response>
    /// <response code="409">Email already registered.</response>
    /// <response code="400">Validation error.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);

        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "EMAIL_ALREADY_REGISTERED" => Conflict(result),
                _ => BadRequest(result)
            };
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Verify email with 6-digit code sent during registration.
    /// Returns JWT tokens and user profile on success.
    /// </summary>
    /// <param name="request">Email and verification code.</param>
    /// <returns>Auth tokens and user profile.</returns>
    /// <response code="200">Email verified, tokens issued.</response>
    /// <response code="401">Invalid verification code.</response>
    /// <response code="410">Verification code expired.</response>
    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var result = await _authService.VerifyEmailAsync(request);

        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "CODE_EXPIRED" => StatusCode(StatusCodes.Status410Gone, result),
                "TOO_MANY_ATTEMPTS" => StatusCode(StatusCodes.Status429TooManyRequests, result),
                "ALREADY_VERIFIED" => Conflict(result),
                _ => Unauthorized(result)
            };
        }

        return Ok(result);
    }

    /// <summary>
    /// Login with email and password.
    /// Returns JWT tokens and user profile on success.
    /// </summary>
    /// <param name="request">Login credentials.</param>
    /// <returns>Auth tokens and user profile.</returns>
    /// <response code="200">Login successful.</response>
    /// <response code="401">Invalid credentials or unverified account.</response>
    /// <response code="423">Account locked due to too many failed attempts.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);

        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "ACCOUNT_LOCKED" => StatusCode(423, result),
                "ACCOUNT_NOT_VERIFIED" => Unauthorized(result),
                _ => Unauthorized(result)
            };
        }

        return Ok(result);
    }

    /// <summary>
    /// Rotate refresh token — issues new access and refresh tokens.
    /// Revokes the old refresh token.
    /// </summary>
    /// <param name="request">Current refresh token.</param>
    /// <returns>New access and refresh tokens.</returns>
    /// <response code="200">Tokens refreshed.</response>
    /// <response code="401">Invalid or expired refresh token.</response>
    [HttpPost("refresh-token")]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken);

        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Logout: revokes all refresh tokens for the current user.
    /// Requires a valid access token.
    /// </summary>
    /// <returns>Success message.</returns>
    /// <response code="200">Logged out successfully.</response>
    /// <response code="401">Not authenticated.</response>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var userAuthId = GetUserAuthIdFromClaims();
        if (userAuthId == null)
            return Unauthorized(ApiResponse<MessageResponse>.Fail("UNAUTHORIZED", "Invalid token."));

        var result = await _authService.LogoutAsync(userAuthId.Value);
        return Ok(result);
    }

    /// <summary>
    /// Request a new email verification code.
    /// Rate limited: max 3 per email per 15 minutes.
    /// </summary>
    /// <param name="request">Email address.</param>
    /// <returns>Success message.</returns>
    /// <response code="200">Verification code sent (if email exists).</response>
    [HttpPost("request-email")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestEmail([FromBody] RequestEmailRequest request)
    {
        var result = await _authService.RequestVerificationCodeAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Request a password reset code. Sends a 6-digit code to the email.
    /// Does not reveal whether the email is registered.
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var result = await _authService.ForgotPasswordAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Reset password using the verification code from forgot-password.
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = await _authService.ResetPasswordAsync(request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "CODE_EXPIRED" => StatusCode(StatusCodes.Status410Gone, result),
                "TOO_MANY_ATTEMPTS" => StatusCode(StatusCodes.Status429TooManyRequests, result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    /// <summary>
    /// POST /v1/auth/change-password — Change password for authenticated user.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userAuthId = GetUserAuthIdFromClaims();
        if (userAuthId == null)
            return Unauthorized(ApiResponse<MessageResponse>.Fail("UNAUTHORIZED", "Invalid token."));

        var result = await _authService.ChangePasswordAsync(userAuthId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "INVALID_PASSWORD" => BadRequest(result),
                "SAME_PASSWORD" => BadRequest(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    // ── Helper ──────────────────────────────────────────────

    /// <summary>
    /// Extracts the UserAuth ID from JWT claims (the "sub" claim).
    /// </summary>
    private Guid? GetUserAuthIdFromClaims()
    {
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;

        if (Guid.TryParse(subClaim, out var id))
            return id;

        return null;
    }
}
