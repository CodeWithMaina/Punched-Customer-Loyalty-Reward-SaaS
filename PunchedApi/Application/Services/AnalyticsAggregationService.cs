using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public sealed class AnalyticsAggregationService : IAnalyticsAggregationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AnalyticsAggregationService> _logger;

    public AnalyticsAggregationService(ApplicationDbContext context, ILogger<AnalyticsAggregationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public Task RecomputeTodayForBusinessAsync(Guid businessId, CancellationToken cancellationToken = default)
    {
        return RecomputeBusinessDayAsync(businessId, DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
    }

    public async Task BackfillBusinessAsync(Guid businessId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            await RecomputeBusinessDayAsync(businessId, day, cancellationToken);
            await RecomputeStaffDayAsync(businessId, day, cancellationToken);
        }
    }

    public async Task RecomputeBusinessDayAsync(Guid businessId, DateOnly day, CancellationToken cancellationToken = default)
    {
        var (startUtc, endUtc) = GetUtcRange(day);

        var stamps = await _context.Stamps
            .Where(s => s.Card.BusinessId == businessId && s.StampedAt >= startUtc && s.StampedAt < endUtc)
            .CountAsync(cancellationToken);

        var distinctCustomers = await _context.Stamps
            .Where(s => s.Card.BusinessId == businessId && s.StampedAt >= startUtc && s.StampedAt < endUtc)
            .Select(s => s.Card.CustomerId)
            .Distinct()
            .CountAsync(cancellationToken);

        var newEnrollments = await _context.LoyaltyCards
            .Where(c => c.BusinessId == businessId && c.EnrolledAt >= startUtc && c.EnrolledAt < endUtc)
            .CountAsync(cancellationToken);

        var redemptions = await _context.Redemptions
            .Where(r => r.BusinessId == businessId && r.RedeemedAt >= startUtc && r.RedeemedAt < endUtc)
            .CountAsync(cancellationToken);

        var payoutKes = await _context.Redemptions
            .Where(r => r.BusinessId == businessId && r.PaidAt != null && r.PaidAt >= startUtc && r.PaidAt < endUtc)
            .SumAsync(r => (decimal?)r.RewardValue, cancellationToken) ?? 0m;

        var accruedLiabilityKes = await _context.LoyaltyCards
            .Where(c => c.BusinessId == businessId)
            .Select(c => c.Program.StampsRequired > 0
                ? (decimal?)c.TotalStamps * (c.Program.RewardValue / c.Program.StampsRequired)
                : 0m)
            .SumAsync(cancellationToken) ?? 0m;

        var rewardReadyCustomers = await _context.LoyaltyCards
            .Where(c => c.BusinessId == businessId && c.TotalStamps >= c.Program.StampsRequired)
            .CountAsync(cancellationToken);

        var row = await _context.BusinessDailyAnalytics
            .FirstOrDefaultAsync(x => x.BusinessId == businessId && x.Date == day, cancellationToken);

        if (row == null)
        {
            row = new BusinessDailyAnalytics
            {
                BusinessId = businessId,
                Date = day
            };
            await _context.BusinessDailyAnalytics.AddAsync(row, cancellationToken);
        }

        row.Stamps = stamps;
        row.DistinctCustomers = distinctCustomers;
        row.NewEnrollments = newEnrollments;
        row.Redemptions = redemptions;
        row.PayoutKes = payoutKes;
        row.AccruedLiabilityKes = accruedLiabilityKes;
        row.RewardReadyCustomers = rewardReadyCustomers;
        row.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RecomputeStaffDayAsync(Guid businessId, DateOnly day, CancellationToken cancellationToken = default)
    {
        var (startUtc, endUtc) = GetUtcRange(day);

        await _context.StaffDailyAnalytics
            .Where(x => x.BusinessId == businessId && x.Date == day)
            .ExecuteDeleteAsync(cancellationToken);

        var grouped = await _context.Stamps
            .Where(s => s.Card.BusinessId == businessId && s.AwardedByUserId != null && s.StampedAt >= startUtc && s.StampedAt < endUtc)
            .GroupBy(s => s.AwardedByUserId!.Value)
            .Select(g => new
            {
                StaffUserId = g.Key,
                Stamps = g.Count(),
                DistinctCustomers = g.Select(x => x.Card.CustomerId).Distinct().Count()
            })
            .ToListAsync(cancellationToken);

        foreach (var stat in grouped)
        {
            var newCustomers = await _context.Stamps
                .Where(s => s.Card.BusinessId == businessId && s.AwardedByUserId == stat.StaffUserId)
                .GroupBy(s => s.Card.CustomerId)
                .CountAsync(g => g.Min(x => x.StampedAt) >= startUtc && g.Min(x => x.StampedAt) < endUtc, cancellationToken);

            var rewardReadyCreated = await _context.Redemptions
                .Where(r => r.BusinessId == businessId && r.PerformedByUserId == stat.StaffUserId && r.RedeemedAt >= startUtc && r.RedeemedAt < endUtc)
                .CountAsync(cancellationToken);

            await _context.StaffDailyAnalytics.AddAsync(new StaffDailyAnalytics
            {
                StaffUserId = stat.StaffUserId,
                BusinessId = businessId,
                Date = day,
                Stamps = stat.Stamps,
                DistinctCustomers = stat.DistinctCustomers,
                NewCustomers = newCustomers,
                RewardReadyCreated = rewardReadyCreated,
                UpdatedAt = DateTime.UtcNow
            }, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Recomputed staff_daily_analytics for business {BusinessId} day {Day}", businessId, day);
    }

    private static (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly day)
    {
        var startUtc = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        return (startUtc, startUtc.AddDays(1));
    }
}
