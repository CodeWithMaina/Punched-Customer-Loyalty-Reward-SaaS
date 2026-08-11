using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed class DatabaseCliRunner : IDatabaseCliRunner
{
    private static readonly HashSet<string> SupportedCommands = new(StringComparer.OrdinalIgnoreCase)
    {
        "db",
        "migrate",
        "seed",
        "migrate-seed",
        "init-db",
    };

    private readonly ApplicationDbContext _dbContext;
    private readonly IDatabaseSeeder _databaseSeeder;
    private readonly IAdminBootstrapper _adminBootstrapper;
    private readonly ILogger<DatabaseCliRunner> _logger;

    public DatabaseCliRunner(
        ApplicationDbContext dbContext,
        IDatabaseSeeder databaseSeeder,
        IAdminBootstrapper adminBootstrapper,
        ILogger<DatabaseCliRunner> logger)
    {
        _dbContext = dbContext;
        _databaseSeeder = databaseSeeder;
        _adminBootstrapper = adminBootstrapper;
        _logger = logger;
    }

    public async Task<bool> TryRunAsync(string[] args, CancellationToken cancellationToken = default)
    {
        if (args.Length == 0)
        {
            return false;
        }

        if (!SupportedCommands.Contains(args[0]))
        {
            return false;
        }

        var normalized = NormalizeCommand(args);
        if (normalized == null)
        {
            PrintHelp();
            return true;
        }

        switch (normalized)
        {
            case "migrate":
                await MigrateAsync(cancellationToken);
                break;
            case "seed":
                await SeedAsync(cancellationToken);
                break;
            case "migrate-seed":
                await MigrateAsync(cancellationToken);
                await SeedAsync(cancellationToken);
                break;
            case "help":
                PrintHelp();
                break;
            default:
                PrintHelp();
                break;
        }

        return true;
    }

    private async Task MigrateAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running CLI database migration command.");
        await _dbContext.Database.MigrateAsync(cancellationToken);
        await _adminBootstrapper.EnsureDefaultAdminAsync(cancellationToken);
        _logger.LogInformation("CLI database migration command completed.");
    }

    private async Task SeedAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running CLI database seed command.");
        await _databaseSeeder.RunAsync(explicitInvocation: true, cancellationToken);
        await _adminBootstrapper.EnsureDefaultAdminAsync(cancellationToken);
        _logger.LogInformation("CLI database seed command completed.");
    }

    private static string? NormalizeCommand(string[] args)
    {
        if (args.Length == 0)
        {
            return null;
        }

        if (args[0].Equals("migrate", StringComparison.OrdinalIgnoreCase))
        {
            return "migrate";
        }

        if (args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
        {
            return "seed";
        }

        if (args[0].Equals("migrate-seed", StringComparison.OrdinalIgnoreCase) ||
            args[0].Equals("init-db", StringComparison.OrdinalIgnoreCase))
        {
            return "migrate-seed";
        }

        if (!args[0].Equals("db", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (args.Length == 1)
        {
            return "help";
        }

        return args[1].ToLowerInvariant() switch
        {
            "migrate" => "migrate",
            "seed" => "seed",
            "migrate-seed" => "migrate-seed",
            "init" => "migrate-seed",
            "help" => "help",
            _ => null,
        };
    }

    private void PrintHelp()
    {
        _logger.LogInformation("CLI database commands:");
        _logger.LogInformation("  dotnet PunchedApi.dll db migrate");
        _logger.LogInformation("  dotnet PunchedApi.dll db seed");
        _logger.LogInformation("  dotnet PunchedApi.dll db migrate-seed");
        _logger.LogInformation("  dotnet PunchedApi.dll migrate");
        _logger.LogInformation("  dotnet PunchedApi.dll seed");
        _logger.LogInformation("  dotnet PunchedApi.dll migrate-seed");
        _logger.LogInformation("When running in Docker, pass Seed__Enabled=true for seed commands.");
    }
}
