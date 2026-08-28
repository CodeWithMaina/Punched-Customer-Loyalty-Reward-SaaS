using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Periodic background worker (default every 24h, configurable via
/// "Workers:SubscriptionExpiryIntervalHours") that expires overdue
/// subscriptions so module access lapses automatically.
/// </summary>
public sealed class SubscriptionExpiryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionExpiryWorker> _logger;
    private readonly TimeSpan _interval;

    public SubscriptionExpiryWorker(IServiceScopeFactory scopeFactory, ILogger<SubscriptionExpiryWorker> logger, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        var hours = configuration.GetValue<double?>("Workers:SubscriptionExpiryIntervalHours") ?? 24;
        _interval = TimeSpan.FromHours(Math.Max(hours, 0.1));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SubscriptionExpiryWorker started (interval {Interval}).", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var expiryService = scope.ServiceProvider.GetRequiredService<SubscriptionExpiryService>();
                var expired = await expiryService.ExpireOverdueAsync(DateTime.UtcNow);
                if (expired > 0)
                {
                    _logger.LogInformation("SubscriptionExpiryWorker expired {Count} business(es).", expired);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "SubscriptionExpiryWorker cycle failed.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("SubscriptionExpiryWorker stopped.");
    }
}
