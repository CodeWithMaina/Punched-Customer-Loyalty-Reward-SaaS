using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class CustomerSegment
{
    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    [MaxLength(30)]
    public string Segment { get; set; } = "active";

    public int Score { get; set; }
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastStampAt { get; set; }
}
