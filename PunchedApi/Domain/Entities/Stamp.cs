using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Immutable audit log entry for a stamp award.
/// Each stamp is linked to a LoyaltyCard and a QrToken.
/// Stamps are never updated or soft-deleted (immutable record).
/// </summary>
public class Stamp : BaseEntity
{
    /// <summary>
    /// FK to the LoyaltyCard this stamp belongs to.
    /// </summary>
    [Required]
    public Guid CardId { get; set; }

    /// <summary>
    /// Sequential stamp number on this card (1st, 2nd, 3rd, etc.).
    /// </summary>
    [Required]
    [Range(1, 100)]
    public short StampNumber { get; set; }

    /// <summary>
    /// UTC timestamp when this stamp was awarded.
    /// </summary>
    [Required]
    public DateTime StampedAt { get; set; }

    /// <summary>
    /// FK to the QR token that was scanned to award this stamp.
    /// Nullable for system-generated stamps (e.g. welcome stamps granted on
    /// enrollment, which are not tied to a QR scan). Each QR token can only
    /// produce one stamp (partial unique constraint — PostgreSQL allows
    /// multiple NULLs, so system stamps are not constrained).
    /// </summary>
    public Guid? QrTokenId { get; set; }

    /// <summary>
    /// FK to the Business or Staff user who awarded this stamp.
    /// Nullable so existing records before attribution are preserved.
    /// </summary>
    public Guid? AwardedByUserId { get; set; }

    /// <summary>
    /// Origin of this stamp: "scan" (awarded via QR token) or "enrollment"
    /// (welcome stamp granted when a customer enrolled). Null for legacy records.
    /// </summary>
    [MaxLength(20)]
    public string? Source { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The loyalty card this stamp is recorded on.
    /// </summary>
    public virtual LoyaltyCard Card { get; set; } = null!;
}
