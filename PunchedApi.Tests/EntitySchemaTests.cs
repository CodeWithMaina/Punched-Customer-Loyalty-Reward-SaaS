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
}