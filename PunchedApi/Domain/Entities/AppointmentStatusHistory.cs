using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class AppointmentStatusHistory : BaseEntity
{
    [Required]
    public Guid AppointmentId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public Guid? ChangedByUserId { get; set; }

    [MaxLength(300)]
    public string? Note { get; set; }
}
