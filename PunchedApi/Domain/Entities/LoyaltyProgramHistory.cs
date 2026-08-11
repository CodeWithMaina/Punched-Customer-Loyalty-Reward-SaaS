using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class LoyaltyProgramHistory : BaseEntity
{
    [Required]
    public Guid LoyaltyProgramId { get; set; }

    public int StampsRequired { get; set; }
    public decimal RewardValue { get; set; }

    [Required]
    [MaxLength(200)]
    public string RewardDescription { get; set; } = string.Empty;

    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public Guid? ChangedByUserId { get; set; }
}
