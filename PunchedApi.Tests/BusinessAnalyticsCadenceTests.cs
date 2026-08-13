using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace PunchedApi.Tests;

public sealed class BusinessAnalyticsCadenceTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        await using var context = CreateContext();
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE loyalty_cards (
                id uuid PRIMARY KEY,
                business_id uuid NOT NULL
            );
            CREATE INDEX ix_loyalty_cards_business_id ON loyalty_cards (business_id);

            CREATE TABLE stamps (
                id uuid PRIMARY KEY,
                card_id uuid NOT NULL REFERENCES loyalty_cards(id),
                stamped_at timestamp with time zone NOT NULL
            );
            CREATE INDEX ix_stamps_card_id_stamped_at ON stamps (card_id, stamped_at);
            """);
    }

    public async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task VisitCadence_UsesPeriodPredecessorAndPreservesTenantIsolation()
    {
        await ResetAsync();
        var periodStart = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var businessId = Guid.NewGuid();
        var otherBusinessId = Guid.NewGuid();
        var returningCardId = Guid.NewGuid();
        var singleStampCardId = Guid.NewGuid();
        var duplicateStampCardId = Guid.NewGuid();
        var otherBusinessCardId = Guid.NewGuid();

        await InsertCardAsync(returningCardId, businessId);
        await InsertCardAsync(singleStampCardId, businessId);
        await InsertCardAsync(duplicateStampCardId, businessId);
        await InsertCardAsync(otherBusinessCardId, otherBusinessId);

        await InsertStampAsync(returningCardId, periodStart.AddDays(-2));
        await InsertStampAsync(returningCardId, periodStart.AddDays(2));
        await InsertStampAsync(returningCardId, periodStart.AddDays(5));
        await InsertStampAsync(singleStampCardId, periodStart.AddDays(1));
        await InsertStampAsync(duplicateStampCardId, periodStart.AddDays(-1));
        await InsertStampAsync(duplicateStampCardId, periodStart.AddHours(12));
        await InsertStampAsync(duplicateStampCardId, periodStart.AddHours(12));
        await InsertStampAsync(otherBusinessCardId, periodStart.AddDays(-100));
        await InsertStampAsync(otherBusinessCardId, periodStart.AddDays(1));

        await using var context = CreateContext();
        var cadence = await CreateService(context).ComputeVisitCadenceAsync(businessId, periodStart);

        Assert.Equal(2.12, cadence);
    }

    [Fact]
    public async Task VisitCadence_ReturnsNullForEmptyAndSingleStampCards()
    {
        await ResetAsync();
        var periodStart = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var businessId = Guid.NewGuid();
        var cardId = Guid.NewGuid();
        await InsertCardAsync(cardId, businessId);
        await InsertStampAsync(cardId, periodStart.AddDays(1));

        await using var context = CreateContext();
        var service = CreateService(context);

        Assert.Null(await service.ComputeVisitCadenceAsync(businessId, periodStart));
        Assert.Null(await service.ComputeVisitCadenceAsync(Guid.NewGuid(), periodStart));
    }

    [Fact]
    public async Task VisitCadence_HandlesTenThousandStampsSetBased()
    {
        await ResetAsync();
        var periodStart = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var businessId = Guid.NewGuid();
        var cardId = Guid.NewGuid();
        await InsertCardAsync(cardId, businessId);

        await using (var context = CreateContext())
        {
            await context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO stamps (id, card_id, stamped_at)
                SELECT md5(i::text)::uuid, {cardId}, {periodStart} + (i * interval '6 hours')
                FROM generate_series(0, 9999) AS series(i)
                """);
        }

        await using var assertionContext = CreateContext();
        var cadence = await CreateService(assertionContext).ComputeVisitCadenceAsync(businessId, periodStart);

        Assert.Equal(0.25, cadence);
    }

    private ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static BusinessService CreateService(ApplicationDbContext context) => new(
        Mock.Of<IUnitOfWork>(),
        context,
        Mock.Of<IInsightService>(),
        NullLogger<BusinessService>.Instance);

    private async Task ResetAsync()
    {
        await using var context = CreateContext();
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE stamps, loyalty_cards");
    }

    private async Task InsertCardAsync(Guid cardId, Guid businessId)
    {
        await using var context = CreateContext();
        await context.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO loyalty_cards (id, business_id) VALUES ({cardId}, {businessId})");
    }

    private async Task InsertStampAsync(Guid cardId, DateTime stampedAt)
    {
        await using var context = CreateContext();
        await context.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO stamps (id, card_id, stamped_at) VALUES ({Guid.NewGuid()}, {cardId}, {stampedAt})");
    }
}