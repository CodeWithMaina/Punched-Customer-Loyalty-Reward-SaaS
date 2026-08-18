using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

public interface IAnalyticsAggregationService
{
    Task RecomputeBusinessDayAsync(Guid businessId, DateOnly day, CancellationToken cancellationToken = default);
    Task RecomputeStaffDayAsync(Guid businessId, DateOnly day, CancellationToken cancellationToken = default);
    Task RecomputeTodayForBusinessAsync(Guid businessId, CancellationToken cancellationToken = default);
    Task BackfillBusinessAsync(Guid businessId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task BackfillAllBusinessesAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
