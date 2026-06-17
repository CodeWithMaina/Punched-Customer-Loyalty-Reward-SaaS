using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class ReferralLink : BaseEntity
{
    [Required] public Guid ReferrerId { get; set; }
    [Required] public Guid BusinessId { get; set; }
    [Required][MaxLength(12)] public string Code { get; set; } = string.Empty;
    [Required][Range(0, 10000)] public int SuccessfulReferrals { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual User Referrer { get; set; } = null!;
    public virtual Business Business { get; set; } = null!;
    public virtual ICollection<Referral> Referrals { get; set; } = new List<Referral>();
}
