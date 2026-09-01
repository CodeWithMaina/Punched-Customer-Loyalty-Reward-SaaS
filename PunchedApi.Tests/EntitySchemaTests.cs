using PunchedApi.Domain.Entities;

namespace PunchedApi.Tests;

/// <summary>
/// R1: Verify BusinessDailyAnalytics entity has all required columns.
/// R2: Verify StaffDailyAnalytics entity has all required columns.
/// </summary>
public class EntitySchemaTests
{
    [Fact]
    public void BusinessDailyAnalytics_HasAllRequiredColumns()
    {
        // Arrange
        var analytics = new BusinessDailyAnalytics
        {
            BusinessId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Stamps = 100,
            DistinctCustomers = 50,
            NewEnrollments = 5,
            Redemptions = 10,
            PayoutKes = 2500.50m,
            AccruedLiabilityKes = 1250.25m,
            RewardReadyCustomers = 3,
            UpdatedAt = DateTime.UtcNow
        };

        // Assert — all properties are set without error
        Assert.NotNull(analytics);
        Assert.NotEqual(Guid.Empty, analytics.BusinessId);
        Assert.True(analytics.Stamps >= 0);
        Assert.True(analytics.DistinctCustomers >= 0);
        Assert.True(analytics.NewEnrollments >= 0);
        Assert.True(analytics.Redemptions >= 0);
        Assert.True(analytics.PayoutKes >= 0);
        Assert.True(analytics.AccruedLiabilityKes >= 0);
        Assert.True(analytics.RewardReadyCustomers >= 0);
        Assert.True(analytics.UpdatedAt <= DateTime.UtcNow);
    }

    [Fact]
    public void StaffDailyAnalytics_HasAllRequiredColumns()
    {
        // Arrange
        var staffAnalytics = new StaffDailyAnalytics
        {
            StaffUserId = Guid.NewGuid(),
            BusinessId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Stamps = 50,
            DistinctCustomers = 25,
            NewCustomers = 2,
            RewardReadyCreated = 1,
            UpdatedAt = DateTime.UtcNow
        };

        // Assert
        Assert.NotNull(staffAnalytics);
        Assert.NotEqual(Guid.Empty, staffAnalytics.StaffUserId);
        Assert.NotEqual(Guid.Empty, staffAnalytics.BusinessId);
        Assert.True(staffAnalytics.Stamps >= 0);
        Assert.True(staffAnalytics.DistinctCustomers >= 0);
        Assert.True(staffAnalytics.NewCustomers >= 0);
        Assert.True(staffAnalytics.RewardReadyCreated >= 0);
    }

    [Fact]
    public void CustomerSegment_HasAllRequiredColumns()
    {
        // Arrange
        var segment = new CustomerSegment
        {
            BusinessId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            Segment = "active",
            Score = 42,
            ComputedAt = DateTime.UtcNow,
            LastStampAt = DateTime.UtcNow.AddDays(-1)
        };

        // Assert
        Assert.Equal("active", segment.Segment);
        Assert.True(segment.Score >= 0);
    }

    [Fact]
    public void LoyaltyProgramHistory_HasAllRequiredColumns()
    {
        // Arrange
        var history = new LoyaltyProgramHistory
        {
            LoyaltyProgramId = Guid.NewGuid(),
            StampsRequired = 10,
            RewardValue = 500m,
            RewardDescription = "Free Coffee",
            EffectiveFrom = DateTime.UtcNow.AddDays(-30),
            EffectiveTo = null,
            ChangedByUserId = null,
            CreatedAt = DateTime.UtcNow
        };

        // Assert
        Assert.NotEqual(Guid.Empty, history.LoyaltyProgramId);
        Assert.Equal(10, history.StampsRequired);
        Assert.Equal(500m, history.RewardValue);
        Assert.Equal("Free Coffee", history.RewardDescription);
        Assert.True(history.EffectiveTo == null);
    }

    [Fact]
    public void StampAdjustment_HasAllRequiredColumns()
    {
        var adj = new StampAdjustment
        {
            Id = Guid.NewGuid(),
            CardId = Guid.NewGuid(),
            AdjustedByUserId = Guid.NewGuid(),
            AdjustedByRole = "Business",
            Delta = -2,
            Reason = StampAdjustmentReason.VoidMistake,
            Note = "Customer requested correction",
            CreatedAt = DateTime.UtcNow
        };

        Assert.NotEqual(Guid.Empty, adj.Id);
        Assert.NotEqual(Guid.Empty, adj.CardId);
        Assert.Equal(-2, adj.Delta);
        Assert.Equal(StampAdjustmentReason.VoidMistake, adj.Reason);
        Assert.Equal("Customer requested correction", adj.Note);
        Assert.NotNull(adj.AdjustedByUserId);
    }

    [Fact]
    public void StampAdjustmentReason_ExposesAllReasons()
    {
        Assert.Equal(StampAdjustmentReason.VoidMistake,
            Enum.Parse<StampAdjustmentReason>("VoidMistake"));
        Assert.True(Enum.IsDefined(typeof(StampAdjustmentReason), StampAdjustmentReason.ManualCorrection));
        Assert.True(Enum.IsDefined(typeof(StampAdjustmentReason), StampAdjustmentReason.Goodwill));
        Assert.True(Enum.IsDefined(typeof(StampAdjustmentReason), StampAdjustmentReason.SystemFix));
    }

    [Fact]
    public void IdempotencyKey_HasAllRequiredColumns()
    {
        var key = new IdempotencyKey
        {
            Id = Guid.NewGuid(),
            Key = "scan-2026-08-30-0001",
            UserId = Guid.NewGuid(),
            RequestHash = "abc123",
            ResponseJson = "{}",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        Assert.NotEqual(Guid.Empty, key.Id);
        Assert.Equal("scan-2026-08-30-0001", key.Key);
        Assert.NotEqual(Guid.Empty, key.UserId);
        Assert.Equal("{}", key.ResponseJson);
        Assert.True(key.ExpiresAt > key.CreatedAt);
    }

    [Fact]
    public void Redemption_StatusEnum_DefaultsToPending_AndExposesNewColumns()
    {
        var redemption = new Redemption();
        Assert.Equal(RedemptionStatus.Pending, redemption.Status);
        Assert.False(redemption.CodeLocked);
        Assert.Equal(0, redemption.FailedAttempts);
        Assert.Equal(0, redemption.StampsConsumed);
        Assert.Null(redemption.FulfilledByUserId);
        Assert.Null(redemption.FulfilledAt);
        Assert.Null(redemption.FulfilmentCodeHash);

        var values = Enum.GetValues<RedemptionStatus>();
        Assert.Contains(RedemptionStatus.Pending, values);
        Assert.Contains(RedemptionStatus.Fulfilled, values);
        Assert.Contains(RedemptionStatus.Cancelled, values);
    }

    [Fact]
    public void LoyaltyProgram_StampExpiryDays_And_MaxStampsPerVisitColumns()
    {
        var program = new LoyaltyProgram
        {
            MaxStampsPerVisit = 3,
            StampExpiryDays = 30
        };
        Assert.Equal(3, program.MaxStampsPerVisit);
        Assert.Equal(30, program.StampExpiryDays);
    }
}