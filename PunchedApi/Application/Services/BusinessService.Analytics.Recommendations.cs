using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>Deterministic, rules-based recommendation engine for the business dashboard.</summary>
public partial class BusinessService
{
    private static List<BusinessRecommendation> BuildRecommendations(
        LoyaltyProgram? activeProgram,
        ExecutiveOverviewResponse overview,
        BusinessTrafficResponse traffic,
        IReadOnlyList<CardInsight> cards,
        List<ProgramPerformanceItem> programs)
    {
        var list = new List<BusinessRecommendation>();

        if (overview.RewardReadyCustomers > 0)
            list.Add(new BusinessRecommendation
            {
                Type = "reward_ready",
                Priority = "high",
                Title = $"{overview.RewardReadyCustomers} customers are reward-ready",
                Description = "Rewards are earned and awaiting payout. Process them to keep customers engaged.",
                Action = "View customers",
                ActionUrl = "/dashboard/business/customers"
            });

        if (activeProgram != null)
        {
            var near = cards
                .Where(c => c.TotalStamps < activeProgram.StampsRequired && c.TotalStamps >= activeProgram.StampsRequired - 3)
                .OrderByDescending(c => c.TotalStamps).Take(1).ToList();
            if (near.Count > 0)
            {
                var remaining = activeProgram.StampsRequired - near[0].TotalStamps;
                list.Add(new BusinessRecommendation
                {
                    Type = "customer_near_reward",
                    Priority = "medium",
                    Title = "Customers are close to a reward",
                    Description = $"A customer is only {remaining} stamp{(remaining == 1 ? "" : "s")} away from completing their card.",
                    Action = "View customers",
                    ActionUrl = "/dashboard/business/customers"
                });
            }
        }

        var inactive = overview.DormantCustomers + overview.ChurnedCustomers;
        if (inactive > 0)
            list.Add(new BusinessRecommendation
            {
                Type = "customer_at_risk",
                Priority = "medium",
                Title = "Re-engage inactive customers",
                Description = $"{inactive} customers haven't visited in over 30 days. Consider a reminder campaign.",
                Action = "View customers",
                ActionUrl = "/dashboard/business/customers"
            });

        if (cards.Count > 0 && overview.TotalStamps == 0)
            list.Add(new BusinessRecommendation
            {
                Type = "activation",
                Priority = "high",
                Title = "Drive first visits",
                Description = "Enrolled customers haven't collected a single stamp yet. Encourage them to visit.",
                Action = "View customers",
                ActionUrl = "/dashboard/business/customers"
            });

        if (traffic.BusiestDayOfWeek != null)
            list.Add(new BusinessRecommendation
            {
                Type = "traffic_peak",
                Priority = "low",
                Title = $"Busiest traffic: {traffic.BusiestDayOfWeek}",
                Description = $"Most stamps were issued on {traffic.BusiestDayOfWeek} ({traffic.BusiestDayStamps} in this period). Plan staffing and offers accordingly.",
                Action = "View analytics"
            });

        if (traffic.UnderutilizedHours.Count > 0)
        {
            var u = traffic.UnderutilizedHours[0];
            list.Add(new BusinessRecommendation
            {
                Type = "traffic_low",
                Priority = "low",
                Title = "Low traffic window detected",
                Description = $"{FormatHour(u.Hour)} {u.Label} sees unusually low traffic. A targeted promotion could fill this quiet period.",
                Action = "View analytics"
            });
        }

        var worstProgram = programs.OrderBy(p => p.CompletionRate).FirstOrDefault();
        if (worstProgram is { ActiveCards: > 0, CompletionRate: < 30 })
            list.Add(new BusinessRecommendation
            {
                Type = "program_underperforming",
                Priority = "medium",
                Title = $"\u201C{worstProgram.ProgramName}\u201D has a low completion rate",
                Description = $"{worstProgram.CompletionRate}% of enrollees complete this program. Review its reward economics.",
                Action = "View programs",
                ActionUrl = "/dashboard/business/program",
                EntityId = worstProgram.ProgramId.ToString()
            });

        return list.Take(6).ToList();
    }
}