using PunchedApi.Application.Settings;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed class SeedReport
{
    public DateTime GenerationDateUtc { get; set; }
    public int? RandomSeed { get; set; }
    public SeedExecutionMode Mode { get; set; }
    public int BusinessesRequested { get; set; }
    public TimeSpan ExecutionTime { get; set; }
    public Dictionary<string, int> Counts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public List<SeedCredentialGroup> Credentials { get; } = [];
    public List<SeedModuleCapability> CapabilityAnalysis { get; } = [];
    public List<string> Warnings { get; } = [];
    public List<string> Errors { get; } = [];
}

public sealed class SeedCredentialGroup
{
    public required string BusinessKey { get; init; }
    public required string BusinessName { get; init; }
    public required List<SeedCredential> Accounts { get; init; }
}

public sealed class SeedModuleCapability
{
    public required string Module { get; init; }
    public required string Status { get; init; }
    public required string Notes { get; init; }
}

public sealed class SeedExecutionContext
{
    public required ApplicationDbContext Db { get; init; }
    public required IWebHostEnvironment Environment { get; init; }
    public required ILogger Logger { get; init; }
    public required ISeedRandom Random { get; init; }
    public required string ReportOutputPath { get; init; }
    public required SeedReport Report { get; init; }
    public required SeedScenario Scenario { get; init; }

    public Dictionary<string, User> UsersByKey { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, Business> BusinessesByKey { get; } = new(StringComparer.Ordinal);
    public Dictionary<Guid, LoyaltyProgram> ActiveProgramsByBusiness { get; } = [];
}
