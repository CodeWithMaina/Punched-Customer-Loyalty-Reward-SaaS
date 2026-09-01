using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Immutable audit record of a manual stamp counter adjustment made by a
/// business owner (delta ≠ 0). LifetimeStamps is never touched by adjustments.
/// </summary>
public class StampAdjustment : BaseEntity
{
    /// <summary>FK to the LoyaltyCard whose counter was adjusted.</summary>
    [Required]
    public Guid CardId { get; set; }

    /// <summary>FK to the Business user who made the adjustment. Null if the user was deleted.</summary>
    public Guid? AdjustedByUserId { get; set; }

    /// <summary>Role of the adjusting actor at adjustment time (e.g. "Business").</summary>
    [Required]
    [MaxLength(20)]
    public string AdjustedByRole { get; set; } = string.Empty;

    /// <summary>Positive or negative stamp delta. Never zero (CHECK constraint).</summary>
    [Required]
    public int Delta { get; set; }

    /// <summary>Why the adjustment was made.</summary>
    public StampAdjustmentReason Reason { get; set; }

    /// <summary>Free-form note (max 500 chars). Optional.</summary>
    [MaxLength(500)]
    public string? Note { get; set; }

    /// <summary>Optional FK to the Stamp row that this adjustment voids/corrects.</summary>
    public Guid? RelatedStampId { get; set; }

    // ── Navigation ──────────────────────────────────────────
    public virtual LoyaltyCard Card { get; set; } = null!;
    public virtual User? AdjustedByUser { get; set; }
}
