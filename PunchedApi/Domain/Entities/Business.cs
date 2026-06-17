using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Business entity representing a merchant on the platform.
/// Each business can have one loyalty program (MVP constraint).
/// </summary>
public class Business : BaseEntity
{
    /// <summary>
    /// Business display name (1-100 characters).
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Business category: restaurant, salon, gym, cafe, etc.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Business location (City, County).
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;

    /// <summary>
    /// Business contact phone number.
    /// </summary>
    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Business contact email address.
    /// </summary>
    [MaxLength(255)]
    [EmailAddress]
    public string? Email { get; set; }

    /// <summary>
    /// Business description text.
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// URL to the business logo image.
    /// </summary>
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    /// <summary>
    /// M-Pesa paybill or till number for reward payouts.
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string MpesaNumber { get; set; } = string.Empty;

    /// <summary>
    /// FK to the User who owns/manages this business.
    /// </summary>
    public Guid? OwnerId { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// All loyalty programs for this business.
    /// </summary>
    public virtual ICollection<LoyaltyProgram> LoyaltyPrograms { get; set; } = new List<LoyaltyProgram>();

    /// <summary>
    /// The referral program for this business (one per business).
    /// </summary>
    public virtual ReferralProgram? ReferralProgram { get; set; }

    /// <summary>
    /// All loyalty cards enrolled at this business.
    /// </summary>
    public virtual ICollection<LoyaltyCard> LoyaltyCards { get; set; } = new List<LoyaltyCard>();

    /// <summary>
    /// All stamps awarded at this business.
    /// </summary>
    public virtual ICollection<Stamp> Stamps { get; set; } = new List<Stamp>();

    /// <summary>
    /// All reward redemptions at this business.
    /// </summary>
    public virtual ICollection<Redemption> Redemptions { get; set; } = new List<Redemption>();

    /// <summary>
    /// The user who owns this business.
    /// </summary>
    public virtual User? Owner { get; set; }
}
