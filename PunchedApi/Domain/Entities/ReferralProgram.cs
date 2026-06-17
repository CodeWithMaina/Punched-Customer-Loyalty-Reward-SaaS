using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class ReferralProgram : BaseEntity
{
    [Required] public Guid BusinessId { get; set; }
    [Required][Range(1, 100)] public int ReferralsRequired { get; set; } = 1;
    [Required] public ReferralRewardType RewardType { get; set; } = ReferralRewardType.Stamp;
    [Required] public decimal RewardValue { get; set; }
    [Required][MaxLength(200)] public string RewardDescription { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    [Required][Range(1, 365)] public int ExpirationDays { get; set; } = 30;

    // Navigation
    public virtual Business Business { get; set; } = null!;
}
