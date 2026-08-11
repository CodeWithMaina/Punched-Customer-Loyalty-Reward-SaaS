using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class StaffServiceAssignment : BaseEntity
{
    [Required]
    public Guid StaffUserId { get; set; }

    [Required]
    public Guid ServiceCatalogItemId { get; set; }

    [Required]
    public Guid BusinessId { get; set; }
}
