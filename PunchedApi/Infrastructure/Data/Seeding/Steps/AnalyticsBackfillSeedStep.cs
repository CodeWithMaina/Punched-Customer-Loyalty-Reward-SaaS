using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class AnalyticsBackfillSeedStep : ISeedStep
{
    public string Name => "AnalyticsBackfill";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        // Determine the date range from seeded activity
        var minDate = DateOnly.MinValue;
        var maxDate = DateOnly.MinValue;

        if (context.Db.Stamps.Any())
        {
            var minStamp = await context.Db.Stamps.MinAsync(s => s.StampedAt, cancellationToken);
            var maxStamp = await context.Db.Stamps.MaxAsync(s => s.StampedAt, cancellationToken);
            minDate = DateOnly.FromDateTime(minStamp);
            maxDate = DateOnly.FromDateTime(maxStamp);
        }

        if (minDate == DateOnly.MinValue)
            return;

        var aggregator = context.ServiceProvider.GetService(typeof(IAnalyticsAggregationService)) as IAnalyticsAggregationService;
        var segmentation = context.ServiceProvider.GetService(typeof(ISegmentationService)) as ISegmentationService;
        var loyalty = context.ServiceProvider.GetService(typeof(ILoyaltyService)) as ILoyaltyService;

        if (aggregator != null)
        {
            await aggregator.BackfillAllBusinessesAsync(minDate, maxDate, cancellationToken);
        }

        if (segmentation != null)
        {
            await segmentation.BackfillAllBusinessesAsync(cancellationToken);
        }

        if (loyalty != null)
        {
            await loyalty.BackfillProgramHistoryAsync(cancellationToken);
        }
    }
}