using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>Computes the executive overview and visit/footfall traffic analytics for a business.</summary>
public partial class BusinessService
{
    private async Task<(ExecutiveOverviewResponse Overview, BusinessTrafficResponse Traffic)> BuildOverviewTrafficAsync(
        Guid businessId, DateTime now, DateTime periodStart, LoyaltyProgram? activeProgram,
        int totalPeriodStamps, Dictionary<int, int> stampsByHour,
        IReadOnlyDictionary<DateTime, int> dailyStamps, int redemptionCount,
        IReadOnlyList<CardInsight> cards,
        BusinessRevenueResponse revenue)
    {
        var dayNames = new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
        var thirtyDaysAgo = now.AddDays(-30);
        var ninetyDaysAgo = now.AddDays(-90);
        var weekStart = now.Date.AddDays(-(((int)now.DayOfWeek + 6) % 7));
        var stampsThisWeek = dailyStamps
            .Where(x => x.Key >= weekStart)
            .Sum(x => x.Value);

        var overview = new ExecutiveOverviewResponse
        {
            TotalEnrolledCustomers = cards.Count,
            NewCustomers = cards.Count(c => c.EnrolledAt >= thirtyDaysAgo),
            ReturningCustomers = cards.Count(c => c.LastStampAt != null && c.LastStampAt >= thirtyDaysAgo && c.EnrolledAt < thirtyDaysAgo),
            TotalStamps = totalPeriodStamps,
            StampsThisWeek = stampsThisWeek,
            AvgStampsPerCustomer = cards.Count > 0 ? Math.Round(totalPeriodStamps / (double)cards.Count, 2) : 0,
            RewardPayoutKes = revenue.RewardPayoutKes,
            RedemptionRate = totalPeriodStamps > 0 ? Math.Round(redemptionCount / (double)totalPeriodStamps * 100, 1) : 0,
            NetEngagementValueKes = Math.Round(revenue.AccruedLiabilityKes - revenue.RewardPayoutKes, 2),
            RewardReadyCustomers = activeProgram != null ? cards.Count(c => c.TotalStamps >= activeProgram.StampsRequired) : 0,
            DormantCustomers = cards.Count(c => c.LastStampAt != null && c.LastStampAt < thirtyDaysAgo && c.LastStampAt >= ninetyDaysAgo),
            ChurnedCustomers = cards.Count(c => c.LastStampAt != null && c.LastStampAt < ninetyDaysAgo)
        };

        var traffic = new BusinessTrafficResponse
        {
            PeakHours = stampsByHour.OrderByDescending(kv => kv.Value).ThenBy(kv => kv.Key).Take(3)
                .Select(kv => new PeakHourItem { Hour = kv.Key, StampCount = kv.Value }).ToList()
        };
        var weeklyRaw = dailyStamps
            .GroupBy(x => x.Key.DayOfWeek)
            .Select(g => new { Day = g.Key, C = g.Sum(x => x.Value) });
        var busiest = weeklyRaw.OrderByDescending(x => x.C).FirstOrDefault();
        traffic.BusiestDayOfWeek = busiest != null ? dayNames[(int)busiest.Day] : null;
        traffic.BusiestDayStamps = busiest?.C ?? 0;

        var hourlyCounts = Enumerable.Range(0, 24).Select(h => stampsByHour.GetValueOrDefault(h, 0)).ToArray();
        var sorted = hourlyCounts.OrderBy(x => x).ToArray();
        var threshold = sorted.Length > 0
            ? sorted[Math.Clamp((int)Math.Ceiling(0.20d * sorted.Length) - 1, 0, sorted.Length - 1)] : 0;
        if (threshold > 0)
            traffic.UnderutilizedHours = Enumerable.Range(0, 24)
                .Where(h => hourlyCounts[h] > 0 && hourlyCounts[h] < threshold)
                .Take(4)
                .Select(h => new UnderutilizedHourItem { Hour = h, StampCount = hourlyCounts[h], Label = UnderutilizedHourLabel(h) })
                .ToList();
        try
        {
            traffic.VisitCadenceDays = await ComputeVisitCadenceAsync(businessId, periodStart);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to compute visit cadence for business {BusinessId} from {PeriodStart}",
                businessId, periodStart);
        }

        return (overview, traffic);
    }
}