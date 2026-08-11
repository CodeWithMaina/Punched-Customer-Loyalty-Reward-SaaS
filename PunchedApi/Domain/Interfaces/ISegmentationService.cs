namespace PunchedApi.Domain.Interfaces;

public interface ISegmentationService
{
    Task RecomputeBusinessSegmentsAsync(Guid businessId, CancellationToken cancellationToken = default);
    Task RecomputeAllBusinessesAsync(CancellationToken cancellationToken = default);
}
