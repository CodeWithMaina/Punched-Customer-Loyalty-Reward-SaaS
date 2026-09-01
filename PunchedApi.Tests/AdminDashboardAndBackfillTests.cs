using Microsoft.EntityFrameworkCore;
using Moq;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Programs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;

namespace PunchedApi.Tests;

/// <summary>
/// R8: AdminDashboard includes ChurnedBusinesses.
/// R7: IAdminService declares backfill methods.
/// </summary>
public class AdminDashboardAndBackfillTests
{
    private static ApplicationDbContext CreateContext(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationDbContext(options);
    }

    private static Business CreateBusiness(string name = "ActiveBiz", bool isDeleted = false) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Category = "cafe",
        Location = "Nairobi",
        MpesaNumber = "123456",
        OwnerId = Guid.NewGuid(),
        IsDeleted = isDeleted,
        CreatedAt = DateTime.UtcNow.AddDays(-30)
    };

    private static AdminService BuildAdminService(ApplicationDbContext context) =>
        new(
            new UnitOfWork(context),
            context,
            new Mock<IInsightService>().Object,
            new AnalyticsAggregationService(context, TestHelpers.CreateLogger<AnalyticsAggregationService>()),
            new SegmentationService(context, TestHelpers.CreateLogger<SegmentationService>()),
            new LoyaltyService(new UnitOfWork(context), context, new Mock<IStampService>().Object, new ProgramRuleEngine(), TestHelpers.CreateLogger<LoyaltyService>()),
            TestHelpers.CreateLogger<AdminService>());
[Fact]
    public async Task AdminDashboardAsync_IncludesChurnedBusinessesCount()
    {
        // Arrange
        using var context = CreateContext("AdminDashboard_01");
        var activeBiz = CreateBusiness("Active", false);
        var churnedBiz = CreateBusiness("Churned", true);
        await context.Businesses.AddRangeAsync(activeBiz, churnedBiz);
        await context.SaveChangesAsync();

        var adminService = BuildAdminService(context);

        // Act
        var result = await adminService.GetDashboardAsync();

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(1, result.Data.ChurnedBusinesses);
        Assert.Equal(2, result.Data.TotalBusinesses);
    }

    [Fact]
    public async Task BackfillAnalyticsAsync_ValidRange_ReturnsSuccess()
    {
        using var context = CreateContext("AdminBackfill_01");
        var business = CreateBusiness();
        var program = new LoyaltyProgram
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            Name = "Test Program",
            StampsRequired = 10,
            RewardValue = 500,
            RewardDescription = "Reward",
            IsActive = true
        };
        await context.Businesses.AddAsync(business);
        await context.LoyaltyPrograms.AddAsync(program);
        await context.SaveChangesAsync();

        var adminService = BuildAdminService(context);
        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var to = DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await adminService.BackfillAnalyticsAsync(from, to);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Contains("backfill", result.Data.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BackfillAnalyticsAsync_InvalidRange_ReturnsFailure()
    {
        using var context = CreateContext("AdminBackfill_02");
        var adminService = BuildAdminService(context);

        var from = DateOnly.FromDateTime(DateTime.UtcNow);
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var result = await adminService.BackfillAnalyticsAsync(from, to);

        Assert.False(result.Success);
        Assert.Equal("INVALID_RANGE", result.Error?.Code);
    }
[Fact]
    public async Task BackfillSegmentsAsync_ReturnsSuccess()
    {
        using var context = CreateContext("AdminBackfill_03");
        var adminService = BuildAdminService(context);

        var result = await adminService.BackfillSegmentsAsync();

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
    }

    [Fact]
    public async Task BackfillProgramHistoryAsync_ReturnsSuccess()
    {
        using var context = CreateContext("AdminBackfill_04");
        var business = CreateBusiness();
        var program = new LoyaltyProgram
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            Name = "Test Program",
            StampsRequired = 10,
            RewardValue = 500,
            RewardDescription = "Reward",
            IsActive = true
        };
        await context.Businesses.AddAsync(business);
        await context.LoyaltyPrograms.AddAsync(program);
        await context.SaveChangesAsync();

        var adminService = BuildAdminService(context);
        var result = await adminService.BackfillProgramHistoryAsync();

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.True(await context.LoyaltyProgramHistory.AnyAsync());
    }

    [Fact]
    public void IAdminService_Interface_HasBackfillMethods()
    {
        var interfaceType = typeof(IAdminService);
        Assert.NotNull(interfaceType.GetMethod("BackfillAnalyticsAsync"));
        Assert.NotNull(interfaceType.GetMethod("BackfillSegmentsAsync"));
        Assert.NotNull(interfaceType.GetMethod("BackfillProgramHistoryAsync"));
    }

    [Fact]
    public void IAnalyticsAggregationService_Interface_HasBackfillAllBusinesses()
    {
        var interfaceType = typeof(IAnalyticsAggregationService);
        Assert.NotNull(interfaceType.GetMethod("BackfillAllBusinessesAsync"));
        Assert.NotNull(interfaceType.GetMethod("BackfillBusinessAsync"));
    }

    [Fact]
    public void ISegmentationService_Interface_HasBackfillAllBusinesses()
    {
        var interfaceType = typeof(ISegmentationService);
        Assert.NotNull(interfaceType.GetMethod("BackfillAllBusinessesAsync"));
    }

    [Fact]
    public void ILoyaltyService_Interface_HasBackfillProgramHistory()
    {
        var interfaceType = typeof(ILoyaltyService);
        Assert.NotNull(interfaceType.GetMethod("BackfillProgramHistoryAsync"));
    }
}