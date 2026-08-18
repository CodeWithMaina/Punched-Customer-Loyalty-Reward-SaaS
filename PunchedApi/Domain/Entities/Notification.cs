using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// In-app notification for a staff user (e.g. daily goal reached, reward ready).
/// </summary>
public class Notification : BaseEntity
{
    /// <summary>The staff user who receives this notification.</summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>The business context (nullable for platform-wide notifications).</summary>
    public Guid? BusinessId { get; set; }

    /// <summary>Notification type: "GoalReached" or "RewardReady".</summary>
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    /// <summary>Stamp count associated with the notification (e.g. stamps to reach goal).</summary>
    public int StampsCount { get; set; }

    /// <summary>Whether the user has dismissed/read this notification.</summary>
    public bool IsRead { get; set; } = false;
}