using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class Referral : BaseEntity
{
    [Required] public Guid ReferralLinkId { get; set; }
    [Required] public Guid ReferrerId { get; set; }
    [Required] public Guid RefereeId { get; set; }
    [Required] public Guid BusinessId { get; set; }
    [Required] public ReferralStatus Status { get; set; } = ReferralStatus.Pending;
    public DateTime? ActivatedAt { get; set; }
    public DateTime? QualifiedAt { get; set; }
    public DateTime? RewardedAt { get; set; }
    [Required] public DateTime ExpiresAt { get; set; }

    // Navigation
    public virtual ReferralLink ReferralLink { get; set; } = null!;
    public virtual User Referrer { get; set; } = null!;
    public virtual User Referee { get; set; } = null!;
    public virtual Business Business { get; set; } = null!;
}
