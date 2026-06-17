using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Rotating QR token used for stamp verification.
/// Each token expires after 30-60 seconds and can only be used once.
/// The raw token is only held in-app; only the hash is stored in the database.
/// </summary>
public class QrToken : BaseEntity
{
    /// <summary>
    /// FK to the customer who requested the QR code.
    /// </summary>
    [Required]
    public Guid CustomerId { get; set; }

    /// <summary>
    /// FK to the business this QR code is for.
    /// </summary>
    [Required]
    public Guid BusinessId { get; set; }

    /// <summary>
    /// SHA256 hash of the raw token. The raw value is only in the QR image.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// When this token expires (30-60 seconds from creation).
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Whether this token has already been used to award a stamp.
    /// </summary>
    public bool IsUsed { get; set; } = false;

    // ── Navigation ──────────────────────────────────────────
    // No FK to LoyaltyCard; uses CustomerId + BusinessId to find card at scan time.
}
