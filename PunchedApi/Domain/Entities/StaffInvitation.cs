using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Lifecycle state of a staff invitation.
/// Invitations start Pending and move to Accepted or Revoked.
/// An invitation is considered Expired once its ExpiresAt passes while still Pending.
/// </summary>
public enum InvitationStatus
{
    /// <summary>Created and awaiting the invitee.</summary>
    Pending = 0,

    /// <summary>Accepted by the invitee (a staff account was created/linked).</summary>
    Accepted = 1,

    /// <summary>Explicitly revoked by an authorized business user.</summary>
    Revoked = 2,
}

/// <summary>
/// A staff invitation issued by a business owner/authorized manager.
/// Enables invitation-only staff onboarding — there is no public staff registration flow.
/// Only a hashed representation of the secret token is stored.
/// </summary>
public class StaffInvitation : BaseEntity
{
    /// <summary>
    /// FK to the Business that issued this invitation.
    /// All authorization resolves the business from the authenticated user, never from the client.
    /// </summary>
    [Required]
    public Guid BusinessId { get; set; }

    /// <summary>
    /// Lowercased email of the invited staff member. This is the primary onboarding identifier,
    /// and acceptance is restricted to this address.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string InvitedEmail { get; set; } = string.Empty;

    /// <summary>
    /// FK to the User who created the invitation (the inviter).
    /// </summary>
    [Required]
    public Guid InvitingUserId { get; set; }

    /// <summary>
    /// SHA-256 hash of the secure random invitation token. The plaintext token is only ever
    /// present in the invitation link sent by email and never stored.
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// Current lifecycle status.
    /// </summary>
    [Required]
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;

    /// <summary>
    /// UTC time after which this invitation can no longer be accepted.
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// UTC time the invitation was accepted, if any.
    /// </summary>
    public DateTime? AcceptedAt { get; set; }

    /// <summary>
    /// UTC time the invitation was revoked, if any.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// How many times the invitation email has been re-sent.
    /// </summary>
    public int ResendCount { get; set; }

        // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The business this invitation grants access to.
    /// </summary>
    public virtual Business? Business { get; set; }

    /// <summary>
    /// The user who created the invitation (the inviter / business owner).
    /// Enforces referential integrity: an invitation can only be created
    /// by an existing user in the system.
    /// </summary>
    public virtual User? InvitingUser { get; set; }
}