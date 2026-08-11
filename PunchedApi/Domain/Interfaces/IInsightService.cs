using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

public interface IInsightService
{
    Task GenerateBusinessInsightsAsync(Guid businessId, CancellationToken cancellationToken = default);
    Task GenerateAdminInsightsAsync(CancellationToken cancellationToken = default);
    Task GenerateAllBusinessInsightsAsync(CancellationToken cancellationToken = default);
    Task<List<Insight>> GetBusinessInsightsAsync(Guid businessId, bool includeDismissed, CancellationToken cancellationToken = default);
    Task<List<Insight>> GetAdminInsightsAsync(bool includeDismissed, CancellationToken cancellationToken = default);
    Task<bool> DismissInsightAsync(Guid insightId, Guid dismissedByUserId, Guid? businessId, CancellationToken cancellationToken = default);
}
