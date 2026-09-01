namespace PunchedApi.Domain.Entities;

/// <summary>
/// Stable identifiers for the loyalty earning models a program can use.
/// Stored as a short string on <see cref="LoyaltyProgram.ProgramType"/> so the
/// catalog can grow without schema changes. The value is a hint that drives
/// which part of <see cref="PunchedApi.Application.Programs.ProgramConfig"/>
/// the evaluation engine should consult; it is never a set of booleans.
/// </summary>
public static class ProgramTypes
{
    /// <summary>Classic stamp card — each qualifying action awards a stamp.</summary>
    public const string Stamp = "stamp";

    /// <summary>Earn stamps by spending — <c>EarningThreshold</c> → 1 stamp.</summary>
    public const string Purchase = "purchase";

    /// <summary>Earn a stamp per visit (booking/clock-in).</summary>
    public const string Visit = "visit";

    /// <summary>Earn stamps by booking a specific service.</summary>
    public const string Service = "service";

    /// <summary>Earn stamps on qualifying product/service categories.</summary>
    public const string Category = "category";

    /// <summary>Tiered loyalty — named levels with benefits based on lifetime stamps.</summary>
    public const string Tiered = "tiered";

    /// <summary>All known program type keys (used for validation).</summary>
    public static readonly string[] All =
    {
        Stamp, Purchase, Visit, Service, Category, Tiered
    };

    /// <summary>Whether the value is a recognised program type key.</summary>
    public static bool IsKnown(string value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value, StringComparer.OrdinalIgnoreCase);
}