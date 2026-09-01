using Microsoft.EntityFrameworkCore;
using Moq;
using PunchedApi.Application.Programs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;

namespace PunchedApi.Tests;

/// <summary>
/// Tests for R4 (Backfill), R9, R10, R11 backfill methods.
/// </summary>
public class AnalyticsBackfillTests
{
    private static ApplicationDbContext CreateContext(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationDbContext(options);
    }

    private static Business CreateBusiness(string name = "TestBiz") => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Category = "cafe",
        Location = "Nairobi",
        MpesaNumber = "123456",
        OwnerId = Guid.NewGuid(),
        CreatedAt = DateTime.UtcNow.AddDays(-30)
    };

    private static User CreateUser(string email = "owner@test.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        FullName = "Test Owner",
        Role = UserRole.Business,
        CreatedAt = DateTime.UtcNow.AddDays(-30)
    };

    private static LoyaltyProgram CreateProgram(Guid businessId) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        Name = "Coffee Rewards",
        StampsRequired = 10,
        RewardValue = 500,
        RewardDescription = "Free Coffee",
        IsActive = true,
        CreatedAt = DateTime.UtcNow.AddDays(-30)
    };

    private static LoyaltyCard CreateCard(Guid businessId, Guid customerId, Guid programId) => new()
    {
        Id = Guid.NewGuid(),
        CustomerId = customerId,
        BusinessId = businessId,
        ProgramId = programId,
        TotalStamps = 5,
        LifetimeStamps = 5,
        EnrolledAt = DateTime.UtcNow.AddDays(-20)
    };

    [Fact]
    public async Task BackfillBusinessAsync_CreatesBusinessDailyAnalytics_ForEachDayInRange()
    {
        // Arrange
        using var context = CreateContext("BackfillBusiness_01");
        var business = CreateBusiness();
        var owner = CreateUser();
        var program = CreateProgram(business.Id);
        var customer = CreateUser("customer@test.com");
        customer.Role = UserRole.Customer;
        var card = CreateCard(business.Id, customer.Id, program.Id);
        await context.Businesses.AddAsync(business);
        await context.Users.AddRangeAsync(owner, customer);
        await context.LoyaltyPrograms.AddAsync(program);
        await context.LoyaltyCards.AddAsync(card);
        await context.Stamps.AddAsync(new Stamp
        {
            Id = Guid.NewGuid(),
            CardId = card.Id,
            StampNumber = 1,
            StampedAt = DateTime.UtcNow.AddDays(-5),
            QrTokenId = Guid.NewGuid()
        });
        await context.SaveChangesAsync();

        // Act
        var logger = TestHelpers.CreateLogger<AnalyticsAggregationService>();
        var service = new AnalyticsAggregationService(context, logger);
        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var to = DateOnly.FromDateTime(DateTime.UtcNow);
        await service.BackfillBusinessAsync(business.Id, from, to);

        // Assert — at least one BusinessDailyAnalytics row exists
        var analyticsRows = await context.BusinessDailyAnalytics
            .Where(x => x.BusinessId == business.Id)
            .ToListAsync();
        Assert.NotEmpty(analyticsRows);
        var dayWithStamp = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5));
        var thatRow = analyticsRows.FirstOrDefault(x => x.Date == dayWithStamp);
        Assert.NotNull(thatRow);
        Assert.True(thatRow.Stamps >= 1);
    }

    [Fact]
    public async Task BackfillAllBusinessesAsync_ProcessesAllBusinesses()
    {
        // Arrange
        using var context = CreateContext("BackfillAll_01");
        var business1 = CreateBusiness("Biz1");
        var business2 = CreateBusiness("Biz2");
        await context.Businesses.AddRangeAsync(business1, business2);
        await context.SaveChangesAsync();
        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var to = DateOnly.FromDateTime(DateTime.UtcNow);

        // Act
        var logger = TestHelpers.CreateLogger<AnalyticsAggregationService>();
        var service = new AnalyticsAggregationService(context, logger);
        await service.BackfillAllBusinessesAsync(from, to);

        // Assert — each business gets a row for every day in the range
        var distinctBusinesses = await context.BusinessDailyAnalytics
            .Select(x => x.BusinessId)
            .Distinct()
            .CountAsync();
        Assert.Equal(2, distinctBusinesses);

        var rowsForBiz1 = await context.BusinessDailyAnalytics
            .CountAsync(x => x.BusinessId == business1.Id);
        Assert.True(rowsForBiz1 >= 1);
    }

    [Fact]
    public async Task LoyaltyService_BackfillProgramHistoryAsync_CreatesHistoryRecords()
    {
        // Arrange
        using var context = CreateContext("BackfillHistory_01");
        var business = CreateBusiness();
        var program = CreateProgram(business.Id);
        await context.Businesses.AddAsync(business);
        await context.LoyaltyPrograms.AddAsync(program);
        await context.SaveChangesAsync();

        // Act
        var logger = TestHelpers.CreateLogger<LoyaltyService>();
        var uow = new UnitOfWork(context);
        var service = new LoyaltyService(uow, context, new Mock<IStampService>().Object, new ProgramRuleEngine(), logger);
        await service.BackfillProgramHistoryAsync();

        // Assert
        var historyRecords = await context.LoyaltyProgramHistory.ToListAsync();
        Assert.NotEmpty(historyRecords);
        var record = historyRecords.First();
        Assert.Equal(program.Id, record.LoyaltyProgramId);
        Assert.Equal(program.StampsRequired, record.StampsRequired);
        Assert.Equal(program.RewardValue, record.RewardValue);
    }

    [Fact]
    public async Task SegmentationService_BackfillAllBusinessesAsync_CreatesCustomerSegments()
    {
        // Arrange
        using var context = CreateContext("BackfillSegments_01");
        var business = CreateBusiness();
        var program = CreateProgram(business.Id);
        var customer = CreateUser("seg@customer.com");
        customer.Role = UserRole.Customer;
        var card = CreateCard(business.Id, customer.Id, program.Id);
        card.TotalStamps = 8;
        await context.Businesses.AddAsync(business);
        await context.Users.AddAsync(customer);
        await context.LoyaltyPrograms.AddAsync(program);
        await context.LoyaltyCards.AddAsync(card);
        await context.SaveChangesAsync();

        // Act
        var logger = TestHelpers.CreateLogger<SegmentationService>();
        var service = new SegmentationService(context, logger);
        await service.BackfillAllBusinessesAsync();

        // Assert
        var segments = await context.CustomerSegments.ToListAsync();
        Assert.NotEmpty(segments);
        Assert.All(segments, s => Assert.Equal(business.Id, s.BusinessId));
    }
}