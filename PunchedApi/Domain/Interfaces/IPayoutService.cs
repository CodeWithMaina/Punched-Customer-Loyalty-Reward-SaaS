namespace PunchedApi.Domain.Interfaces;

public interface IPayoutService
{
    Task<int> ProcessDueRedemptionsAsync(CancellationToken cancellationToken = default);
}
