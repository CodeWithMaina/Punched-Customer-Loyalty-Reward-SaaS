using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Background hosted service that periodically cleans up expired and stale records.
/// Runs every hour and handles:
///   - Expired / used QrTokens
///   - Expired / revoked RefreshTokens
///   - Stale unverified UserAuth verification codes
/// </summary>
public sealed class CleanupService : BackgroundService
{
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(1);

    // How long to retain already-used/revoked records before hard-deleting them
    private static readonly TimeSpan UsedQrRetention     = TimeSpan.FromDays(1);
    private static readonly TimeSpan RevokedTokenRetention = TimeSpan.FromDays(7);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CleanupService> _logger;

    public CleanupService(IServiceScopeFactory scopeFactory, ILogger<CleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CleanupService started. Interval: {Interval}", RunInterval);

        // Run once immediately on startup, then on the regular interval.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanupAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "CleanupService encountered an error during cleanup.");
            }

            await Task.Delay(RunInterval, stoppingToken);
        }

        _logger.LogInformation("CleanupService stopped.");
    }

    private async Task RunCleanupAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        var qrDeleted       = await CleanQrTokensAsync(db, now, ct);
        var refreshDeleted  = await CleanRefreshTokensAsync(db, now, ct);
        var verifyCleared   = await CleanVerificationCodesAsync(db, now, ct);
        var idempotencyDeleted = await CleanIdempotencyKeysAsync(db, now, ct);
        var cardsExpired = await CleanExpiredStampsAsync(ct);

        _logger.LogInformation(
            "Cleanup complete — QrTokens deleted: {Qr}, RefreshTokens deleted: {Refresh}, VerificationCodes cleared: {Verify}, IdempotencyKeys deleted: {Idem}, Cards expired: {Expired}",
            qrDeleted, refreshDeleted, verifyCleared, idempotencyDeleted, cardsExpired);
    }

    // ── Idempotency Keys ─────────────────────────────────────────────────────
    /// <summary>
    /// Deletes IdempotencyKey rows past their expiry (24h TTL set by the service).
    /// Deletes in bounded batches so a large backlog never blocks one long transaction.
    /// Public static for deterministic unit testing.
    /// </summary>
    public static async Task<int> CleanIdempotencyKeysAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        const int batchSize = 500;
        var totalDeleted = 0;
        while (!ct.IsCancellationRequested)
        {
            var batchIds = await db.IdempotencyKeys
                .Where(k => k.ExpiresAt < now)
                .OrderBy(k => k.ExpiresAt)
                .Take(batchSize)
                .Select(k => k.Id)
                .ToListAsync(ct);

            if (batchIds.Count == 0)
                break;

            totalDeleted += await db.IdempotencyKeys
                .Where(k => batchIds.Contains(k.Id))
                .ExecuteDeleteAsync(ct);
        }

        return totalDeleted;
    }

    // ── Stamp Expiry ─────────────────────────────────────────────────────────
    /// <summary>
    /// Expires card progress past the program's StampExpiryDays (Phase 4).
    /// Delegated to StampingMaintenanceService, which applies the guarded
    /// conditional UPDATE and notifies each affected customer (deduped).
    /// </summary>
    private async Task<int> CleanExpiredStampsAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var maintenance = scope.ServiceProvider.GetRequiredService<IStampingMaintenanceService>();
        return await maintenance.ExpireStampsAsync(ct);
    }

    // ── QR Tokens ────────────────────────────────────────────────────────────
    /// <summary>
    /// Deletes QrTokens that are either:
    ///   (a) expired and unused (no longer valid for stamping), or
    ///   (b) already used and older than the retention window.
    /// </summary>
    private static async Task<int> CleanQrTokensAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        var expiredUnused = db.QrTokens
            .Where(q => !q.IsUsed && q.ExpiresAt < now);

        var oldUsed = db.QrTokens
            .Where(q => q.IsUsed && q.ExpiresAt < now.Subtract(CleanupService.UsedQrRetention));

        db.QrTokens.RemoveRange(expiredUnused);
        db.QrTokens.RemoveRange(oldUsed);

        return await db.SaveChangesAsync(ct);
    }

    // ── Refresh Tokens ───────────────────────────────────────────────────────
    /// <summary>
    /// Deletes RefreshTokens that are either:
    ///   (a) past their expiry date, or
    ///   (b) revoked and older than the retention window.
    /// </summary>
    private static async Task<int> CleanRefreshTokensAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        var expired = db.RefreshTokens
            .Where(r => r.ExpiresAt < now);

        var oldRevoked = db.RefreshTokens
            .Where(r => r.IsRevoked && r.RevokedAt < now.Subtract(CleanupService.RevokedTokenRetention));

        db.RefreshTokens.RemoveRange(expired);
        db.RefreshTokens.RemoveRange(oldRevoked);

        return await db.SaveChangesAsync(ct);
    }

    // ── Email Verification Codes ─────────────────────────────────────────────
    /// <summary>
    /// Clears stale verification codes on UserAuth rows where:
    ///   - The code has expired, AND
    ///   - The account is still unverified (so we don't touch verified users).
    /// Does NOT delete the UserAuth row — the user may still verify later.
    /// </summary>
    private static async Task<int> CleanVerificationCodesAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        var stale = await db.UserAuths
            .Where(u => !u.IsVerified
                     && u.VerificationCode != null
                     && u.VerificationCodeExpiresAt < now)
            .ToListAsync(ct);

        foreach (var auth in stale)
        {
            auth.VerificationCode           = null;
            auth.VerificationCodeExpiresAt  = null;
            auth.VerificationCodeAttempts   = 0;
        }

        return await db.SaveChangesAsync(ct);
    }
}
