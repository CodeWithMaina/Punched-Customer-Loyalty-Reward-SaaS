using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Defines a loyalty program for a business.
/// A business can have multiple programs (each with a unique name).
/// </summary>
public class LoyaltyProgram : BaseEntity
{
    /// <summary>
    /// FK to the Business that owns this program.
    /// </summary>
    [Required]
    public Guid BusinessId { get; set; }

    /// <summary>
    /// Display name for this program (e.g. "Coffee Rewards", "VIP Club").
    /// Max 100 characters.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = "Loyalty Program";

    /// <summary>
    /// Whether this program is currently accepting new stamps.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Number of stamps required to earn a reward (1-100).
    /// </summary>
    [Required]
    [Range(1, 100)]
    public int StampsRequired { get; set; }

    /// <summary>
    /// Monetary value of the reward in KES (e.g., 500).
    /// </summary>
    [Required]
    public decimal RewardValue { get; set; }

    /// <summary>
    /// Human-readable reward description (e.g., "Free Coffee", "20% Discount").
    /// Max 200 characters.
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string RewardDescription { get; set; } = string.Empty;

    /// <summary>
    /// Hours a customer has to claim their reward after completing all stamps.
    /// 0 means no expiration. Default: 48 hours.
    /// </summary>
    [Range(0, 8760)] // 0 = no expiry, max 1 year
    public int RewardExpirationHours { get; set; } = 48;

    /// <summary>
    /// Number of stamps a new customer receives automatically upon enrolling
    /// in this program. Configured per program so different businesses can
    /// offer different welcome bonuses. 0 means no welcome stamps.
    /// A welcome-stamp ledger entry is recorded on enrollment.
    /// </summary>
    [Range(0, 100)]
    public int DefaultEnrollmentStamps { get; set; } = 0;

    /// <summary>
    /// Optional number of days after which stamps on cards in this program expire.
    /// Null means stamps never expire (current behavior).
    /// </summary>
    public int? StampExpiryDays { get; set; }

    /// <summary>
    /// Maximum stamps that can be awarded in a single visit/scan. Must be ≥ 1.
    /// </summary>
    [Range(1, 100)]
    public int MaxStampsPerVisit { get; set; } = 1;

    /// <summary>
    /// Optional human-readable description shown on the details page and to customers.
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Lifecycle status: Draft / Active / Paused / Archived.
    /// Backward compatible — <see cref="IsActive"/> remains the persisted flag
    /// used by the stamping pipeline and is kept in sync with this value at the
    /// service layer (<c>Status == Active → IsActive == true</c>).
    /// </summary>
    public ProgramStatus Status { get; set; } = ProgramStatus.Active;

    /// <summary>
    /// Earning model key — one of <see cref="ProgramTypes"/> (default "stamp").
    /// Legacy programs store nothing here and keep the classic stamp behaviour.
    /// </summary>
    [MaxLength(20)]
    public string ProgramType { get; set; } = ProgramTypes.Stamp;

    /// <summary>
    /// Structured, extensible program configuration serialised as JSON
    /// (<see cref="PunchedApi.Application.Programs.ProgramConfig"/>).
    /// Null/empty for legacy programs, which the rule engine describes from the
    /// scalar columns.
    /// </summary>
    public string? ConfigJson { get; set; }

    /// <summary>Optional start date for the program's active window (travel time).</summary>
    public DateTime? StartsAt { get; set; }

    /// <summary>Optional end date for the program's active window.</summary>
    public DateTime? EndsAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The business this program belongs to.
    /// </summary>
    public virtual Business Business { get; set; } = null!;

    /// <summary>
    /// Loyalty cards enrolled in this program.
    /// </summary>
    public virtual ICollection<LoyaltyCard> LoyaltyCards { get; set; } = new List<LoyaltyCard>();
}
