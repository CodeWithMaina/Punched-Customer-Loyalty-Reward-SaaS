namespace PunchedApi.Infrastructure.Data.Seeding;

public interface IDatabaseCliRunner
{
    Task<bool> TryRunAsync(string[] args, CancellationToken cancellationToken = default);
}
