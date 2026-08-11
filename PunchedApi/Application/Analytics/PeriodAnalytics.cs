using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Analytics;

/// <summary>
/// Pure, side-effect free helpers for period analytics. Kept free of EF/DbContext so
/// the arithmetic (percentage change, trend, window resolution, date validation) can be
/// unit-tested in isolation.
/// </summary>
public static class PeriodAnalytics
{
    /// <summary>Supported named periods. "custom" additionally requires explicit start/end.</summary>
    public static readonly HashSet<string> SupportedPeriods = new(StringComparer.OrdinalIgnoreCase)
    {
        "1d", "7d", "30d", "90d", "365d", "custom"
    };

    /// <summary>Days length of a named period.</summary>
    public static int PeriodLengthDays(string period) => period.ToLowerInvariant() switch
    {
        "1d" => 1,
        "7d" => 7,
        "30d" => 30,
        "90d" => 90,
        "365d" => 365,
        _ => 30
    };

    /// <summary>
    /// Resolves an absolute UTC half-open range [start, end) for a period.
    /// For named periods, <paramref name="customStart"/>/<paramref name="customEnd"/> are ignored.
    /// For "custom", both date boundaries must be provided (end inclusive; converted to exclusive.
    /// Throws ArgumentException with a stable, user-facing code on invalid input.
    /// </summary>
    public static (DateTime StartUtc, DateTime EndUtc) ResolveRange(
        string period,
        DateTime nowUtc,
        DateOnly? customStart = null,
        DateOnly? customEnd = null)
    {
        period = period.ToLowerInvariant();

        if (period == "custom")
        {
            if (customStart == null || customEnd == null)
                throw new ArgumentException("Custom periods require both 'start' and 'end' dates.", "start");

            var startUtc = customStart.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endExclusive = customEnd.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            if (endExclusive <= startUtc)
                throw new ArgumentException("'end' must be on or after 'start'.", "end");

            return (startUtc, endExclusive);
        }

        if (!SupportedPeriods.Contains(period))
            throw new ArgumentException($"Unsupported period '{period}'.", "period");

        var length = PeriodLengthDays(period);
        var endUtc = nowUtc;
        var startUtc2 = endUtc.AddDays(-length);
        return (startUtc2, endUtc);
    }

    /// <summary>
    /// Computes the previous window immediately preceding the current one (same length).
    /// </summary>
    public static (DateTime StartUtc, DateTime EndUtc) ResolvePrevious(
        string period,
        DateTime nowUtc,
        DateOnly? customStart = null,
        DateOnly? customEnd = null)
    {
        var (start, end) = ResolveRange(period, nowUtc, customStart, customEnd);
        return (start.AddDays(-(end - start).Days), start);
    }

    /// <summary>
    /// Percentage change of current vs previous. Returns <c>null</c> when the change cannot be
    /// meaningfully expressed (previous is zero/absent) so we never emit Infinity/NaN.
    /// </summary>
    public static double? ChangePercent(double? previous, double? current)
    {
        if (!current.HasValue) current = 0;
        if (!previous.HasValue || previous.Value == 0) return null;
        return Math.Round((current.Value - previous.Value) / Math.Abs(previous.Value) * 100.0, 1);
    }

    /// <summary>
    /// Directional trend. When a percentage is not meaningful (previous == 0) we fall back to a
    /// literal direction based on the current value.
    /// </summary>
    public static string Trend(double? previous, double? current)
    {
        var change = ChangePercent(previous, current);
        if (change.HasValue)
            return Math.Abs(change.Value) < 0.05 ? "flat" : (change.Value > 0 ? "up" : "down");

        // previous is zero: cannot state a % change; reflect raw direction only.
        if (!current.HasValue || current.Value == 0) return "flat";
        return current.Value > 0 ? "up" : "flat";
    }

    /// <summary>Builds a metric comparison, applying safe %, trend and numeric rounding.</summary>
    public static MetricComparisonResult Compare(string metric, double previous, double current)
    {
        var p = Math.Round(previous, 2);
        var c = Math.Round(current, 2);
        return new MetricComparisonResult
        {
            Metric = metric,
            PreviousValue = p,
            CurrentValue = c,
            ChangePct = ChangePercent(p == 0 ? null : p, c),
            Trend = Trend(p == 0 ? null : p, c)
        };
    }
}