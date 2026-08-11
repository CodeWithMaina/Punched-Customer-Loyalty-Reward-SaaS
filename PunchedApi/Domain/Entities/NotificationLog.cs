using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class NotificationLog : BaseEntity
{
    [Required]
    public Guid UserId { get; set; }

    public Guid? BusinessId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Channel { get; set; } = "email";

    [Required]
    [MaxLength(100)]
    public string TemplateType { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "sent";

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
    public DateTime? OpenedAt { get; set; }

    [MaxLength(500)]
    public string? Error { get; set; }
}
