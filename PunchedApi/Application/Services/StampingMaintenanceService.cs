using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Implements the stamping-ecosystem background jobs (win-back nudges, stamp expiry).
/// Every notification is deduped via NotificationLog (per user + business + template)
/// so a job can be re-run safely without ever notifying the same customer twice.
/// </summary>
public class StampingMaintenanceService : IStampingMaintenanceService
{
    private const string WinBackTemplate = "WinBackNudge";
    private const string ExpiryTemplate = "StampExpiry";

    private readonly ApplicationDbContext _context;
    private readonly ILogger<StampingMaintenanceService> _logger;

    public StampingMaintenanceService(ApplicationDbContext context, ILogger<StampingMaintenanceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<int> SendWinBackNotificationsAsync(int winBackDays, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(-winBackDays);

        // Customers with no stamp on or before the cutoff (LastStampAt, falling back
        // to EnrolledAt for cards that never received a stamp).
        var candidates = await _context.LoyaltyCards
            .Include(c => c.Program)
            .Where(c => c.TotalStamps > 0
                && (c.LastStampAt ?? c.EnrolledAt) <= cutoff)
            .Select(c => new
            {
                c.Id,
                c.CustomerId,
                c.BusinessId,
                c.TotalStamps,
                RewardDescription = c.Program.RewardDescription,
                c.Program.StampsRequired
            })
            .ToListAsync(cancellationToken);

        var sent = 0;
        foreach (var card in candidates)
        {
            // Dedupe: one win-back nudge per customer per business, ever.
            var alreadySent = await _context.NotificationLogs
                .AnyAsync(n => n.UserId == card.CustomerId
                    && n.BusinessId == card.BusinessId
                    && n.TemplateType == WinBackTemplate, cancellationToken);
            if (alreadySent)
                continue;

            await CreateNudgeAsync(card.CustomerId, card.BusinessId, WinBackTemplate,
                "WinBackNudge", Math.Max(1, card.StampsRequired - card.TotalStamps), now, cancellationToken);
            sent++;
        }

        _logger.LogInformation(
            "Win-back run complete. Candidates={Candidates}, NudgesSent={Sent}, WinBackDays={Days}",
            candidates.Count, sent, winBackDays);
        return sent;
    }

    private async Task CreateNudgeAsync(Guid customerId, Guid? businessId, string templateType,
        string notificationType, int stampsCount, DateTime now, CancellationToken ct)
    {
        await _context.Notifications.AddAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = customerId,
            BusinessId = businessId,
            Type = notificationType,
            StampsCount = stampsCount,
            IsRead = false,
            CreatedAt = now
        }, ct);
        await _context.NotificationLogs.AddAsync(new NotificationLog
        {
            Id = Guid.NewGuid(),
            UserId = customerId,
            BusinessId = businessId,
            Channel = "in_app",
            TemplateType = templateType,
            Status = "sent",
            SentAt = now,
            CreatedAt = now
        }, ct);
        await _context.SaveChangesAsync(ct);
    }

    /// <inheritdoc />
    public async Task<int> ExpireStampsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        // Cards whose progress has expired: LastStampAt (or EnrolledAt) + StampExpiryDays < now.
        // Null StampExpiryDays = never expires. Only cards with progress are touched.
        var expired = await _context.LoyaltyCards
            .Include(c => c.Program)
            .Where(c => c.TotalStamps > 0
                && c.Program.StampExpiryDays != null
                && (c.LastStampAt ?? c.EnrolledAt) < now.AddDays(-c.Program.StampExpiryDays!.Value))
            .Select(c => new
            {
                c.Id,
                c.CustomerId,
                c.BusinessId,
                c.TotalStamps
            })
            .ToListAsync(cancellationToken);

        var expiredCount = 0;
        foreach (var card in expired)
        {
            // Guarded conditional UPDATE: only resets when TotalStamps is unchanged,
            // so a concurrent award between our read and write is never clobbered.
            var affected = await _context.LoyaltyCards
                .Where(c => c.Id == card.Id && c.TotalStamps == card.TotalStamps)
                .ExecuteUpdateAsync(u => u.SetProperty(c => c.TotalStamps, 0), cancellationToken);
            if (affected == 0)
                continue;

            expiredCount++;

            // Dedupe: one expiry notification per customer per business, ever.
            var alreadySent = await _context.NotificationLogs
                .AnyAsync(n => n.UserId == card.CustomerId
                    && n.BusinessId == card.BusinessId
                    && n.TemplateType == ExpiryTemplate, cancellationToken);
            if (alreadySent)
                continue;

            await CreateNudgeAsync(card.CustomerId, card.BusinessId, ExpiryTemplate,
                "StampExpiry", card.TotalStamps, now, cancellationToken);
        }

        if (expiredCount > 0)
            _logger.LogInformation("Stamp expiry run complete. Cards expired: {Count}", expiredCount);
        return expiredCount;
    }
}
