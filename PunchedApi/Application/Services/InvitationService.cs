using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Settings;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Application.Services;

/// <summary>
/// Implements the invitation-only staff onboarding lifecycle.
///
/// Security invariants enforced here:
///   • Business context is always derived from the authenticated owner (never a client id).
///   • Invitation tokens are cryptographically random and only hashed in storage.
///   • Accepted/revoked/expired invitations cannot be reused.
///   • Acceptance is locked to the invited email (ownership confirmed server-side).
///   • An existing account is never silently attached — ownership is a hard requirement.
/// </summary>
public class InvitationService : IInvitationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtTokenService _jwtService;
    private readonly IEmailService _emailService;
    private readonly PublicAppSettings _publicApp;
    private readonly ILogger<InvitationService> _logger;

    public InvitationService(
        IUnitOfWork unitOfWork,
        JwtTokenService jwtService,
        IEmailService emailService,
        IOptions<PublicAppSettings> publicApp,
        ILogger<InvitationService> logger)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _emailService = emailService;
        _publicApp = publicApp.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ApiResponse<StaffInvitationResponse>> CreateStaffInvitationAsync(
        Guid businessOwnerId, CreateStaffInvitationRequest request)
    {
        try
        {
            var business = await GetOwnedBusinessAsync(businessOwnerId);
            if (business == null)
                return ApiResponse<StaffInvitationResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var email = request.Email.Trim().ToLowerInvariant();

            // Prevent duplicate pending invitations for the same business+email.
            var existingPending = await _unitOfWork.StaffInvitations.FirstOrDefaultAsync(i =>
                i.BusinessId == business.Id && i.InvitedEmail == email && i.Status == InvitationStatus.Pending);

            if (existingPending != null)
            {
                _logger.LogWarning("Duplicate staff invitation attempt for {Email} at business {BusinessId}", email, business.Id);
                return ApiResponse<StaffInvitationResponse>.Fail(
                    "DUPLICATE_INVITATION",
                    "An invitation to this email is already pending.");
            }

            var token = GenerateToken();
            var invitation = new StaffInvitation
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                InvitedEmail = email,
                InvitingUserId = businessOwnerId,
                TokenHash = HashToken(token),
                Status = InvitationStatus.Pending,
                ExpiresAt = DateTime.UtcNow.AddDays(_publicApp.InvitationExpiryDays),
                ResendCount = 0,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                await _unitOfWork.StaffInvitations.AddAsync(invitation);
                await _unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Concurrent duplicate insert — the filtered unique index won.
                return ApiResponse<StaffInvitationResponse>.Fail(
                    "DUPLICATE_INVITATION",
                    "An invitation to this email is already pending.");
            }

            await SendInvitationEmailAsync(invitation, token);

            _logger.LogInformation("Staff invitation created by owner {Owner} for {Email} at business {Business}",
                businessOwnerId, email, business.Id);

            return ApiResponse<StaffInvitationResponse>.Ok(MapToResponse(invitation));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating staff invitation for owner {OwnerId}", businessOwnerId);
            return ApiResponse<StaffInvitationResponse>.Fail("CREATE_FAILED", "Failed to create the invitation.");
        }
    }
    /// <inheritdoc />
    public async Task<ApiResponse<List<StaffInvitationResponse>>> ListStaffInvitationsAsync(Guid businessOwnerId)
    {
        var business = await GetOwnedBusinessAsync(businessOwnerId);
        if (business == null)
            return ApiResponse<List<StaffInvitationResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var invitations = (await _unitOfWork.StaffInvitations.FindAsync(i => i.BusinessId == business.Id))
            .OrderByDescending(i => i.CreatedAt)
            .Select(MapToResponse)
            .ToList();

        return ApiResponse<List<StaffInvitationResponse>>.Ok(invitations);
    }

    /// <inheritdoc />
    public async Task<ApiResponse<StaffInvitationResponse>> ResendStaffInvitationAsync(Guid businessOwnerId, Guid invitationId)
    {
        var business = await GetOwnedBusinessAsync(businessOwnerId);
        if (business == null)
            return ApiResponse<StaffInvitationResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var invitation = await _unitOfWork.StaffInvitations.FirstOrDefaultAsync(i =>
            i.Id == invitationId && i.BusinessId == business.Id);

        if (invitation == null)
            return ApiResponse<StaffInvitationResponse>.Fail("NOT_FOUND", "Invitation not found.");

        if (invitation.Status != InvitationStatus.Pending)
            return ApiResponse<StaffInvitationResponse>.Fail("INVITATION_NOT_ACTIVE", "Only pending invitations can be re-sent.");

        // Rotate the token and refresh the expiry on every resend.
        var token = GenerateToken();
        invitation.TokenHash = HashToken(token);
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(_publicApp.InvitationExpiryDays);
        invitation.ResendCount += 1;
        _unitOfWork.StaffInvitations.Update(invitation);
        await _unitOfWork.SaveChangesAsync();

        await SendInvitationEmailAsync(invitation, token);

        _logger.LogInformation("Re-sent staff invitation {InvitationId} for {Email}", invitation.Id, invitation.InvitedEmail);
        return ApiResponse<StaffInvitationResponse>.Ok(MapToResponse(invitation));
    }

    /// <inheritdoc />
    public async Task<ApiResponse<MessageResponse>> RevokeStaffInvitationAsync(Guid businessOwnerId, Guid invitationId)
    {
        var business = await GetOwnedBusinessAsync(businessOwnerId);
        if (business == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var invitation = await _unitOfWork.StaffInvitations.FirstOrDefaultAsync(i =>
            i.Id == invitationId && i.BusinessId == business.Id);

        if (invitation == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "Invitation not found.");

        if (invitation.Status == InvitationStatus.Accepted)
            return ApiResponse<MessageResponse>.Fail("ALREADY_ACCEPTED", "This invitation has already been accepted and cannot be revoked.");

        if (invitation.Status != InvitationStatus.Revoked)
        {
            invitation.Status = InvitationStatus.Revoked;
            invitation.RevokedAt = DateTime.UtcNow;
            _unitOfWork.StaffInvitations.Update(invitation);
            await _unitOfWork.SaveChangesAsync();
        }

        _logger.LogInformation("Staff invitation {InvitationId} revoked by owner {Owner}", invitationId, businessOwnerId);
        return ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Invitation revoked." });
    }

    /// <inheritdoc />
    public async Task<ApiResponse<StaffInvitationValidationResponse>> ValidateStaffInvitationAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Invalid("INVALID_TOKEN", "This invitation link is invalid.");

        var hash = HashToken(token.Trim());
        var invitation = await _unitOfWork.StaffInvitations.FirstOrDefaultAsync(i => i.TokenHash == hash);

        if (invitation == null)
            return Invalid("INVALID_TOKEN", "This invitation link is invalid or has already been used.");

        var business = await _unitOfWork.Businesses.GetByIdAsync(invitation.BusinessId);

        if (invitation.Status == InvitationStatus.Revoked)
            return Invalid("REVOKED", "This invitation has been revoked.");

        if (invitation.Status == InvitationStatus.Accepted)
            return Invalid("ALREADY_USED", "This invitation has already been accepted.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
            return Invalid("EXPIRED", "This invitation has expired.");

        return ApiResponse<StaffInvitationValidationResponse>.Ok(new StaffInvitationValidationResponse
        {
            Valid = true,
            BusinessId = invitation.BusinessId,
            BusinessName = business?.Name ?? "the business",
            BusinessLogoUrl = business?.LogoUrl,
            Email = invitation.InvitedEmail,
            ExpiresAt = invitation.ExpiresAt
        });
    }
    /// <inheritdoc />
    public async Task<ApiResponse<AuthResponse>> AcceptStaffInvitationAsync(string token, AcceptStaffInvitationRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(token))
                return ApiResponse<AuthResponse>.Fail("INVALID_TOKEN", "This invitation link is invalid.");

            var invitation = await _unitOfWork.StaffInvitations.FirstOrDefaultAsync(i => i.TokenHash == HashToken(token.Trim()));

            if (invitation == null)
                return ApiResponse<AuthResponse>.Fail("INVALID_TOKEN", "This invitation link is invalid or has already been used.");

            if (invitation.Status == InvitationStatus.Revoked)
                return ApiResponse<AuthResponse>.Fail("REVOKED", "This invitation has been revoked.");

            if (invitation.Status == InvitationStatus.Accepted)
                return ApiResponse<AuthResponse>.Fail("ALREADY_USED", "This invitation has already been accepted.");

            if (invitation.ExpiresAt < DateTime.UtcNow)
                return ApiResponse<AuthResponse>.Fail("EXPIRED", "This invitation has expired.");

            // Acceptance is locked to the invited email — derived from the server-side record, never the client.
            var invitedEmail = invitation.InvitedEmail;
            if (!string.Equals(request.EmailConfirmation.Trim().ToLowerInvariant(), invitedEmail, StringComparison.OrdinalIgnoreCase))
                return ApiResponse<AuthResponse>.Fail("EMAIL_MISMATCH", "The email you confirmed does not match the invited address.");

            // Never attach an existing account without explicit ownership proof.
            var existingAuth = await _unitOfWork.UserAuths.FirstOrDefaultAsync(a => a.Email == invitedEmail);
            if (existingAuth != null)
            {
                var existingUser = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Email == invitedEmail);
                if (existingUser?.Role == UserRole.Staff && existingUser.StaffBusinessId == invitation.BusinessId)
                    return ApiResponse<AuthResponse>.Fail("ALREADY_STAFF", "You are already linked to this business as staff.");

                return ApiResponse<AuthResponse>.Fail(
                    "EMAIL_IN_USE",
                    "An account with this email already exists. Sign in with that account, or ask the business owner to invite a different address.");
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, 12);

            var userAuth = new UserAuth
            {
                Id = Guid.NewGuid(),
                Email = invitedEmail,
                PasswordHash = passwordHash,
                IsVerified = true,
                FailedLoginAttempts = 0,
                VerificationCode = null,
                VerificationCodeExpiresAt = null,
                VerificationCodeAttempts = 0,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            await _unitOfWork.UserAuths.AddAsync(userAuth);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = invitedEmail,
                FullName = request.FullName.Trim(),
                Role = UserRole.Staff,
                StaffBusinessId = invitation.BusinessId,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Users.AddAsync(user);

            invitation.Status = InvitationStatus.Accepted;
            invitation.AcceptedAt = DateTime.UtcNow;
            _unitOfWork.StaffInvitations.Update(invitation);

            // Issue tokens so the staff member is authenticated immediately.
            var accessToken = _jwtService.GenerateAccessToken(userAuth, user);
            var refreshTokenValue = _jwtService.GenerateRefreshToken();
            await _unitOfWork.RefreshTokens.AddAsync(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserAuthId = userAuth.Id,
                Token = refreshTokenValue,
                ExpiresAt = _jwtService.RefreshTokenExpiry,
                CreatedAt = DateTime.UtcNow
            });

            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Staff invitation {InvitationId} accepted for {Email} at business {Business}",
                invitation.Id, invitedEmail, invitation.BusinessId);

            return ApiResponse<AuthResponse>.Ok(new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                ExpiresIn = _jwtService.AccessTokenExpirySeconds,
                User = new UserProfileResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    Phone = user.PhoneNumber,
                    FullName = user.FullName,
                    AvatarUrl = user.AvatarUrl,
                    Role = user.Role,
                    CreatedAt = user.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting staff invitation");
            return ApiResponse<AuthResponse>.Fail("ACCEPT_FAILED", "Failed to accept the invitation. Please try again.");
        }
    }
    // ── Private helpers ─────────────────────────────────────

    private async Task<Business?> GetOwnedBusinessAsync(Guid ownerId)
        => await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);

    private async Task SendInvitationEmailAsync(StaffInvitation invitation, string token)
    {
        var url = $"{_publicApp.BaseUrl.TrimEnd('/')}/invitations/accept?token={token}";
        var business = await _unitOfWork.Businesses.GetByIdAsync(invitation.BusinessId);
        var businessName = business?.Name ?? "the business";

        try
        {
            var ok = await _emailService.SendStaffInvitationAsync(invitation.InvitedEmail, businessName, url, invitation.ExpiresAt);
            if (!ok) _logger.LogWarning("Email provider reported a failure sending invitation to {Email}", invitation.InvitedEmail);
        }
        catch (Exception ex)
        {
            // The invitation is persisted; an email delivery failure must not fail the enclosing action.
            _logger.LogWarning(ex, "Failed to send invitation email to {Email}", invitation.InvitedEmail);
        }
    }

    private static string GenerateToken()
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    private static string HashToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static StaffInvitationResponse MapToResponse(StaffInvitation i) => new()
    {
        Id = i.Id,
        BusinessId = i.BusinessId,
        Email = i.InvitedEmail,
        InvitedByUserId = i.InvitingUserId,
        Status = i.Status,
        StatusLabel = i.Status switch
        {
            InvitationStatus.Accepted => "Accepted",
            InvitationStatus.Revoked => "Revoked",
            _ => "Pending"
        },
        CreatedAt = i.CreatedAt,
        ExpiresAt = i.ExpiresAt,
        AcceptedAt = i.AcceptedAt,
        RevokedAt = i.RevokedAt,
        ResendCount = i.ResendCount,
        IsExpired = i.Status == InvitationStatus.Pending && i.ExpiresAt < DateTime.UtcNow
    };

    private static ApiResponse<StaffInvitationValidationResponse> Invalid(string code, string message)
        => ApiResponse<StaffInvitationValidationResponse>.Ok(new StaffInvitationValidationResponse
        {
            Valid = false,
            ErrorCode = code,
            ErrorMessage = message
        });
}