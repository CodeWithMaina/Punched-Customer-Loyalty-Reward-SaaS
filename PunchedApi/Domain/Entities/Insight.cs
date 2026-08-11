using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

public class Insight : BaseEntity
{
    [Required]
    [MaxLength(20)]
    public string Audience { get; set; } = "business";

    public Guid? BusinessId { get; set; }

    [Required]
    [MaxLength(80)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Metric { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Severity { get; set; } = "LOW";

    [Required]
    [MaxLength(10)]
    public string Confidence { get; set; } = "MEDIUM";

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Recommendation { get; set; } = string.Empty;

    public string DataJson { get; set; } = "{}";

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public bool Dismissed { get; set; }
    public DateTime? DismissedAt { get; set; }
    public Guid? DismissedBy { get; set; }
}
