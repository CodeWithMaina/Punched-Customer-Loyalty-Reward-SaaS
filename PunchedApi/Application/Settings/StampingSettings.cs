namespace PunchedApi.Application.Settings;

/// <summary>
/// Configuration for stamping-ecosystem background jobs (win-back nudges).
/// Bound to the "Stamping" configuration section.
/// </summary>
public class StampingSettings
{
    public const string SectionName = "Stamping";

    /// <summary>Days of stamp inactivity before a customer gets a win-back nudge. Default 30.</summary>
    public int WinBackDays { get; set; } = 30;

    /// <summary>How often (in hours) the win-back cron job runs. Default 24 (once per day).</summary>
    public int WinBackCronHours { get; set; } = 24;
}
