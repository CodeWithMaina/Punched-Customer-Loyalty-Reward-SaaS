using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public sealed class PayoutService : IPayoutService
{
    private readonly ApplicationDbContext _context;
    private readonly IRewardPayoutGateway _gateway;
    private readonly ILogger<PayoutService> _logger;

    private const int MaxRetries = 5;

    public PayoutService(
        ApplicationDbContext context,
        IRewardPayoutGateway gateway,
        ILogger<PayoutService> logger)
    {
        _context = context;
        _gateway = gateway;
        _logger = logger;
    }

    public async Task<int> ProcessDueRedemptionsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var workerId = $"worker-{Guid.NewGuid():N}";

        var dueIds = await _context.Redemptions
            .Where(r =>
                (r.PayoutStatus == "pending" || (r.PayoutStatus == "failed" && r.RetryCount < MaxRetries)) &&
                (r.NextRetryAt == null || r.NextRetryAt <= now) &&
                r.PaidAt == null)
            .OrderBy(r => r.RedeemedAt)
            .Select(r => r.Id)
            .Take(100)
            .ToListAsync(cancellationToken);

        var processed = 0;

        foreach (var redemptionId in dueIds)
        {
            var claimed = await _context.Redemptions
                .Where(r => r.Id == redemptionId &&
                    (r.PayoutStatus == "pending" || (r.PayoutStatus == "failed" && r.RetryCount < MaxRetries)) &&
                    (r.NextRetryAt == null || r.NextRetryAt <= now) &&
                    r.PaidAt == null)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(r => r.PayoutStatus, "processing")
                    .SetProperty(r => r.ProcessingStartedAt, now)
                    .SetProperty(r => r.ProcessingWorkerId, workerId)
                    .SetProperty(r => r.FailureReason, (string?)null),
                    cancellationToken);

            if (claimed == 0)
                continue;

            var redemption = await _context.Redemptions
                .FirstOrDefaultAsync(r => r.Id == redemptionId, cancellationToken);

            if (redemption == null)
                continue;

            var business = await _context.Businesses
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == redemption.BusinessId, cancellationToken);

            if (business == null)
            {
                await MarkFailedAsync(redemptionId, "BUSINESS_NOT_FOUND", retryable: false, cancellationToken);
                continue;
            }

            try
            {
                if (redemption.PaidAt != null)
                {
                    await _context.Redemptions
                        .Where(r => r.Id == redemptionId)
                        .ExecuteUpdateAsync(set => set
                            .SetProperty(r => r.PayoutStatus, "completed")
                            .SetProperty(r => r.ProcessingWorkerId, (string?)null), cancellationToken);

                    processed++;
                    continue;
                }

                var result = await _gateway.ProcessAsync(redemption, business, cancellationToken);

                if (result.Success)
                {
                    var paidAt = DateTime.UtcNow;
                    await _context.Redemptions
                        .Where(r => r.Id == redemptionId)
                        .ExecuteUpdateAsync(set => set
                            .SetProperty(r => r.PayoutStatus, "completed")
                            .SetProperty(r => r.PaidAt, paidAt)
                            .SetProperty(r => r.MpesaRef, result.Reference)
                            .SetProperty(r => r.ProcessingWorkerId, (string?)null)
                            .SetProperty(r => r.NextRetryAt, (DateTime?)null)
                            .SetProperty(r => r.FailureReason, (string?)null), cancellationToken);

                    processed++;
                }
                else
                {
                    await MarkFailedAsync(
                        redemptionId,
                        string.IsNullOrWhiteSpace(result.ErrorMessage) ? result.ErrorCode : $"{result.ErrorCode}: {result.ErrorMessage}",
                        result.Retryable,
                        cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payout processing failed for redemption {RedemptionId}", redemptionId);
                await MarkFailedAsync(redemptionId, ex.Message, retryable: true, cancellationToken);
            }
        }

        return processed;
    }

    private async Task MarkFailedAsync(Guid redemptionId, string? reason, bool retryable, CancellationToken cancellationToken)
    {
        var row = await _context.Redemptions
            .Where(r => r.Id == redemptionId)
            .Select(r => new { r.RetryCount })
            .FirstOrDefaultAsync(cancellationToken);

        if (row == null)
            return;

        var nextRetry = retryable
            ? DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, Math.Min(6, row.RetryCount + 1))))
            : (DateTime?)null;

        await _context.Redemptions
            .Where(r => r.Id == redemptionId)
            .ExecuteUpdateAsync(set => set
                .SetProperty(r => r.PayoutStatus, "failed")
                .SetProperty(r => r.RetryCount, r => r.RetryCount + 1)
                .SetProperty(r => r.NextRetryAt, nextRetry)
                .SetProperty(r => r.ProcessingWorkerId, (string?)null)
                .SetProperty(r => r.FailureReason, reason), cancellationToken);
    }
}
