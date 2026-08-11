using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed record SeedUserDefinition(
    string Key,
    string Email,
    string Password,
    string FullName,
    UserRole Role,
    string? PhoneNumber,
    string? AvatarUrl,
    DateOnly? DateOfBirth,
    string? Gender,
    DateTime CreatedAt,
    bool IsVerified,
    Guid? StaffBusinessId = null);

public sealed record SeedBusinessDefinition(
    string Key,
    string Name,
    string Category,
    string Location,
    string? PhoneNumber,
    string? Email,
    string? Description,
    string? LogoUrl,
    string MpesaNumber,
    string OwnerUserKey,
    DateTime CreatedAt,
    string[] ProgramNames,
    int StampsRequired,
    decimal RewardValue,
    string RewardDescription,
    int RewardExpirationHours,
    ReferralRewardType ReferralRewardType,
    decimal ReferralRewardValue,
    int ReferralsRequired,
    int ReferralExpirationDays,
    string[] StaffUserKeys,
    string[] CustomerUserKeys,
    bool IsFocusBusiness);

public sealed record SeedCredential(string Label, string Email, string Password);

public sealed record SeedScenario(
    IReadOnlyList<SeedBusinessDefinition> Businesses,
    IReadOnlyList<SeedUserDefinition> Users);
