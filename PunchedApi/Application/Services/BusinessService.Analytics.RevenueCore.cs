using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>Computes the revenue / reward-payout pipeline analytics for a business.</summary>
public partial class BusinessService
{
    private async Task<BusinessRevenueResponse> BuildRevenueCoreAsync(
        Guid businessId, DateTime now, DateTime periodStart, LoyaltyProgram? activeProgram,
        List<LoyaltyProgram> programs, IReadOnlyList<CardInsight> cards)
    {
        var days = Math.Max(0, (int)(now - periodStart).TotalDays + 1);

        var redemptionBase = _context.Redemptions.Where(r => r.BusinessId == businessId && r.RedeemedAt >= periodStart);
        var totals = await redemptionBase
            .GroupBy(_ => 1)
            .Select(g => new
            {
                RewardPayoutKes = g.Sum(r => r.RewardValue),
                RewardsPaidKes = g.Where(r => r.PaidAt != null).Sum(r => r.RewardValue),
                PendingPayoutKes = g.Where(r => r.PaidAt == null && r.PayoutStatus != "failed").Sum(r => r.RewardValue),
                FailedPayouts = g.Count(r => r.PayoutStatus == "failed"),
                AvgPayoutLatencyDays = g.Where(r => r.PaidAt != null)
                    .Average(r => (double?)(r.PaidAt!.Value - r.RedeemedAt).TotalDays)
            })
            .SingleOrDefaultAsync();
        var payoutTrendLookup = (await redemptionBase
            .GroupBy(r => r.RedeemedAt.Date)
            .Select(g => new { Date = g.Key, Value = g.Sum(r => r.RewardValue) }).ToListAsync())
            .ToDictionary(x => x.Date, x => x.Value);

        var revenue = new BusinessRevenueResponse
        {
            RewardPayoutKes = totals?.RewardPayoutKes ?? 0m,
            RewardsEarnedKes = totals?.RewardPayoutKes ?? 0m,
            RewardsPaidKes = totals?.RewardsPaidKes ?? 0m,
            PendingPayoutKes = totals?.PendingPayoutKes ?? 0m,
            FailedPayouts = totals?.FailedPayouts ?? 0,
            AvgPayoutLatencyDays = totals?.AvgPayoutLatencyDays is { } latencyDays
                ? Math.Round(latencyDays, 2) : null,
            RewardPayoutTrend = Enumerable.Range(0, days).Select(i => new RewardPayoutPoint
            {
                Date = periodStart.AddDays(i).Date.ToString("yyyy-MM-dd"),
                Value = payoutTrendLookup.GetValueOrDefault(periodStart.AddDays(i).Date)
            }).ToList()
        };
        revenue.PayoutSuccessRate = revenue.RewardPayoutKes > 0
            ? Math.Round((double)(revenue.RewardsPaidKes / revenue.RewardPayoutKes) * 100, 1) : 0;

        var programById = programs.ToDictionary(p => p.Id, p => p);
        decimal accruedLiability = 0m;
        foreach (var c in cards)
        {
            if (programById.TryGetValue(c.ProgramId, out var prog1) is false) prog1 = activeProgram;
            if (prog1 is { StampsRequired: > 0 })
                accruedLiability += (decimal)c.TotalStamps * (prog1.RewardValue / prog1.StampsRequired);
        }
        revenue.AccruedLiabilityKes = Math.Round(accruedLiability, 2);
        return revenue;
    }
}