using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class Appointment : BaseEntity
{
    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    public Guid? StaffUserId { get; set; }

    [Required]
    public DateTime ScheduledAt { get; set; }

    [Required]
    public DateTime EndAt { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "booked";

    public ICollection<AppointmentResource> Resources { get; set; } = new List<AppointmentResource>();
}
