namespace PunchedApi.Domain.Entities;

/// <summary>
/// Reason codes for manual stamp adjustments made by a business owner.
/// </summary>
public enum StampAdjustmentReason
{
    VoidMistake = 0,
    ManualCorrection = 1,
    Goodwill = 2,
    SystemFix = 3
}
