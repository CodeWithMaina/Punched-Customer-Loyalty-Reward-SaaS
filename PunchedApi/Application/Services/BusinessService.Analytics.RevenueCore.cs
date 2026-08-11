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
        var rewardPayoutKes = await redemptionBase.SumAsync(r => (decimal?)r.RewardValue) ?? 0m;
        var paidRows = await redemptionBase.Where(r => r.PaidAt != null)
            .Select(r => new { r.RewardValue, r.PaidAt, r.RedeemedAt }).ToListAsync();
        var payoutTrendLookup = (await redemptionBase
            .GroupBy(r => r.RedeemedAt.Date)
            .Select(g => new { Date = g.Key, Value = g.Sum(r => r.RewardValue) }).ToListAsync())
            .ToDictionary(x => x.Date, x => x.Value);

        var revenue = new BusinessRevenueResponse
        {
            RewardPayoutKes = rewardPayoutKes,
            RewardsEarnedKes = rewardPayoutKes,
            RewardsPaidKes = paidRows.Sum(x => x.RewardValue),
            PendingPayoutKes = await redemptionBase.Where(r => r.PaidAt == null && r.Status != "failed")
                .SumAsync(r => (decimal?)r.RewardValue) ?? 0m,
            FailedPayouts = await redemptionBase.CountAsync(r => r.Status == "failed"),
            AvgPayoutLatencyDays = paidRows.Count > 0
                ? Math.Round(paidRows.Average(x => (x.PaidAt!.Value - x.RedeemedAt).TotalDays), 2) : null,
            RewardPayoutTrend = Enumerable.Range(0, days).Select(i => new RewardPayoutPoint
            {
                Date = periodStart.AddDays(i).Date.ToString("yyyy-MM-dd"),
                Value = payoutTrendLookup.GetValueOrDefault(periodStart.AddDays(i).Date)
            }).ToList()
        };
        revenue.PayoutSuccessRate = rewardPayoutKes > 0
            ? Math.Round((double)(revenue.RewardsPaidKes / rewardPayoutKes) * 100, 1) : 0;

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