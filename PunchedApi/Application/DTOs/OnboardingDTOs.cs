using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  ONBOARDING REQUEST DTOs
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// Combined business owner + business registration request.
/// Creates the UserAuth + Business-role User + Business atomically.
/// Account fields + the minimum business information required to stand up a business.
/// </summary>
public class RegisterBusinessRequest
{
    // ── Owner account ───────────────────────────────────────
    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    // ── Business information ────────────────────────────────
    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("businessCategory")]
    public string BusinessCategory { get; set; } = string.Empty;

    [JsonPropertyName("businessLocation")]
    public string BusinessLocation { get; set; } = string.Empty;

    [JsonPropertyName("businessPhone")]
    public string? BusinessPhone { get; set; }

    [JsonPropertyName("businessEmail")]
    public string? BusinessEmail { get; set; }

    [JsonPropertyName("businessMpesaNumber")]
    public string BusinessMpesaNumber { get; set; } = string.Empty;

    [JsonPropertyName("businessDescription")]
    public string? BusinessDescription { get; set; }

    [JsonPropertyName("logoUrl")]
    public string? LogoUrl { get; set; }
}

/// <summary>
/// POST /v1/auth/register-business response — mirrors the standard
/// registration response (a verification code is sent, then the user
/// verifies via the existing flow which issues tokens).
/// </summary>
public class RegisterBusinessResponse
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("business")]
    public BusinessResponse? Business { get; set; }
}

/// <summary>
/// POST /v1/businesses/me/staff/invitations — request body.
/// The invited email address is the primary onboarding identifier.
/// </summary>
public class CreateStaffInvitationRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// Response describing a single staff invitation for the business management UI.
/// Never includes the plaintext token — only the lifecycle fields.
/// </summary>
public class StaffInvitationResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("invitedByUserId")]
    public Guid InvitedByUserId { get; set; }

    [JsonPropertyName("status")]
    public InvitationStatus Status { get; set; }

    [JsonPropertyName("statusLabel")]
    public string StatusLabel { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("acceptedAt")]
    public DateTime? AcceptedAt { get; set; }

    [JsonPropertyName("revokedAt")]
    public DateTime? RevokedAt { get; set; }

    [JsonPropertyName("resendCount")]
    public int ResendCount { get; set; }

    [JsonPropertyName("isExpired")]
    public bool IsExpired { get; set; }
}

/// <summary>
/// GET /v1/invitations/{token} — safe public validation result shown on
/// the invitation acceptance page before the invitee submits any credentials.
/// </summary>
public class StaffInvitationValidationResponse
{
    [JsonPropertyName("valid")]
    public bool Valid { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("businessName")]
    public string BusinessName { get; set; } = string.Empty;

    [JsonPropertyName("businessLogoUrl")]
    public string? BusinessLogoUrl { get; set; }

    /// <summary>
    /// The email this invitation was sent to (lowercased). Acceptance is locked to it.
    /// </summary>
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// POST /v1/invitations/{token}/accept — body supplied by the invitee.
/// Critical values (business, role, email) are derived server-side from the token, not the client.
/// </summary>
public class AcceptStaffInvitationRequest
{
    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// The invitee confirms they are the person invited by typing/confirming the invited email.
    /// Must match the email stored on the invitation.
    /// </summary>
    [JsonPropertyName("emailConfirmation")]
    public string EmailConfirmation { get; set; } = string.Empty;
}