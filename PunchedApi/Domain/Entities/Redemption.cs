using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Represents a reward payout/redemption.
/// Status flows: pending → processing → completed | failed.
/// Contains a snapshot of the reward value at claim time.
/// </summary>
public class Redemption : BaseEntity
{
    /// <summary>
    /// FK to the LoyaltyCard this redemption is for.
    /// </summary>
    [Required]
    public Guid CardId { get; set; }

    /// <summary>
    /// FK to the Business paying the reward.
    /// </summary>
    [Required]
    public Guid BusinessId { get; set; }

    /// <summary>
    /// Snapshot of the reward value in KES at claim time.
    /// </summary>
    [Required]
    public decimal RewardValue { get; set; }

    /// <summary>
    /// Redemption status: "pending", "processing", "completed", "failed".
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    /// <summary>
    /// M-Pesa transaction reference ID. Null until M-Pesa confirms.
    /// </summary>
    [MaxLength(100)]
    public string? MpesaRef { get; set; }

    /// <summary>
    /// UTC timestamp when the reward was claimed.
    /// </summary>
    [Required]
    public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp when M-Pesa payment was confirmed. Null until paid.
    /// </summary>
    public DateTime? PaidAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The loyalty card this redemption belongs to.
    /// </summary>
    public virtual LoyaltyCard Card { get; set; } = null!;

    /// <summary>
    /// The business paying the reward.
    /// </summary>
    public virtual Business Business { get; set; } = null!;
}
