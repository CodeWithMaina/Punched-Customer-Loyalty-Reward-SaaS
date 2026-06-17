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
