using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class StaffDailyAnalytics
{
    [Required]
    public Guid StaffUserId { get; set; }

    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    public int Stamps { get; set; }
    public int DistinctCustomers { get; set; }
    public int NewCustomers { get; set; }
    public int RewardReadyCreated { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
