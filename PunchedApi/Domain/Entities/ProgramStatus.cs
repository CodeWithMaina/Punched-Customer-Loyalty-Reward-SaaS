namespace PunchedApi.Domain.Entities;

/// <summary>
/// Lifecycle status of a <see cref="LoyaltyProgram"/>.
/// Replaces the legacy binary <c>IsActive</c> flag with an explicit,
/// extensible lifecycle: Draft → Active ↔ Paused, and Archived (terminal).
/// Backward compatibility: <c>IsActive == (Status == Active)</c> is maintained
/// at persistence/mapping time so existing callers keep working.
/// </summary>
public enum ProgramStatus
{
    /// <summary>Being configured; not yet accepting enrollments/stamps.</summary>
    Draft = 0,

    /// <summary>Live and accepting enrollments + stamp awards.</summary>
    Active = 1,

    /// <summary>Paused by the owner; existing cards keep their progress but no new stamps.</summary>
    Paused = 2,

    /// <summary>Terminal state; hidden from customer-facing surfaces and no new activity.</summary>
    Archived = 3
}