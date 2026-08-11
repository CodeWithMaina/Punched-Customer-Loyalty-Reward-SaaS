namespace PunchedApi.Infrastructure.Data.Seeding;

public interface IDatabaseSeeder
{
    Task RunAsync(bool explicitInvocation = false, CancellationToken cancellationToken = default);
}
