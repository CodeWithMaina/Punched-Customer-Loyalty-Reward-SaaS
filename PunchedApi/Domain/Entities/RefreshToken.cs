using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Refresh token entity for JWT token rotation.
/// Each token is single-use; on refresh a new one is issued and the old revoked.
/// </summary>
public class RefreshToken : BaseEntity
{
    /// <summary>
    /// FK to the UserAuth who owns this token.
    /// </summary>
    [Required]
    public Guid UserAuthId { get; set; }

    /// <summary>
    /// The hashed refresh token value.
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// When this refresh token expires (30 days from creation).
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Whether this token has been revoked (e.g., on logout or rotation).
    /// </summary>
    public bool IsRevoked { get; set; } = false;

    /// <summary>
    /// When the token was revoked. Null if still active.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The UserAuth this token belongs to.
    /// </summary>
    public virtual UserAuth UserAuth { get; set; } = null!;
}
