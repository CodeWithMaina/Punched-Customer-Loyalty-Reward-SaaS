namespace PunchedApi.Infrastructure.Data.Seeding;

public interface ISeedStep
{
    string Name { get; }
    Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken);
}
