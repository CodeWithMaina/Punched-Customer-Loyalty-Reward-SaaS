using System.Security.Cryptography;
using AutoMapper;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Application.Services;

/// <summary>
/// Authentication service implementing registration, login, verification,
/// token refresh, logout, and profile retrieval.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtTokenService _jwtService;
    private readonly IEmailService _emailService;
    private readonly IMapper _mapper;
    private readonly ILogger<AuthService> _logger;

    // ── Constants ────────────────────────────────────────────
    private const int MaxFailedLoginAttempts = 5;
    private const int AccountLockoutMinutes = 30;
    private const int MaxVerificationAttempts = 5;
    private const int VerificationCodeExpiryMinutes = 10;
    private const int VerificationCodeLockoutMinutes = 15;
    private const int BcryptWorkFactor = 12;

    public AuthService(
        IUnitOfWork unitOfWork,
        JwtTokenService jwtService,
        IEmailService emailService,
        IMapper mapper,
        ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _emailService = emailService;
        _mapper = mapper;
        _logger = logger;
    }

    /// <inheritdoc />
    /// <remarks>
    /// 1. Validate email not already registered (409 if exists).
    /// 2. Hash password with BCrypt (cost=12).
    /// 3. Create UserAuth + User records.
    /// 4. Generate 6-digit OTP and send via email.
    /// 5. Return success message.
    /// </remarks>
    public async Task<ApiResponse<MessageResponse>> RegisterAsync(RegisterRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Check if email already registered
            var existingAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (existingAuth != null)
            {
                _logger.LogWarning("Registration attempt with existing email: {Email}", normalizedEmail);
                return ApiResponse<MessageResponse>.Fail(
                    "EMAIL_ALREADY_REGISTERED",
                    "Email already in use");
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, BcryptWorkFactor);

            // Generate verification code
            var verificationCode = GenerateVerificationCode();
            var verificationCodeHash = HashVerificationCode(verificationCode);

            // Create UserAuth
            var userAuth = new UserAuth
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                IsVerified = false,
                VerificationCode = verificationCodeHash,
                VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(VerificationCodeExpiryMinutes),
                VerificationCodeAttempts = 0,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.UserAuths.AddAsync(userAuth);

            // Create User profile — prevent self-registration as Admin
            var role = request.Role == UserRole.Admin ? UserRole.Customer : request.Role;
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                FullName = request.FullName.Trim(),
                Role = role,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            // Send verification code (placeholder: logs to console)
            await _emailService.SendVerificationCodeAsync(normalizedEmail, verificationCode);

            _logger.LogInformation("User registered successfully: {Email}", normalizedEmail);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = "Registration successful. Check your email for verification code."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for email: {Email}", request.Email);
            return ApiResponse<MessageResponse>.Fail(
                "REGISTRATION_FAILED",
                "An unexpected error occurred during registration.");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// 1. Find UserAuth by email (404 if not found).
    /// 2. Check verification code not expired (410 if expired).
    /// 3. Compare code hash (401 if wrong, track attempts).
    /// 4. Set IsVerified = true.
    /// 5. Generate JWT tokens and return.
    /// </remarks>
    public async Task<ApiResponse<AuthResponse>> VerifyEmailAsync(VerifyEmailRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var userAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (userAuth == null)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "USER_NOT_FOUND",
                    "No account found with this email.");
            }

            if (userAuth.IsVerified)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "ALREADY_VERIFIED",
                    "Email is already verified.");
            }

            // Check if verification code is expired
            if (userAuth.VerificationCodeExpiresAt == null ||
                userAuth.VerificationCodeExpiresAt < DateTime.UtcNow)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "CODE_EXPIRED",
                    "Verification code has expired. Request a new one.");
            }

            // Check max attempts
            if (userAuth.VerificationCodeAttempts >= MaxVerificationAttempts)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "TOO_MANY_ATTEMPTS",
                    $"Too many wrong attempts. Try again in {VerificationCodeLockoutMinutes} minutes.");
            }

            // Verify code
            var codeHash = HashVerificationCode(request.Code);
            if (userAuth.VerificationCode != codeHash)
            {
                userAuth.VerificationCodeAttempts++;
                _unitOfWork.UserAuths.Update(userAuth);
                await _unitOfWork.SaveChangesAsync();

                var remaining = MaxVerificationAttempts - userAuth.VerificationCodeAttempts;
                return ApiResponse<AuthResponse>.Fail(
                    "INVALID_VERIFICATION_CODE",
                    $"Wrong verification code. {remaining} attempts remaining.");
            }

            // Mark as verified
            userAuth.IsVerified = true;
            userAuth.VerificationCode = null;
            userAuth.VerificationCodeExpiresAt = null;
            userAuth.VerificationCodeAttempts = 0;
            userAuth.LastLoginAt = DateTime.UtcNow;
            _unitOfWork.UserAuths.Update(userAuth);

            // Get user profile
            var user = await _unitOfWork.Users
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "PROFILE_NOT_FOUND",
                    "User profile not found.");
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(userAuth, user);
            var refreshTokenValue = _jwtService.GenerateRefreshToken();

            // Store refresh token
            var refreshToken = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserAuthId = userAuth.Id,
                Token = refreshTokenValue,
                ExpiresAt = _jwtService.RefreshTokenExpiry,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.RefreshTokens.AddAsync(refreshToken);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Email verified successfully: {Email}", normalizedEmail);

            // Fire-and-forget welcome email
            _ = Task.Run(async () =>
            {
                try { await _emailService.SendWelcomeAsync(normalizedEmail, user.FullName); }
                catch (Exception ex) { _logger.LogWarning(ex, "Non-critical: failed to send welcome email to {Email}", normalizedEmail); }
            });

            return ApiResponse<AuthResponse>.Ok(new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                ExpiresIn = _jwtService.AccessTokenExpirySeconds,
                User = _mapper.Map<UserProfileResponse>(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during email verification: {Email}", request.Email);
            return ApiResponse<AuthResponse>.Fail(
                "VERIFICATION_FAILED",
                "An unexpected error occurred during verification.");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// 1. Find UserAuth by email.
    /// 2. Check account not locked.
    /// 3. Check email verified.
    /// 4. Verify password hash.
    /// 5. Reset failed attempts, generate tokens.
    /// </remarks>
    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var userAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (userAuth == null)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "INVALID_CREDENTIALS",
                    "Invalid email or password.");
            }

            // Check if account is locked
            if (userAuth.LockedUntil.HasValue && userAuth.LockedUntil > DateTime.UtcNow)
            {
                var minutesRemaining = (int)(userAuth.LockedUntil.Value - DateTime.UtcNow).TotalMinutes + 1;
                return ApiResponse<AuthResponse>.Fail(
                    "ACCOUNT_LOCKED",
                    $"Account locked. Try again in {minutesRemaining} minutes.");
            }

            // Check if email is verified
            if (!userAuth.IsVerified)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "ACCOUNT_NOT_VERIFIED",
                    "Please verify your email before logging in.");
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, userAuth.PasswordHash))
            {
                userAuth.FailedLoginAttempts++;

                if (userAuth.FailedLoginAttempts >= MaxFailedLoginAttempts)
                {
                    userAuth.LockedUntil = DateTime.UtcNow.AddMinutes(AccountLockoutMinutes);
                    _logger.LogWarning("Account locked due to too many failed attempts: {Email}", normalizedEmail);
                }

                _unitOfWork.UserAuths.Update(userAuth);
                await _unitOfWork.SaveChangesAsync();

                return ApiResponse<AuthResponse>.Fail(
                    "INVALID_CREDENTIALS",
                    "Invalid email or password.");
            }

            // Successful login - reset failed attempts
            userAuth.FailedLoginAttempts = 0;
            userAuth.LockedUntil = null;
            userAuth.LastLoginAt = DateTime.UtcNow;
            _unitOfWork.UserAuths.Update(userAuth);

            // Get user profile
            var user = await _unitOfWork.Users
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null)
            {
                return ApiResponse<AuthResponse>.Fail(
                    "PROFILE_NOT_FOUND",
                    "User profile not found.");
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(userAuth, user);
            var refreshTokenValue = _jwtService.GenerateRefreshToken();

            var refreshToken = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserAuthId = userAuth.Id,
                Token = refreshTokenValue,
                ExpiresAt = _jwtService.RefreshTokenExpiry,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.RefreshTokens.AddAsync(refreshToken);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("User logged in successfully: {Email}", normalizedEmail);

            return ApiResponse<AuthResponse>.Ok(new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                ExpiresIn = _jwtService.AccessTokenExpirySeconds,
                User = _mapper.Map<UserProfileResponse>(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login: {Email}", request.Email);
            return ApiResponse<AuthResponse>.Fail(
                "LOGIN_FAILED",
                "An unexpected error occurred during login.");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// 1. Find refresh token in database.
    /// 2. Validate not expired or revoked.
    /// 3. Revoke old token, issue new pair.
    /// </remarks>
    public async Task<ApiResponse<TokenResponse>> RefreshTokenAsync(string refreshTokenValue)
    {
        try
        {
            var storedToken = await _unitOfWork.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == refreshTokenValue && !t.IsRevoked);

            if (storedToken == null)
            {
                return ApiResponse<TokenResponse>.Fail(
                    "INVALID_REFRESH_TOKEN",
                    "Invalid or expired refresh token.");
            }

            if (storedToken.ExpiresAt < DateTime.UtcNow)
            {
                storedToken.IsRevoked = true;
                storedToken.RevokedAt = DateTime.UtcNow;
                _unitOfWork.RefreshTokens.Update(storedToken);
                await _unitOfWork.SaveChangesAsync();

                return ApiResponse<TokenResponse>.Fail(
                    "REFRESH_TOKEN_EXPIRED",
                    "Refresh token has expired. Please login again.");
            }

            // Get UserAuth and User
            var userAuth = await _unitOfWork.UserAuths.GetByIdAsync(storedToken.UserAuthId);
            if (userAuth == null)
            {
                return ApiResponse<TokenResponse>.Fail(
                    "USER_NOT_FOUND",
                    "User not found.");
            }

            var user = await _unitOfWork.Users
                .FirstOrDefaultAsync(u => u.Email == userAuth.Email);

            if (user == null)
            {
                return ApiResponse<TokenResponse>.Fail(
                    "PROFILE_NOT_FOUND",
                    "User profile not found.");
            }

            // Revoke old token
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            _unitOfWork.RefreshTokens.Update(storedToken);

            // Generate new tokens
            var newAccessToken = _jwtService.GenerateAccessToken(userAuth, user);
            var newRefreshTokenValue = _jwtService.GenerateRefreshToken();

            var newRefreshToken = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserAuthId = userAuth.Id,
                Token = newRefreshTokenValue,
                ExpiresAt = _jwtService.RefreshTokenExpiry,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.RefreshTokens.AddAsync(newRefreshToken);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<TokenResponse>.Ok(new TokenResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshTokenValue,
                ExpiresIn = _jwtService.AccessTokenExpirySeconds
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return ApiResponse<TokenResponse>.Fail(
                "TOKEN_REFRESH_FAILED",
                "An unexpected error occurred during token refresh.");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Revokes all active refresh tokens for the given user.
    /// </remarks>
    public async Task<ApiResponse<MessageResponse>> LogoutAsync(Guid userAuthId)
    {
        try
        {
            var tokens = await _unitOfWork.RefreshTokens
                .FindAsync(t => t.UserAuthId == userAuthId && !t.IsRevoked);

            foreach (var token in tokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
                _unitOfWork.RefreshTokens.Update(token);
            }

            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("User logged out, all tokens revoked: {UserAuthId}", userAuthId);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = "Logged out successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout: {UserAuthId}", userAuthId);
            return ApiResponse<MessageResponse>.Fail(
                "LOGOUT_FAILED",
                "An unexpected error occurred during logout.");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Generates a new 6-digit code and sends to the email.
    /// Rate limited: max 3 per email per 15 minutes (checked at middleware level).
    /// </remarks>
    public async Task<ApiResponse<MessageResponse>> RequestVerificationCodeAsync(RequestEmailRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var userAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (userAuth == null)
            {
                // Don't reveal if email exists — return success regardless
                return ApiResponse<MessageResponse>.Ok(new MessageResponse
                {
                    Message = $"If the email is registered, a verification code has been sent to {normalizedEmail}. Valid for 10 minutes."
                });
            }

            // Generate new code
            var verificationCode = GenerateVerificationCode();
            var verificationCodeHash = HashVerificationCode(verificationCode);

            userAuth.VerificationCode = verificationCodeHash;
            userAuth.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(VerificationCodeExpiryMinutes);
            userAuth.VerificationCodeAttempts = 0;
            _unitOfWork.UserAuths.Update(userAuth);
            await _unitOfWork.SaveChangesAsync();

            // Send code
            await _emailService.SendVerificationCodeAsync(normalizedEmail, verificationCode);

            _logger.LogInformation("Verification code sent to: {Email}", normalizedEmail);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = $"Verification code sent to {normalizedEmail}. Valid for 10 minutes."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting verification code: {Email}", request.Email);
            return ApiResponse<MessageResponse>.Fail(
                "REQUEST_CODE_FAILED",
                "An unexpected error occurred.");
        }
    }

    /// <inheritdoc />
    public async Task<ApiResponse<UserProfileResponse>> GetProfileAsync(Guid userAuthId)
    {
        try
        {
            var userAuth = await _unitOfWork.UserAuths.GetByIdAsync(userAuthId);
            if (userAuth == null)
            {
                return ApiResponse<UserProfileResponse>.Fail(
                    "USER_NOT_FOUND",
                    "User not found.");
            }

            var user = await _unitOfWork.Users
                .FirstOrDefaultAsync(u => u.Email == userAuth.Email);

            if (user == null)
            {
                return ApiResponse<UserProfileResponse>.Fail(
                    "PROFILE_NOT_FOUND",
                    "User profile not found.");
            }

            return ApiResponse<UserProfileResponse>.Ok(
                _mapper.Map<UserProfileResponse>(user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile: {UserAuthId}", userAuthId);
            return ApiResponse<UserProfileResponse>.Fail(
                "PROFILE_FETCH_FAILED",
                "An unexpected error occurred.");
        }
    }

    // ── Private Helpers ─────────────────────────────────────

    /// <inheritdoc />
    public async Task<ApiResponse<MessageResponse>> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var userAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (userAuth == null)
            {
                // Don't reveal if email exists
                return ApiResponse<MessageResponse>.Ok(new MessageResponse
                {
                    Message = $"If the email is registered, a password reset code has been sent to {normalizedEmail}."
                });
            }

            // Generate and store code
            var code = GenerateVerificationCode();
            var codeHash = HashVerificationCode(code);

            userAuth.VerificationCode = codeHash;
            userAuth.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(VerificationCodeExpiryMinutes);
            userAuth.VerificationCodeAttempts = 0;
            _unitOfWork.UserAuths.Update(userAuth);
            await _unitOfWork.SaveChangesAsync();

            await _emailService.SendPasswordResetCodeAsync(normalizedEmail, code);

            _logger.LogInformation("Password reset code sent to: {Email}", normalizedEmail);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = $"If the email is registered, a password reset code has been sent to {normalizedEmail}."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during forgot password: {Email}", request.Email);
            return ApiResponse<MessageResponse>.Fail("FORGOT_PASSWORD_FAILED", "An unexpected error occurred.");
        }
    }

    /// <inheritdoc />
    public async Task<ApiResponse<MessageResponse>> ResetPasswordAsync(ResetPasswordRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var userAuth = await _unitOfWork.UserAuths
                .FirstOrDefaultAsync(a => a.Email == normalizedEmail);

            if (userAuth == null)
            {
                return ApiResponse<MessageResponse>.Fail("INVALID_REQUEST", "Invalid email or code.");
            }

            // Check code expiry
            if (userAuth.VerificationCodeExpiresAt == null ||
                userAuth.VerificationCodeExpiresAt < DateTime.UtcNow)
            {
                return ApiResponse<MessageResponse>.Fail("CODE_EXPIRED", "Reset code has expired. Request a new one.");
            }

            // Check max attempts
            if (userAuth.VerificationCodeAttempts >= MaxVerificationAttempts)
            {
                return ApiResponse<MessageResponse>.Fail(
                    "TOO_MANY_ATTEMPTS",
                    $"Too many wrong attempts. Request a new code.");
            }

            // Verify code
            var codeHash = HashVerificationCode(request.Code);
            if (userAuth.VerificationCode != codeHash)
            {
                userAuth.VerificationCodeAttempts++;
                _unitOfWork.UserAuths.Update(userAuth);
                await _unitOfWork.SaveChangesAsync();

                var remaining = MaxVerificationAttempts - userAuth.VerificationCodeAttempts;
                return ApiResponse<MessageResponse>.Fail(
                    "INVALID_CODE",
                    $"Wrong code. {remaining} attempts remaining.");
            }

            // Update password
            userAuth.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, BcryptWorkFactor);
            userAuth.VerificationCode = null;
            userAuth.VerificationCodeExpiresAt = null;
            userAuth.VerificationCodeAttempts = 0;
            userAuth.FailedLoginAttempts = 0;
            userAuth.LockedUntil = null;
            _unitOfWork.UserAuths.Update(userAuth);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Password reset successfully: {Email}", normalizedEmail);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = "Password has been reset successfully. You can now log in."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset: {Email}", request.Email);
            return ApiResponse<MessageResponse>.Fail("RESET_FAILED", "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Generates a cryptographically secure 6-digit verification code.
    /// </summary>
    private static string GenerateVerificationCode()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var code = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1_000_000;
        return code.ToString("D6");
    }

    /// <summary>
    /// Hashes a verification code with SHA256 for secure storage.
    /// </summary>
    private static string HashVerificationCode(string code)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<MessageResponse>> ChangePasswordAsync(Guid userAuthId, ChangePasswordRequest request)
    {
        var userAuth = await _unitOfWork.UserAuths
            .FirstOrDefaultAsync(ua => ua.Id == userAuthId);

        if (userAuth == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "User not found.");

        // Verify current password
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, userAuth.PasswordHash))
            return ApiResponse<MessageResponse>.Fail("INVALID_PASSWORD", "Current password is incorrect.");

        // Ensure new password differs
        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, userAuth.PasswordHash))
            return ApiResponse<MessageResponse>.Fail("SAME_PASSWORD", "New password must be different from current password.");

        // Update password
        userAuth.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, BcryptWorkFactor);
        _unitOfWork.UserAuths.Update(userAuth);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Password changed for user {UserAuthId}", userAuthId);

        return ApiResponse<MessageResponse>.Ok(new MessageResponse
        {
            Message = "Password changed successfully."
        });
    }
}
