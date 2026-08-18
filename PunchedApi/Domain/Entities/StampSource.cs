namespace PunchedApi.Domain.Entities;

/// <summary>
/// Constants for the <see cref="Stamp.Source"/> column.
/// Distinguishes system-generated welcome/enrollment stamps from
/// user-scanned QR stamps.
/// </summary>
public static class StampSource
{
    /// <summary>Stamp awarded via QR token scan by business/staff.</summary>
    public const string Scan = "scan";

    /// <summary>Stamp granted automatically on customer enrollment (welcome stamp).</summary>
    public const string Enrollment = "enrollment";
}