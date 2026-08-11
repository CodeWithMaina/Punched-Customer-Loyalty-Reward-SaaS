using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class ApiEventLog : BaseEntity
{
    public Guid? TenantId { get; set; }
    public Guid? UserId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Method { get; set; } = string.Empty;

    public int StatusCode { get; set; }
    public int DurationMs { get; set; }

    [MaxLength(100)]
    public string? ErrorCode { get; set; }
}
