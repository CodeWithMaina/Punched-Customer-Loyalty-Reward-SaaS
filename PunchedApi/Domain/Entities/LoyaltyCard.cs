using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Represents a customer's enrollment in a business's loyalty program.
/// Tracks stamp progress, lifetime stamps, and redemption count.
/// Unique constraint: one card per customer per business.
/// </summary>
public class LoyaltyCard : BaseEntity
{
    /// <summary>
    /// FK to the customer (User) who enrolled.
    /// </summary>
    [Required]
    public Guid CustomerId { get; set; }

    /// <summary>
    /// FK to the Business where the card is enrolled.
    /// </summary>
    [Required]
    public Guid BusinessId { get; set; }

    /// <summary>
    /// FK to the LoyaltyProgram at time of enrollment (snapshot).
    /// </summary>
    [Required]
    public Guid ProgramId { get; set; }

    /// <summary>
    /// Current stamp count toward the next reward (resets after redemption). Range: 0-100.
    /// </summary>
    [Required]
    [Range(0, 100)]
    public int TotalStamps { get; set; } = 0;

    /// <summary>
    /// Lifetime stamp count (never resets). Range: 0-999.
    /// </summary>
    [Required]
    [Range(0, 999)]
    public int LifetimeStamps { get; set; } = 0;

    /// <summary>
    /// Total number of reward redemptions claimed. Range: 0-99.
    /// </summary>
    [Required]
    [Range(0, 99)]
    public int TotalRedemptions { get; set; } = 0;

    /// <summary>
    /// Timestamp of the last stamp awarded. Null if no stamps yet.
    /// </summary>
    public DateTime? LastStampAt { get; set; }

    /// <summary>
    /// Timestamp when the customer enrolled in the program.
    /// </summary>
    [Required]
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the current reward expires. Set when stamps reach StampsRequired.
    /// Null if no active reward or program has no expiration.
    /// </summary>
    public DateTime? RewardExpiresAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The customer who owns this card.
    /// </summary>
    public virtual User Customer { get; set; } = null!;

    /// <summary>
    /// The business this card is for.
    /// </summary>
    public virtual Business Business { get; set; } = null!;

    /// <summary>
    /// The loyalty program terms at enrollment.
    /// </summary>
    public virtual LoyaltyProgram Program { get; set; } = null!;

    /// <summary>
    /// All stamps awarded on this card (immutable audit log).
    /// </summary>
    public virtual ICollection<Stamp> Stamps { get; set; } = new List<Stamp>();

    /// <summary>
    /// All redemptions claimed on this card.
    /// </summary>
    public virtual ICollection<Redemption> Redemptions { get; set; } = new List<Redemption>();
}
