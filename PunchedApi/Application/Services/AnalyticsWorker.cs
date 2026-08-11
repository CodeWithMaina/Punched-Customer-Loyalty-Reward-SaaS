using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public sealed class AnalyticsWorker : BackgroundService
{
    private static readonly TimeSpan NearRealtimeInterval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan DailyInterval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AnalyticsWorker> _logger;

    public AnalyticsWorker(IServiceScopeFactory scopeFactory, ILogger<AnalyticsWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AnalyticsWorker started.");

        var lastDailyRun = DateTime.MinValue;

        while (!stoppingToken.IsCancellationRequested)
        {
            var startedAt = DateTime.UtcNow;
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var aggregator = scope.ServiceProvider.GetRequiredService<IAnalyticsAggregationService>();
                var segmentation = scope.ServiceProvider.GetRequiredService<ISegmentationService>();
                var insightService = scope.ServiceProvider.GetRequiredService<IInsightService>();

                var businessIds = await db.Businesses.Select(b => b.Id).ToListAsync(stoppingToken);

                foreach (var businessId in businessIds)
                {
                    await aggregator.RecomputeTodayForBusinessAsync(businessId, stoppingToken);
                    await aggregator.RecomputeStaffDayAsync(businessId, DateOnly.FromDateTime(DateTime.UtcNow), stoppingToken);
                }

                if ((DateTime.UtcNow - lastDailyRun) >= DailyInterval)
                {
                    var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-1));
                    foreach (var businessId in businessIds)
                    {
                        await aggregator.RecomputeBusinessDayAsync(businessId, yesterday, stoppingToken);
                        await aggregator.RecomputeStaffDayAsync(businessId, yesterday, stoppingToken);
                    }

                    await segmentation.RecomputeAllBusinessesAsync(stoppingToken);
                    await insightService.GenerateAllBusinessInsightsAsync(stoppingToken);
                    await insightService.GenerateAdminInsightsAsync(stoppingToken);

                    lastDailyRun = DateTime.UtcNow;
                }

                _logger.LogInformation(
                    "AnalyticsWorker cycle complete. Businesses={Businesses}, DurationMs={DurationMs}",
                    businessIds.Count,
                    (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "AnalyticsWorker cycle failed.");
            }

            await Task.Delay(NearRealtimeInterval, stoppingToken);
        }

        _logger.LogInformation("AnalyticsWorker stopped.");
    }
}
