using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Stores idempotent request replays for stamp awarding / enroll-and-stamp.
/// A completed entry returns the stored response instead of re-executing the
/// operation. Entries expire after 24 hours.
/// </summary>
public class IdempotencyKey : BaseEntity
{
    /// <summary>The client-supplied Idempotency-Key header value (unique).</summary>
    [Required]
    [MaxLength(200)]
    public string Key { get; set; } = string.Empty;

    /// <summary>FK to the user that first issued the request (scope of uniqueness).</summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>SHA256 hex of the serialized request body — detects conflicting replays.</summary>
    [Required]
    [MaxLength(255)]
    public string RequestHash { get; set; } = string.Empty;

    /// <summary>Serialized ApiResponse JSON of the original response.</summary>
    [Required]
    public string ResponseJson { get; set; } = string.Empty;

    /// <summary>When this entry expires and may be cleaned up / ignored.</summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    public virtual User User { get; set; } = null!;
}
