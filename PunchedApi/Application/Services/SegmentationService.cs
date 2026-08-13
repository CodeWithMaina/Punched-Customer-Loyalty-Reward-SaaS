using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public sealed class SegmentationService : ISegmentationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SegmentationService> _logger;

    public SegmentationService(ApplicationDbContext context, ILogger<SegmentationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RecomputeAllBusinessesAsync(CancellationToken cancellationToken = default)
    {
        var businessIds = await _context.Businesses
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        foreach (var businessId in businessIds)
        {
            await RecomputeBusinessSegmentsAsync(businessId, cancellationToken);
        }
    }

    public async Task BackfillAllBusinessesAsync(CancellationToken cancellationToken = default)
    {
        await RecomputeAllBusinessesAsync(cancellationToken);
    }

    public async Task RecomputeBusinessSegmentsAsync(Guid businessId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var cards = await _context.LoyaltyCards
            .Where(c => c.BusinessId == businessId)
            .Select(c => new
            {
                c.CustomerId,
                c.EnrolledAt,
                c.LastStampAt,
                c.LifetimeStamps,
                c.TotalRedemptions
            })
            .ToListAsync(cancellationToken);

        var existingSegments = await _context.CustomerSegments
            .Where(x => x.BusinessId == businessId)
            .ToListAsync(cancellationToken);
        _context.CustomerSegments.RemoveRange(existingSegments);

        if (cards.Count == 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        var orderedLifetime = cards.Select(c => c.LifetimeStamps).OrderBy(x => x).ToList();
        var percentileIndex = (int)Math.Floor(0.9 * (orderedLifetime.Count - 1));
        var highValueThreshold = orderedLifetime[Math.Max(0, percentileIndex)];

        foreach (var card in cards)
        {
            var daysSinceLast = card.LastStampAt.HasValue
                ? (int)(now - card.LastStampAt.Value).TotalDays
                : int.MaxValue;

            var daysSinceEnroll = (int)(now - card.EnrolledAt).TotalDays;

            var segment = DetermineSegment(card.LifetimeStamps, card.TotalRedemptions, daysSinceEnroll, daysSinceLast, highValueThreshold);
            var score = ComputeScore(card.LifetimeStamps, card.TotalRedemptions, daysSinceLast);

            await _context.CustomerSegments.AddAsync(new CustomerSegment
            {
                BusinessId = businessId,
                CustomerId = card.CustomerId,
                Segment = segment,
                Score = score,
                ComputedAt = now,
                LastStampAt = card.LastStampAt
            }, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Recomputed customer segments for business {BusinessId}. Rows={Count}", businessId, cards.Count);
    }

    private static string DetermineSegment(
        int lifetimeStamps,
        int totalRedemptions,
        int daysSinceEnroll,
        int daysSinceLast,
        int highValueThreshold)
    {
        if (daysSinceEnroll <= 14)
            return "new";

        if (lifetimeStamps >= highValueThreshold && lifetimeStamps > 0)
            return "high_value";

        if (totalRedemptions >= 3)
            return "loyal";

        if (daysSinceLast <= 7)
            return "frequent";

        if (daysSinceLast <= 14)
            return "active";

        if (daysSinceLast <= 30)
            return "at_risk";

        if (daysSinceLast <= 60)
            return "dormant";

        return "churned";
    }

    private static int ComputeScore(int lifetimeStamps, int totalRedemptions, int daysSinceLast)
    {
        var recencyScore = daysSinceLast switch
        {
            <= 7 => 40,
            <= 14 => 30,
            <= 30 => 20,
            <= 60 => 10,
            _ => 0
        };

        var activityScore = Math.Min(40, lifetimeStamps * 2);
        var redemptionScore = Math.Min(20, totalRedemptions * 5);

        return Math.Clamp(recencyScore + activityScore + redemptionScore, 0, 100);
    }
}
