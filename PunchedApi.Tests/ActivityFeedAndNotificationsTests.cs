using System.Reflection;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Tests;

/// <summary>
/// Covers the activity-feed (recent stamps), owner dashboard "Your team"
/// staff mini cards, and in-app notifications schemas wired for this backlog.
/// </summary>
public class ActivityFeedAndNotificationsTests
{
    [Fact]
    public void StampDto_HasAllActivityFeedProperties()
    {
        var dto = new StampDto
        {
            Id = Guid.NewGuid(),
            CustomerName = "Jane Doe",
            RewardDescription = "Free Coffee",
            Timestamp = DateTime.UtcNow,
            Source = StampSource.Scan
        };

        Assert.NotEqual(Guid.Empty, dto.Id);
        Assert.Equal("Jane Doe", dto.CustomerName);
        Assert.Equal("Free Coffee", dto.RewardDescription);
        Assert.True(dto.Timestamp <= DateTime.UtcNow);
        Assert.Equal(StampSource.Scan, dto.Source);
    }

    [Fact]
    public void StampDto_RewardDescription_IsNullable()
    {
        var dto = new StampDto { Id = Guid.NewGuid(), CustomerName = "A", Timestamp = DateTime.UtcNow, Source = StampSource.Enrollment };
        Assert.Null(dto.RewardDescription);
        dto.RewardDescription = "20% off";
        Assert.Equal("20% off", dto.RewardDescription);
    }

    [Fact]
    public void StaffMiniDto_HasAllDashboardProperties()
    {
        var dto = new StaffMiniDto
        {
            UserId = Guid.NewGuid(),
            FullName = "Staff One",
            AvatarUrl = null,
            StampsToday = 8,
            DailyGoal = 20,
            IsOnShift = true
        };

        Assert.NotEqual(Guid.Empty, dto.UserId);
        Assert.Equal("Staff One", dto.FullName);
        Assert.Null(dto.AvatarUrl);
        Assert.Equal(8, dto.StampsToday);
        Assert.Equal(20, dto.DailyGoal);
        Assert.True(dto.IsOnShift);
    }

    [Fact]
    public void BusinessDashboardResponse_ExposesStaffMiniList()
    {
        var resp = new BusinessDashboardResponse
        {
            BusinessId = Guid.NewGuid(),
            BusinessName = "B",
            StaffMini = new List<StaffMiniDto>
            {
                new() { UserId = Guid.NewGuid(), FullName = "X", DailyGoal = 10 }
            }
        };

        Assert.Single(resp.StaffMini);
        Assert.Equal(10, resp.StaffMini[0].DailyGoal);
    }

    [Fact]
    public void NotificationEntity_HasGoalReachedAndRewardReadyTypes()
    {
        var goal = new Notification { UserId = Guid.NewGuid(), Type = "GoalReached", StampsCount = 20, IsRead = false, CreatedAt = DateTime.UtcNow };
        var reward = new Notification { UserId = Guid.NewGuid(), Type = "RewardReady", StampsCount = 1, IsRead = false, CreatedAt = DateTime.UtcNow };

        Assert.Equal("GoalReached", goal.Type);
        Assert.Equal(20, goal.StampsCount);
        Assert.Equal("RewardReady", reward.Type);
        Assert.False(goal.IsRead);
    }

    [Fact]
    public void NotificationsService_ImplementsInterface()
    {
        var serviceType = typeof(PunchedApi.Application.Services.NotificationsService);
        var interfaceType = typeof(PunchedApi.Domain.Interfaces.INotificationsService);
        Assert.True(interfaceType.IsAssignableFrom(serviceType));
    }

    [Fact]
    public void BusinessController_HasActivityFeedAndNotificationsEndpoints()
    {
        var controllerType = typeof(PunchedApi.API.Controllers.BusinessController);
        var methods = controllerType.GetMethods(BindingFlags.Public | BindingFlags.Instance);

        var recent = methods.FirstOrDefault(m => m.Name == "GetRecentActivity");
        Assert.NotNull(recent);
        var recentHttp = recent!.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpGetAttribute>();
        Assert.NotNull(recentHttp);
        Assert.Equal("{businessId:guid}/activity/recent", recentHttp!.Template);

        var notifications = methods.FirstOrDefault(m => m.Name == "GetMyNotifications");
        Assert.NotNull(notifications);
        var notifHttp = notifications!.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpGetAttribute>();
        Assert.NotNull(notifHttp);
        Assert.Equal("me/notifications", notifHttp!.Template);
    }

    [Fact]
    public void StampService_ExposesNewMethods()
    {
        var serviceType = typeof(PunchedApi.Application.Services.StampService);
        Assert.NotNull(serviceType.GetMethod("GetRecentStampsAsync"));
        Assert.NotNull(serviceType.GetMethod("CreateEnrollmentStampAsync"));
        Assert.NotNull(serviceType.GetMethod("CreateScanStampAsync"));
    }

    [Fact]
    public void StampSource_ConstantsPresent()
    {
        Assert.Equal("scan", StampSource.Scan);
        Assert.Equal("enrollment", StampSource.Enrollment);
    }
}