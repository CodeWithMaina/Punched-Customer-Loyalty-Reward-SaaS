using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public sealed class InsightService : IInsightService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InsightService> _logger;

    public InsightService(ApplicationDbContext context, ILogger<InsightService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task GenerateAllBusinessInsightsAsync(CancellationToken cancellationToken = default)
    {
        var businessIds = await _context.Businesses.Select(b => b.Id).ToListAsync(cancellationToken);
        foreach (var businessId in businessIds)
        {
            await GenerateBusinessInsightsAsync(businessId, cancellationToken);
        }
    }

    public async Task GenerateAdminInsightsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var this30 = now.Date.AddDays(-30);
        var prev30 = this30.AddDays(-30);

        var thisWindow = await _context.BusinessDailyAnalytics
            .Where(x => x.Date >= DateOnly.FromDateTime(this30))
            .GroupBy(x => x.BusinessId)
            .Select(g => new { g.Key, Stamps = g.Sum(x => x.Stamps) })
            .ToDictionaryAsync(x => x.Key, x => x.Stamps, cancellationToken);

        var prevWindow = await _context.BusinessDailyAnalytics
            .Where(x => x.Date >= DateOnly.FromDateTime(prev30) && x.Date < DateOnly.FromDateTime(this30))
            .GroupBy(x => x.BusinessId)
            .Select(g => new { g.Key, Stamps = g.Sum(x => x.Stamps) })
            .ToDictionaryAsync(x => x.Key, x => x.Stamps, cancellationToken);

        var declining = thisWindow.Keys.Count(bid => thisWindow.GetValueOrDefault(bid) < prevWindow.GetValueOrDefault(bid));

        if (declining > 0)
        {
            await UpsertInsightAsync(new Insight
            {
                Id = Guid.NewGuid(),
                Audience = "admin",
                BusinessId = null,
                Category = "platform",
                Metric = "declining_businesses",
                Severity = "HIGH",
                Confidence = "HIGH",
                Title = "Businesses with declining activity",
                Message = $"{declining} businesses have fewer visits in the last 30 days than the previous period.",
                Recommendation = "Prioritize outreach and support for declining businesses.",
                DataJson = JsonSerializer.Serialize(new { declining }),
                GeneratedAt = now,
                ExpiresAt = now.AddDays(2),
                CreatedAt = now
            }, cancellationToken);
        }
    }

    public async Task GenerateBusinessInsightsAsync(Guid businessId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now.Date);
        var last30Start = today.AddDays(-30);
        var prev30Start = today.AddDays(-60);

        var this30 = await _context.BusinessDailyAnalytics
            .Where(x => x.BusinessId == businessId && x.Date >= last30Start && x.Date <= today)
            .ToListAsync(cancellationToken);

        var prev30 = await _context.BusinessDailyAnalytics
            .Where(x => x.BusinessId == businessId && x.Date >= prev30Start && x.Date < last30Start)
            .ToListAsync(cancellationToken);

        if (this30.Count > 0 && prev30.Count > 0)
        {
            var currentStamps = this30.Sum(x => x.Stamps);
            var previousStamps = prev30.Sum(x => x.Stamps);

            if (previousStamps > 0)
            {
                var change = ((double)(currentStamps - previousStamps) / previousStamps) * 100.0;

                if (Math.Abs(change) >= 5)
                {
                    var isDrop = change < 0;
                    await UpsertInsightAsync(new Insight
                    {
                        Id = Guid.NewGuid(),
                        Audience = "business",
                        BusinessId = businessId,
                        Category = "growth",
                        Metric = "stamp_activity_change_pct",
                        Severity = isDrop ? "HIGH" : "MEDIUM",
                        Confidence = "HIGH",
                        Title = isDrop ? "Visit activity declined" : "Visit activity increased",
                        Message = $"Stamp activity changed by {change:F1}% compared with the previous 30-day period ({currentStamps} vs {previousStamps}).",
                        Recommendation = isDrop
                            ? "Run a re-engagement campaign and review peak-hour staffing."
                            : "Sustain momentum by ensuring capacity during peak times.",
                        DataJson = JsonSerializer.Serialize(new { currentStamps, previousStamps, changePct = change }),
                        GeneratedAt = now,
                        ExpiresAt = now.AddDays(3),
                        CreatedAt = now
                    }, cancellationToken);
                }
            }
        }

        var pendingPayouts = await _context.Redemptions
            .Where(r => r.BusinessId == businessId && r.PaidAt == null && r.RedeemedAt < now.AddDays(-7))
            .CountAsync(cancellationToken);

        if (pendingPayouts > 0)
        {
            await UpsertInsightAsync(new Insight
            {
                Id = Guid.NewGuid(),
                Audience = "business",
                BusinessId = businessId,
                Category = "risk",
                Metric = "pending_payouts",
                Severity = "HIGH",
                Confidence = "HIGH",
                Title = "Reward payouts are delayed",
                Message = $"{pendingPayouts} rewards were earned over 7 days ago and are still unpaid.",
                Recommendation = "Review payout processing failures and reconcile pending redemptions.",
                DataJson = JsonSerializer.Serialize(new { pendingPayouts }),
                GeneratedAt = now,
                ExpiresAt = now.AddDays(1),
                CreatedAt = now
            }, cancellationToken);
        }

        var latestLiability = await _context.BusinessDailyAnalytics
            .Where(x => x.BusinessId == businessId)
            .OrderByDescending(x => x.Date)
            .Select(x => (decimal?)x.AccruedLiabilityKes)
            .FirstOrDefaultAsync(cancellationToken) ?? 0m;

        var oneWeekAgoLiability = await _context.BusinessDailyAnalytics
            .Where(x => x.BusinessId == businessId && x.Date <= today.AddDays(-7))
            .OrderByDescending(x => x.Date)
            .Select(x => (decimal?)x.AccruedLiabilityKes)
            .FirstOrDefaultAsync(cancellationToken) ?? 0m;

        if (latestLiability > oneWeekAgoLiability * 1.25m && latestLiability > 0m)
        {
            await UpsertInsightAsync(new Insight
            {
                Id = Guid.NewGuid(),
                Audience = "business",
                BusinessId = businessId,
                Category = "liability",
                Metric = "accrued_liability_growth",
                Severity = "MEDIUM",
                Confidence = "HIGH",
                Title = "Reward liability is rising",
                Message = $"Accrued reward liability grew from {oneWeekAgoLiability:F2} to {latestLiability:F2} KES in the last week.",
                Recommendation = "Review reward economics and accelerate redemptions to manage liability.",
                DataJson = JsonSerializer.Serialize(new { latestLiability, oneWeekAgoLiability }),
                GeneratedAt = now,
                ExpiresAt = now.AddDays(2),
                CreatedAt = now
            }, cancellationToken);
        }

        _logger.LogInformation("Generated business insights for business {BusinessId}", businessId);
    }

    public async Task<List<Insight>> GetBusinessInsightsAsync(Guid businessId, bool includeDismissed, CancellationToken cancellationToken = default)
    {
        var query = _context.Insights
            .Where(i => i.Audience == "business" && i.BusinessId == businessId);

        if (!includeDismissed)
            query = query.Where(i => !i.Dismissed);

        var now = DateTime.UtcNow;
        query = query.Where(i => i.ExpiresAt > now);

        return await query
            .OrderByDescending(i => i.GeneratedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Insight>> GetAdminInsightsAsync(bool includeDismissed, CancellationToken cancellationToken = default)
    {
        var query = _context.Insights
            .Where(i => i.Audience == "admin");

        if (!includeDismissed)
            query = query.Where(i => !i.Dismissed);

        var now = DateTime.UtcNow;
        query = query.Where(i => i.ExpiresAt > now);

        return await query
            .OrderByDescending(i => i.GeneratedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DismissInsightAsync(Guid insightId, Guid dismissedByUserId, Guid? businessId, CancellationToken cancellationToken = default)
    {
        var insight = await _context.Insights.FirstOrDefaultAsync(i => i.Id == insightId, cancellationToken);
        if (insight == null)
            return false;

        if (insight.Audience == "business" && insight.BusinessId != businessId)
            return false;

        insight.Dismissed = true;
        insight.DismissedAt = DateTime.UtcNow;
        insight.DismissedBy = dismissedByUserId;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task UpsertInsightAsync(Insight candidate, CancellationToken cancellationToken)
    {
        var existing = await _context.Insights
            .Where(i =>
                i.Audience == candidate.Audience &&
                i.BusinessId == candidate.BusinessId &&
                i.Category == candidate.Category &&
                i.Metric == candidate.Metric &&
                i.Title == candidate.Title &&
                i.ExpiresAt > DateTime.UtcNow &&
                !i.Dismissed)
            .OrderByDescending(i => i.GeneratedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
        {
            existing.Message = candidate.Message;
            existing.Recommendation = candidate.Recommendation;
            existing.DataJson = candidate.DataJson;
            existing.GeneratedAt = candidate.GeneratedAt;
            existing.ExpiresAt = candidate.ExpiresAt;
            existing.Severity = candidate.Severity;
            existing.Confidence = candidate.Confidence;
        }
        else
        {
            await _context.Insights.AddAsync(candidate, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
