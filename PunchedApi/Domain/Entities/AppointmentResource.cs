using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Immutable snapshot of a service at the moment an appointment is booked,
/// so later catalog edits cannot change a confirmed appointment's duration/price.
/// </summary>
public class AppointmentResource : BaseEntity
{
    [Required] public Guid AppointmentId { get; set; }
    [Required] public Guid ServiceCatalogItemId { get; set; }
    [Required] [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [Required] public int DurationMinutes { get; set; }
    [Required] public decimal Price { get; set; }
    public int SortOrder { get; set; } = 0;
}