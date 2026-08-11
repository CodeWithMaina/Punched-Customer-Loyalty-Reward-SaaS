using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class ServiceCatalogItem : BaseEntity
{
    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public int DurationMinutes { get; set; }
    public decimal? Price { get; set; }

    public bool IsActive { get; set; } = true;
}
