using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PunchedApi.Application.Settings;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed class DatabaseSeeder : IDatabaseSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly IOptions<SeedOptions> _options;
    private readonly IWebHostEnvironment _environment;
    private readonly ISeedRandom _random;
    private readonly IEnumerable<ISeedStep> _steps;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        ApplicationDbContext db,
        IOptions<SeedOptions> options,
        IWebHostEnvironment environment,
        ISeedRandom random,
        IEnumerable<ISeedStep> steps,
        IServiceProvider serviceProvider,
        ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _options = options;
        _environment = environment;
        _random = random;
        _steps = steps;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task RunAsync(bool explicitInvocation = false, CancellationToken cancellationToken = default)
    {
        var options = _options.Value;

        if (_environment.IsProduction() && !explicitInvocation)
        {
            _logger.LogInformation("Database seeding skipped. Environment is Production.");
            return;
        }

        if (!options.Enabled)
        {
            _logger.LogInformation("Database seeding skipped. Seed.Enabled is false.");
            return;
        }

        var selectedCount = Math.Clamp(options.BusinessCount, 1, SeedCatalog.MaxBusinesses);
        if (selectedCount != options.BusinessCount)
        {
            _logger.LogWarning("Requested BusinessCount {Requested} adjusted to supported range 1..{Max}.", options.BusinessCount, SeedCatalog.MaxBusinesses);
        }

        var scenario = SeedCatalog.BuildScenario(selectedCount);
        var reportPath = Path.IsPathRooted(options.ReportPath)
            ? options.ReportPath
            : Path.Combine(_environment.ContentRootPath, options.ReportPath);

        var report = new SeedReport
        {
            GenerationDateUtc = DateTime.UtcNow,
            RandomSeed = options.RandomSeed ?? _random.ActualSeed,
            Mode = options.ResolveMode(),
            BusinessesRequested = selectedCount,
        };

        foreach (var capability in CapabilityMatrix.Build())
        {
            report.CapabilityAnalysis.Add(capability);
        }

        var context = new SeedExecutionContext
        {
            Db = _db,
            Environment = _environment,
            Logger = _logger,
            Random = _random,
            Report = report,
            ReportOutputPath = reportPath,
            Scenario = scenario,
            ServiceProvider = _serviceProvider,
        };

        var watch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Starting database seed run. Mode={Mode}, Businesses={BusinessCount}, Seed={Seed}",
                report.Mode,
                selectedCount,
                report.RandomSeed);

            if (explicitInvocation && _environment.IsProduction())
            {
                _logger.LogInformation("Seed run is executing via explicit CLI invocation in Production environment.");
            }

            var steps = _steps.ToList();
            if (steps.Count == 0)
            {
                _logger.LogWarning("No seed steps registered. Skipping seeding logic.");
                return;
            }

            // Run database prep outside the transaction (reset/clear may require DDL).
            var prepStep = steps[0];
            var prepWatch = Stopwatch.StartNew();
            _logger.LogInformation("Running seed step: {Step}", prepStep.Name);
            await prepStep.ExecuteAsync(context, cancellationToken);
            _logger.LogInformation("Completed seed step: {Step} in {ElapsedMs}ms", prepStep.Name, prepWatch.ElapsedMilliseconds);

            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

            foreach (var step in steps.Skip(1))
            {
                var stepWatch = Stopwatch.StartNew();
                _logger.LogInformation("Running seed step: {Step}", step.Name);
                await step.ExecuteAsync(context, cancellationToken);
                _logger.LogInformation("Completed seed step: {Step} in {ElapsedMs}ms", step.Name, stepWatch.ElapsedMilliseconds);
            }

            await transaction.CommitAsync(cancellationToken);

            watch.Stop();
            report.ExecutionTime = watch.Elapsed;

            if (options.GenerateReport)
            {
                await SeedReportWriter.WriteAsync(report, reportPath, cancellationToken);
                _logger.LogInformation("Seed report generated at {ReportPath}", reportPath);
            }

            _logger.LogInformation("Database seeding completed successfully in {ElapsedMs}ms", watch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            report.Errors.Add(ex.Message);
            _logger.LogError(ex, "Database seeding failed.");

            if (options.GenerateReport)
            {
                try
                {
                    watch.Stop();
                    report.ExecutionTime = watch.Elapsed;
                    await SeedReportWriter.WriteAsync(report, reportPath, cancellationToken);
                }
                catch
                {
                    // Ignore report-write failure after primary exception.
                }
            }

            throw;
        }
    }
}
