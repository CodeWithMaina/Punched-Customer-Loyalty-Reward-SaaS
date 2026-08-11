using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class Review : BaseEntity
{
    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    public Guid? StaffUserId { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(500)]
    public string? Comment { get; set; }
}
