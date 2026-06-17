using Microsoft.EntityFrameworkCore;
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

        _logger.LogInformation(
            "Cleanup complete — QrTokens deleted: {Qr}, RefreshTokens deleted: {Refresh}, VerificationCodes cleared: {Verify}",
            qrDeleted, refreshDeleted, verifyCleared);
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
