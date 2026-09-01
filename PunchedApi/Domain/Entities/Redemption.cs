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
    /// FK to the user that performed this redemption action.
    /// Null for historical/system-generated records where actor is unknown.
    /// </summary>
    public Guid? PerformedByUserId { get; set; }

    /// <summary>
    /// Actor role at time of action (e.g., Customer, Staff, Business, System).
    /// Null for unattributed historical records.
    /// </summary>
    [MaxLength(20)]
    public string? PerformedByRole { get; set; }

    /// <summary>
    /// Snapshot of the reward value in KES at claim time.
    /// </summary>
    [Required]
    public decimal RewardValue { get; set; }

    /// <summary>
    /// Redemption lifecycle status: Pending → Fulfilled | Cancelled.
    /// Replaces the legacy free-text status column.
    /// </summary>
    [Required]
    public RedemptionStatus Status { get; set; } = RedemptionStatus.Pending;

    /// <summary>FK to the Business/Staff user that fulfilled this redemption. Null until fulfilled.</summary>
    public Guid? FulfilledByUserId { get; set; }

    /// <summary>UTC timestamp when the business fulfilled the reward at the counter.</summary>
    public DateTime? FulfilledAt { get; set; }

    /// <summary>SHA256 hash of the 6-char fulfilment code. The plaintext is only shown once to the customer.</summary>
    [MaxLength(255)]
    public string? FulfilmentCodeHash { get; set; }

    /// <summary>
    /// Payout lifecycle state (distinct from the reward-fulfillment Status):
    /// pending → processing → completed | failed.
    /// </summary>
    [MaxLength(20)]
    public string? PayoutStatus { get; set; }

    /// <summary>Number of wrong fulfilment-code attempts so far. >= 5 locks the code.</summary>
    public int FailedAttempts { get; set; }

    /// <summary>True once 5 wrong fulfilment-code attempts have locked this redemption.</summary>
    public bool CodeLocked { get; set; }

    /// <summary>Number of stamps consumed at claim — restorable on cancellation.</summary>
    public int StampsConsumed { get; set; }

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

    /// <summary>
    /// UTC timestamp when payout processing was started.
    /// </summary>
    public DateTime? ProcessingStartedAt { get; set; }

    /// <summary>
    /// Retry counter for payout attempts.
    /// </summary>
    public int RetryCount { get; set; }

    /// <summary>
    /// UTC timestamp when this redemption is eligible for the next retry.
    /// </summary>
    public DateTime? NextRetryAt { get; set; }

    /// <summary>
    /// Worker identifier used to claim processing ownership.
    /// </summary>
    [MaxLength(100)]
    public string? ProcessingWorkerId { get; set; }

    /// <summary>
    /// Last payout failure reason when status is failed.
    /// </summary>
    [MaxLength(500)]
    public string? FailureReason { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The loyalty card this redemption belongs to.
    /// </summary>
    public virtual LoyaltyCard Card { get; set; } = null!;

    /// <summary>
    /// The business paying the reward.
    /// </summary>
    public virtual Business Business { get; set; } = null!;

    /// <summary>
    /// The user who performed this redemption action.
    /// </summary>
    public virtual User? PerformedByUser { get; set; }

    /// <summary>The Business/Staff user that fulfilled this reward at the counter.</summary>
    public virtual User? FulfilledByUser { get; set; }
}
