using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class StaffShift : BaseEntity
{
    [Required]
    public Guid StaffUserId { get; set; }

    [Required]
    public Guid BusinessId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Range(0, 23)]
    public int StartHour { get; set; }

    [Range(0, 23)]
    public int EndHour { get; set; }

    public bool IsWorking { get; set; } = true;
}
