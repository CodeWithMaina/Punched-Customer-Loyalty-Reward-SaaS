using Microsoft.EntityFrameworkCore;
using Npgsql;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>
/// Partial portion of <see cref="BusinessService"/> implementing richer analytics sections
/// (executive overview, revenue/payout pipeline, traffic, extended staff/program, recommendations).
/// Split across several partial-class files. All queries remain scoped to the resolved
/// businessId (derived from the authenticated owner's claims).
/// </summary>
public partial class BusinessService
{
    private sealed class CardInsight
    {
        public Guid ProgramId { get; init; }
        public int TotalStamps { get; init; }
        public int LifetimeStamps { get; init; }
        public int TotalRedemptions { get; init; }
        public DateTime? LastStampAt { get; init; }
        public DateTime EnrolledAt { get; init; }
    }

    private sealed class StaffDailyRow
    {
        public Guid Staff { get; set; }
        public DateTime Date { get; set; }
        public int C { get; set; }
    }

    private sealed class ExtendedAnalyticsResult
    {
        public ExecutiveOverviewResponse Overview { get; set; } = new();
        public BusinessRevenueResponse Revenue { get; set; } = new();
        public BusinessTrafficResponse Traffic { get; set; } = new();
        public List<ProgramPerformanceItem> ProgramPerformance { get; set; } = [];
        public List<StaffPerformanceItem> StaffPerformance { get; set; } = [];
        public List<BusinessRecommendation> Recommendations { get; set; } = [];
    }

    private async Task<ExtendedAnalyticsResult> BuildExtendedAnalyticsAsync(
        Guid businessId, DateTime now, DateTime periodStart, LoyaltyProgram? activeProgram,
        List<LoyaltyProgram> programs, int totalPeriodStamps, Dictionary<int, int> stampsByHour,
        IReadOnlyDictionary<DateTime, int> dailyStamps, int redemptionCount, IReadOnlyList<CardInsight> cards,
        Dictionary<Guid, string> staffUsers,
        Dictionary<Guid, (int StampsIssued, int CustomersServed)> staffPeriodStats)
    {
        var days = Math.Max(0, (int)(now - periodStart).TotalDays + 1);

        var (revenue, overview, traffic) = await BuildRevenueTrafficAsync(
            businessId, now, periodStart, activeProgram, programs,
            totalPeriodStamps, stampsByHour, dailyStamps, redemptionCount, cards);

        var (programPerformance, staffPerformance, recommendations) = await BuildProgramStaffAsync(
            businessId, now, periodStart, activeProgram, programs, days,
            cards, staffUsers, staffPeriodStats, overview, traffic);

        return new ExtendedAnalyticsResult
        {
            Overview = overview,
            Revenue = revenue,
            Traffic = traffic,
            ProgramPerformance = programPerformance,
            StaffPerformance = staffPerformance,
            Recommendations = recommendations
        };
    }

    internal async Task<double?> ComputeVisitCadenceAsync(Guid businessId, DateTime periodStart)
    {
        const string sql = """
            WITH period_stamps AS MATERIALIZED (
                SELECT s.id, s.card_id, s.stamped_at
                FROM stamps s
                INNER JOIN loyalty_cards c ON c.id = s.card_id
                WHERE c.business_id = @bid
                  AND s.stamped_at >= @start
            ),
            cadence_input AS (
                SELECT id, card_id, stamped_at
                FROM period_stamps
                UNION ALL
                SELECT previous.id, previous.card_id, previous.stamped_at
                FROM (SELECT DISTINCT card_id FROM period_stamps) active_cards
                CROSS JOIN LATERAL (
                    SELECT s.id, s.card_id, s.stamped_at
                    FROM stamps s
                    WHERE s.card_id = active_cards.card_id
                      AND s.stamped_at < @start
                    ORDER BY s.stamped_at DESC, s.id DESC
                    LIMIT 1
                ) previous
            ),
            intervals AS (
                SELECT
                    stamped_at,
                    stamped_at - LAG(stamped_at) OVER (
                        PARTITION BY card_id
                        ORDER BY stamped_at, id
                    ) AS visit_interval
                FROM cadence_input
            )
            SELECT AVG(EXTRACT(EPOCH FROM visit_interval) / 86400.0) AS "Value"
            FROM intervals
            WHERE stamped_at >= @start
              AND visit_interval IS NOT NULL
            """;
        var cadence = await _context.Database.SqlQueryRaw<double?>(
                sql, new NpgsqlParameter("bid", businessId), new NpgsqlParameter("start", periodStart))
            .SingleAsync();
        return cadence.HasValue ? Math.Round(cadence.Value, 2) : null;
    }

    private static string UnderutilizedHourLabel(int hour) => hour switch
    {
        >= 5 and < 12 => "morning",
        >= 12 and < 17 => "afternoon",
        >= 17 and < 21 => "evening",
        _ => "late night"
    };

    private static string FormatHour(int hour)
    {
        var ampm = hour >= 12 ? "PM" : "AM";
        var h = hour % 12 == 0 ? 12 : hour % 12;
        return $"{h} {ampm}";
    }
}