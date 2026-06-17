using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// User profile entity. Contains identity and display information.
/// Linked 1:1 with UserAuth via email.
/// A user can have many LoyaltyCards and Redemptions.
/// </summary>
public class User : BaseEntity
{
    /// <summary>
    /// Email address matching UserAuth.Email for 1:1 lookup.
    /// </summary>
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Optional phone number in E.164 format (e.g., +254712345678).
    /// </summary>
    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// User's display name (1-100 characters).
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Optional avatar/profile image URL.
    /// </summary>
    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Optional date of birth. Stored as UTC date only.
    /// </summary>
    public DateOnly? DateOfBirth { get; set; }

    /// <summary>
    /// Optional gender identifier (e.g. "Male", "Female", "Non-binary", "Prefer not to say").
    /// </summary>
    [MaxLength(50)]
    public string? Gender { get; set; }

    /// <summary>
    /// The role of the user: Customer, Business, or Staff.
    /// Defaults to Customer.
    /// </summary>
    [Required]
    public UserRole Role { get; set; } = UserRole.Customer;

    /// <summary>
    /// For Staff users: the Business they are linked to.
    /// Null for Customer and Business roles.
    /// </summary>
    public Guid? StaffBusinessId { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// 1:1 relationship with UserAuth credentials.
    /// </summary>
    public virtual UserAuth? Auth { get; set; }

    /// <summary>
    /// Loyalty cards this user is enrolled in.
    /// </summary>
    public virtual ICollection<LoyaltyCard> LoyaltyCards { get; set; } = new List<LoyaltyCard>();

    /// <summary>
    /// Reward redemptions made by this user.
    /// </summary>
    public virtual ICollection<Redemption> Redemptions { get; set; } = new List<Redemption>();
}
