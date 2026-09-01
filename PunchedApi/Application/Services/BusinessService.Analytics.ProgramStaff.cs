using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>Computes program and staff performance for a business.</summary>
public partial class BusinessService
{
    private async Task<(List<ProgramPerformanceItem> Program, List<StaffPerformanceItem> Staff, List<BusinessRecommendation> Recommendations)>
        BuildProgramStaffAsync(
        Guid businessId, DateTime now, DateTime periodStart, LoyaltyProgram? activeProgram,
        List<LoyaltyProgram> programs, int days, IReadOnlyList<CardInsight> cards,
        Dictionary<Guid, string> staffUsers,
        Dictionary<Guid, (int StampsIssued, int CustomersServed)> staffPeriodStats,
        ExecutiveOverviewResponse overview, BusinessTrafficResponse traffic)
    {
        var programIds = programs.Select(p => p.Id).ToList();

        var programRedemptions = await _context.Redemptions
            .Where(r => r.BusinessId == businessId && r.RedeemedAt >= periodStart && programIds.Contains(r.Card.ProgramId))
            .Select(r => new { r.Card.ProgramId, r.RewardValue, r.PaidAt, r.PayoutStatus, r.Status, Date = r.RedeemedAt.Date }).ToListAsync();
        var periodRedemptionCount = programRedemptions.GroupBy(r => r.ProgramId).ToDictionary(g => g.Key, g => g.Count());

        var programPerformance = new List<ProgramPerformanceItem>();
        foreach (var prog in programs)
        {
            var progCards = cards.Where(c => c.ProgramId == prog.Id).ToList();
            var completed = progCards.Count(c => c.LifetimeStamps >= prog.StampsRequired);
            var prRows = programRedemptions.Where(r => r.ProgramId == prog.Id).ToList();
            var trendLookup = prRows.GroupBy(r => r.Date).ToDictionary(g => g.Key, g => g.Count());
            var compTrend = Enumerable.Range(0, days).Select(i => new CompletionTrendPoint
            {
                Date = periodStart.AddDays(i).Date.ToString("yyyy-MM-dd"),
                Value = trendLookup.GetValueOrDefault(periodStart.AddDays(i).Date)
            }).ToList();
            programPerformance.Add(new ProgramPerformanceItem
            {
                ProgramId = prog.Id,
                ProgramName = prog.Name,
                TotalRedemptions = periodRedemptionCount.GetValueOrDefault(prog.Id, 0),
                ActiveCards = progCards.Count,
                CompletionRate = progCards.Count > 0 ? Math.Round((double)completed / progCards.Count * 100, 1) : 0,
                RewardPayoutKes = prRows.Sum(r => r.RewardValue),
                RewardsPaidKes = prRows.Where(r => r.PaidAt != null).Sum(r => r.RewardValue),
                RewardsPendingKes = prRows.Where(r => r.PaidAt == null && r.PayoutStatus != "failed").Sum(r => r.RewardValue),
                CompletionTrend = compTrend
            });
        }

        var staffDailyAll = await _context.Stamps
            .Where(s => s.Card.BusinessId == businessId && s.AwardedByUserId != null)
            .GroupBy(s => new { Staff = s.AwardedByUserId!.Value, Date = s.StampedAt.Date })
            .Select(g => new StaffDailyRow { Staff = g.Key.Staff, Date = g.Key.Date, C = g.Count() }).ToListAsync();
        var staffMapped = staffDailyAll.GroupBy(x => x.Staff).ToDictionary(g => g.Key, g => g.ToList());

        var staffPerformance = new List<StaffPerformanceItem>();
        foreach (var kv in staffUsers)
        {
            staffMapped.TryGetValue(kv.Key, out var mapped);
            mapped ??= [];
            var allTime = 0; var today = 0; var last7 = 0; var last30 = 0; var activeDays = 0; var personalBest = 0;
            foreach (var m in mapped)
            {
                allTime += m.C;
                if (m.Date == now.Date) today += m.C;
                if (m.Date >= now.Date.AddDays(-7)) last7 += m.C;
                if (m.Date >= now.Date.AddDays(-30)) last30 += m.C;
                activeDays++;
                if (m.C > personalBest) personalBest = m.C;
            }
            var ps = (StampsIssued: 0, CustomersServed: 0);
            if (staffPeriodStats.TryGetValue(kv.Key, out var s)) ps = s;
            staffPerformance.Add(new StaffPerformanceItem
            {
                StaffId = kv.Key, Name = kv.Value, StampsIssued = ps.StampsIssued, CustomersServed = ps.CustomersServed,
                StampsToday = today, StampsLast7Days = last7, StampsLast30Days = last30, StampsAllTime = allTime,
                StampsPerActiveDay = activeDays > 0 ? Math.Round(ps.StampsIssued / (double)activeDays, 2) : 0,
                PersonalBest = personalBest
            });
        }

        staffPerformance = staffPerformance.OrderByDescending(s => s.StampsIssued).ToList();
        var recommendations = BuildRecommendations(activeProgram, overview, traffic, cards, programPerformance);
        return (programPerformance, staffPerformance, recommendations);
    }
}