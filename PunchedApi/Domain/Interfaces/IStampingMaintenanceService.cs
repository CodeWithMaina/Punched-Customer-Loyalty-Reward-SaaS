using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Stamping-ecosystem background maintenance jobs:
/// win-back nudges for inactive customers and stamp-expiry resets.
/// All notifications dedupe through NotificationLog so they never repeat.
/// </summary>
public interface IStampingMaintenanceService
{
    /// <summary>
    /// Sends one win-back nudge to customers whose last stamp is at least
    /// <paramref name="winBackDays"/> days old. Deduped per (user, business).
    /// Returns the number of nudges sent.
    /// </summary>
    Task<int> SendWinBackNotificationsAsync(int winBackDays, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resets TotalStamps on cards whose program has StampExpiryDays set and whose
    /// LastStampAt + StampExpiryDays is in the past. Never touches LifetimeStamps.
    /// Notifies each affected customer once. Returns the number of cards expired.
    /// </summary>
    Task<int> ExpireStampsAsync(CancellationToken cancellationToken = default);
}
