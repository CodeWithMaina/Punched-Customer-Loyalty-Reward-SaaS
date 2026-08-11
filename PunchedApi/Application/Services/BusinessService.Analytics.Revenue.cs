using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>Orchestrates the revenue / overview / traffic analytics sections for a business.</summary>
public partial class BusinessService
{
    private async Task<(BusinessRevenueResponse Revenue, ExecutiveOverviewResponse Overview, BusinessTrafficResponse Traffic)>
        BuildRevenueTrafficAsync(
        Guid businessId, DateTime now, DateTime periodStart, LoyaltyProgram? activeProgram,
        List<LoyaltyProgram> programs, int totalPeriodStamps, Dictionary<int, int> stampsByHour,
        int redemptionCount, IReadOnlyList<CardInsight> cards)
    {
        var revenue = await BuildRevenueCoreAsync(businessId, now, periodStart, activeProgram, programs, cards);
        var (overview, traffic) = await BuildOverviewTrafficAsync(
            businessId, now, periodStart, activeProgram, totalPeriodStamps, stampsByHour,
            redemptionCount, cards, revenue);
        return (revenue, overview, traffic);
    }
}