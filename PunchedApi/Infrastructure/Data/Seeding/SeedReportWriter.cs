using System.Text.Json;

namespace PunchedApi.Infrastructure.Data.Seeding;

public static class SeedReportWriter
{
    public static async Task WriteAsync(SeedReport report, string reportPath, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(reportPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
        };

        await using var stream = File.Create(reportPath);
        await JsonSerializer.SerializeAsync(stream, report, options, cancellationToken);
    }
}
