using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Service for creating and querying in-app staff notifications.
/// </summary>
public interface INotificationsService
{
        Task CreateGoalReachedAsync(Guid userId, Guid? businessId, int stampsCount);
    Task CreateRewardReadyAsync(Guid userId, Guid? businessId);
    Task MarkReadAsync(Guid userId, Guid? notificationId = null);
    Task<List<NotificationDto>> GetAsync(Guid userId, bool unreadOnly, int limit = 50);

    /// <summary>Generic notification creation — used for customer-facing events (e.g. card adjustments).</summary>
    Task CreateAsync(Guid userId, Guid? businessId, string type, int stampsCount = 0);
}