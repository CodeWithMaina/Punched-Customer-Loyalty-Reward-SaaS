using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Application.Services;

public sealed class PayoutWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PayoutWorker> _logger;

    public PayoutWorker(IServiceScopeFactory scopeFactory, ILogger<PayoutWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PayoutWorker started with interval {Interval}", Interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            var startedAt = DateTime.UtcNow;
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var payoutService = scope.ServiceProvider.GetRequiredService<IPayoutService>();

                var processed = await payoutService.ProcessDueRedemptionsAsync(stoppingToken);

                _logger.LogInformation(
                    "PayoutWorker cycle complete. Processed={Processed}, DurationMs={DurationMs}",
                    processed,
                    (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "PayoutWorker cycle failed.");
            }

            await Task.Delay(Interval, stoppingToken);
        }

        _logger.LogInformation("PayoutWorker stopped.");
    }
}
