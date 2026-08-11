using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class BusinessDailyAnalytics
{
    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    public int Stamps { get; set; }
    public int DistinctCustomers { get; set; }
    public int NewEnrollments { get; set; }
    public int Redemptions { get; set; }
    public decimal PayoutKes { get; set; }
    public decimal AccruedLiabilityKes { get; set; }
    public int RewardReadyCustomers { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
