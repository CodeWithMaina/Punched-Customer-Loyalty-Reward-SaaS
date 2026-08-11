namespace PunchedApi.Infrastructure.Data.Seeding;

public interface IAdminBootstrapper
{
    Task EnsureDefaultAdminAsync(CancellationToken cancellationToken = default);
}
