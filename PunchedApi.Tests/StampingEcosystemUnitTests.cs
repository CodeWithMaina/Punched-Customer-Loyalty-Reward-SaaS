using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;
using Xunit;

namespace PunchedApi.Tests;

/// <summary>
/// Phase 4–6 stamping-ecosystem unit + integration tests (SQLite in-memory).
/// Covers: claim idempotency, fulfilment-code verify/lock, expiry + win-back
/// workers (NotificationLog dedupe), idempotency purge, adjust validation,
/// award idempotency replay/conflict, cross-business token rejection,
/// award-vs-claim race guarantees, redemption status CHECK constraint, and
/// rate-limit policy wiring on the stamping endpoints.
///
/// Races: SQLite in-memory allows a single writer per connection, so the
/// same-token double-award guarantee is asserted deterministically (the
/// conditional token UPDATE makes the second award fail TOKEN_USED); true
/// concurrency is exercised under PostgreSQL by the k6 load script
/// (e2e/load/award.js).
/// </summary>
public class StampingEcosystemTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ApplicationDbContext _db;

    public StampingEcosystemTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new ApplicationDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    // ── Seed helpers ─────────────────────────────────────────────

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed record Tenant(User Customer, User Staff, User Owner, Business Business, LoyaltyProgram Program, LoyaltyCard Card);

    private async Task<Tenant> SeedTenantAsync(
        int stampsRequired = 5,
        int totalStamps = 0,
        int lifetimeStamps = 0,
        int? stampExpiryDays = null,
        DateTime? lastStampAt = null)
    {
        var customer = BookingTestBase.CreateCustomer("cust+" + Guid.NewGuid().ToString("N")[..8] + "@t.com");
        var owner = BookingTestBase.CreateOwner("own+" + Guid.NewGuid().ToString("N")[..8] + "@t.com");
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var staff = BookingTestBase.CreateStaff(business.Id, "stf+" + Guid.NewGuid().ToString("N")[..8] + "@t.com");
        var program = new LoyaltyProgram
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            Name = "Coffee",
            StampsRequired = 5,
            RewardValue = 500,
            RewardDescription = "Free Coffee",
            MaxStampsPerVisit = 3,
            StampExpiryDays = stampExpiryDays,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var card = new LoyaltyCard
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            BusinessId = business.Id,
            ProgramId = program.Id,
            TotalStamps = totalStamps,
            LifetimeStamps = lifetimeStamps,
            LastStampAt = lastStampAt,
            EnrolledAt = DateTime.UtcNow.AddDays(-60),
            CreatedAt = DateTime.UtcNow.AddDays(-60)
        };

        _db.AddRange(customer, owner, business, staff, program, card);
        // LifetimeStamps must always be ≥ TotalStamps (chk_lifetime_gte_total).
        card.LifetimeStamps = Math.Max(lifetimeStamps, totalStamps);
        await _db.SaveChangesAsync();
        return new Tenant(customer, staff, owner, business, program, card);
    }

    private async Task<QrToken> SeedTokenAsync(Tenant t, string plainToken, bool used = false)
    {
        var token = new QrToken
        {
            Id = Guid.NewGuid(),
            CustomerId = t.Customer.Id,
            BusinessId = t.Business.Id,
            TokenHash = HashToken(plainToken),
            ExpiresAt = DateTime.UtcNow.AddMinutes(1),
            IsUsed = used,
            CreatedAt = DateTime.UtcNow
        };
        _db.QrTokens.Add(token);
        await _db.SaveChangesAsync();
        return token;
    }

    private StampService CreateStampService(Tenant t)
    {
        var scopeResolver = new Mock<IBusinessScopeResolver>();
        scopeResolver.Setup(r => r.GetOwnedBusinessIdAsync(t.Owner.Id)).ReturnsAsync(t.Business.Id);
        return new StampService(
            new UnitOfWork(_db),
            _db,
            new Mock<ISseService>().Object,
            new Mock<IReferralService>().Object,
            new Mock<IEmailService>().Object,
            new Mock<IAnalyticsAggregationService>().Object,
            new NotificationsService(new UnitOfWork(_db), _db, NullLogger<NotificationsService>.Instance),
            scopeResolver.Object,
            new PermissionService(),
            new IdempotencyService(new UnitOfWork(_db), _db, NullLogger<IdempotencyService>.Instance),
            NullLogger<StampService>.Instance);
    }

    private RedemptionService CreateRedemptionService(Tenant t)
    {
        var scopeResolver = new Mock<IBusinessScopeResolver>();
        scopeResolver.Setup(r => r.GetOwnedBusinessIdAsync(t.Owner.Id)).ReturnsAsync(t.Business.Id);
        return new RedemptionService(
            new UnitOfWork(_db),
            _db,
            new Mock<IAnalyticsAggregationService>().Object,
            scopeResolver.Object,
            new PermissionService(),
            new NotificationsService(new UnitOfWork(_db), _db, NullLogger<NotificationsService>.Instance),
            new Mock<ISseService>().Object,
            new IdempotencyService(new UnitOfWork(_db), _db, NullLogger<IdempotencyService>.Instance),
            NullLogger<RedemptionService>.Instance);
    }

    private StampingMaintenanceService CreateMaintenanceService()
        => new(_db, NullLogger<StampingMaintenanceService>.Instance);

    private StampAdjustmentRequest AdjustRequest(Guid cardId, int delta) =>
        new() { CardId = cardId, Delta = delta, Reason = StampAdjustmentReason.ManualCorrection, Note = "test" };

    // ── Adjustment validation ────────────────────────────────────

    [Fact]
    public async Task Adjust_ZeroDelta_IsRejected()
    {
        var t = await SeedTenantAsync(totalStamps: 3);
        var svc = CreateStampService(t);
        var res = await svc.AdjustStampsAsync(t.Owner.Id, AdjustRequest(t.Card.Id, 0));
        Assert.False(res.Success);
        Assert.Equal("INVALID_DELTA", res.Error!.Code);
    }

    [Fact]
    public async Task Adjust_NegativeResultingTotal_IsRejected()
    {
        var t = await SeedTenantAsync(totalStamps: 2);
        var svc = CreateStampService(t);
        var res = await svc.AdjustStampsAsync(t.Owner.Id, AdjustRequest(t.Card.Id, -5));
        Assert.False(res.Success);
        Assert.Equal("ADJUSTMENT_BELOW_ZERO", res.Error!.Code);
    }

    [Fact]
    public async Task Adjust_Success_WritesApiEventLogWithBeforeAfterCounters()
    {
        var t = await SeedTenantAsync(totalStamps: 3);
        var svc = CreateStampService(t);
        var res = await svc.AdjustStampsAsync(t.Owner.Id, AdjustRequest(t.Card.Id, +2));
        Assert.True(res.Success);

        var log = await _db.ApiEventLogs.SingleAsync(e => e.Endpoint == "POST /v1/stamps/adjust");
        Assert.Equal(t.Owner.Id, log.UserId);
        Assert.Equal(t.Business.Id, log.TenantId);
        Assert.NotNull(log.DetailsJson);
        using var doc = JsonDocument.Parse(log.DetailsJson!);
        var root = doc.RootElement;
        Assert.Equal(3, root.GetProperty("before").GetProperty("totalStamps").GetInt32());
        Assert.Equal(5, root.GetProperty("after").GetProperty("totalStamps").GetInt32());
        Assert.Equal(2, root.GetProperty("delta").GetInt32());
        Assert.Equal(t.Card.Id, root.GetProperty("cardId").GetGuid());
    }

    [Fact]
    public async Task Adjust_Staff_IsForbidden()
    {
        var t = await SeedTenantAsync(totalStamps: 1);
        var svc = CreateStampService(t);
        var res = await svc.AdjustStampsAsync(t.Staff.Id, AdjustRequest(t.Card.Id, +1));
        Assert.False(res.Success);
        Assert.Equal("FORBIDDEN", res.Error!.Code);
    }

    // ── Award: idempotency, race, cross-business ─────────────────

    private AwardStampRequest AwardRequest(Tenant t, string token, int? stampCount = null) =>
        new() { Token = token, BusinessId = t.Business.Id, StampCount = stampCount };

    [Fact]
    public async Task Award_SameTokenTwice_SecondFailsTokenUsed()
    {
        var t = await SeedTenantAsync();
        var svc = CreateStampService(t);
        const string token = "tok-race-1";
        await SeedTokenAsync(t, token);

        var first = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token));
        Assert.True(first.Success);

        // Re-presenting the same (now-consumed) token can never double-stamp.
        var second = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token));
        Assert.False(second.Success);
        Assert.Equal("TOKEN_USED", second.Error!.Code);

        var card = await _db.LoyaltyCards.SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(1, card.LifetimeStamps);
    }
    [Fact]
    public async Task Award_WithIdempotencyKey_ReplaysStoredResponse()
    {
        var t = await SeedTenantAsync();
        var svc = CreateStampService(t);
        const string token = "tok-idem-1";
        await SeedTokenAsync(t, token);

        var key = "idem-key-award-1";
        var first = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token), key);
        var second = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token), key);

        Assert.True(first.Success);
        Assert.True(second.Success);
        Assert.Equal(first.Data!.StampNumber, second.Data!.StampNumber);

        // Exactly one stamp ledger row — replay did not re-execute.
        var stampCount = await _db.Stamps.CountAsync(s => s.CardId == t.Card.Id);
        Assert.Equal(1, stampCount);
    }

    [Fact]
    public async Task Award_SameKeyDifferentBody_ReturnsIdempotencyConflict()
    {
        var t = await SeedTenantAsync();
        var svc = CreateStampService(t);
        const string token = "tok-idem-2";
        await SeedTokenAsync(t, token);

        var first = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token), "idem-key-2");
        Assert.True(first.Success);

        // Same key, different body (StampCount differs) → 409 semantics.
        var conflicting = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token, 2), "idem-key-2");
        Assert.False(conflicting.Success);
        Assert.Equal("IDEMPOTENCY_CONFLICT", conflicting.Error!.Code);
    }

    [Fact]
    public async Task Award_TokenFromAnotherBusiness_IsRejected()
    {
        // Tenant A issues the token; staff of tenant B scans it.
        var a = await SeedTenantAsync();
        var b = await SeedTenantAsync();
        await SeedTokenAsync(a, "tok-cross");

        var svcB = CreateStampService(b);
        var res = await svcB.AwardStampAsync(b.Staff.Id, new AwardStampRequest
        {
            Token = "tok-cross",
            BusinessId = b.Business.Id
        });

        Assert.False(res.Success);
        Assert.Equal("INVALID_TOKEN", res.Error!.Code);
        Assert.Equal(0, b.Card.LifetimeStamps);
    }

    [Fact]
    public async Task Award_ExpiredToken_IsRejected()
    {
        var t = await SeedTenantAsync();
        const string token = "tok-expired";
        var qr = await SeedTokenAsync(t, token);
        qr.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await _db.SaveChangesAsync();

        var svc = CreateStampService(t);
        var res = await svc.AwardStampAsync(t.Staff.Id, AwardRequest(t, token));
        Assert.False(res.Success);
        Assert.Equal("TOKEN_EXPIRED", res.Error!.Code);
    }

    // ── Claim: idempotency + fulfilment code ─────────────────────

    [Fact]
    public async Task Claim_WithIdempotencyKey_ReplaysStoredResponse()
    {
        var t = await SeedTenantAsync(totalStamps: 5, lifetimeStamps: 5);
        var svc = CreateRedemptionService(t);

        var first = await svc.ClaimRewardAsync(t.Customer.Id,
            new ClaimRewardRequest { CardId = t.Card.Id }, "claim-key-1");
        var second = await svc.ClaimRewardAsync(t.Customer.Id,
            new ClaimRewardRequest { CardId = t.Card.Id }, "claim-key-1");

        Assert.True(first.Success);
        Assert.True(second.Success);
        Assert.Equal(first.Data!.Id, second.Data!.Id);
        Assert.Equal(6, first.Data!.FulfilmentCode!.Length);

        // Exactly one redemption row.
        var count = await _db.Redemptions.CountAsync(r => r.CardId == t.Card.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task Claim_SameKeyDifferentBody_ReturnsIdempotencyConflict()
    {
        var t = await SeedTenantAsync(totalStamps: 5, lifetimeStamps: 5);
        var other = await SeedTenantAsync(totalStamps: 5, lifetimeStamps: 5);
        var svc = CreateRedemptionService(t);

        var first = await svc.ClaimRewardAsync(t.Customer.Id,
            new ClaimRewardRequest { CardId = t.Card.Id }, "claim-key-2");
        Assert.True(first.Success);

        var conflicting = await svc.ClaimRewardAsync(t.Customer.Id,
            new ClaimRewardRequest { CardId = other.Card.Id }, "claim-key-2");
        Assert.False(conflicting.Success);
        Assert.Equal("IDEMPOTENCY_CONFLICT", conflicting.Error!.Code);
    }

    [Fact]
    public async Task Claim_WithoutThreshold_ReturnsInsufficientStamps()
    {
        var t = await SeedTenantAsync(totalStamps: 2);
        var svc = CreateRedemptionService(t);
        var res = await svc.ClaimRewardAsync(t.Customer.Id, new ClaimRewardRequest { CardId = t.Card.Id });
        Assert.False(res.Success);
        Assert.Equal("INSUFFICIENT_STAMPS", res.Error!.Code);
    }

    private async Task<(Tenant t, Redemption redemption, string code)> ClaimPendingAsync()
    {
        var t = await SeedTenantAsync(totalStamps: 5, lifetimeStamps: 5);
        var svc = CreateRedemptionService(t);
        var claim = await svc.ClaimRewardAsync(t.Customer.Id, new ClaimRewardRequest { CardId = t.Card.Id });
        Assert.True(claim.Success);
        var code = claim.Data!.FulfilmentCode!;
        // The claim consumed stamps via ExecuteUpdateAsync (bypasses the change
        // tracker); clear so later reads see DB state, not stale tracked entities.
        _db.ChangeTracker.Clear();
        var redemption = await _db.Redemptions.AsNoTracking().SingleAsync(r => r.Id == claim.Data!.Id);
        return (t, redemption, code);
    }

    [Fact]
    public async Task Fulfill_CorrectCode_MarksFulfilled()
    {
        var (t, redemption, code) = await ClaimPendingAsync();
        var svc = CreateRedemptionService(t);

        var res = await svc.FulfillRedemptionAsync(t.Staff.Id, new FulfillRedemptionRequest
        {
            CardId = t.Card.Id,
            BusinessId = t.Business.Id,
            Code = code
        });

        Assert.True(res.Success);
        Assert.Equal("Fulfilled", res.Data!.Status);
        var reloaded = await _db.Redemptions.SingleAsync(r => r.Id == redemption.Id);
        Assert.Equal(RedemptionStatus.Fulfilled, reloaded.Status);
        Assert.Equal(t.Staff.Id, reloaded.FulfilledByUserId);
    }

    [Fact]
    public async Task Fulfill_WrongCode_FourTimesInvalid_FifthLocks()
    {
        var (t, redemption, code) = await ClaimPendingAsync();
        var svc = CreateRedemptionService(t);
        FulfillRedemptionRequest Wrong() => new() { CardId = t.Card.Id, BusinessId = t.Business.Id, Code = "XXXXXX" };

        for (var i = 0; i < 4; i++)
        {
            var res = await svc.FulfillRedemptionAsync(t.Staff.Id, Wrong());
            Assert.False(res.Success);
            Assert.Equal("INVALID_CODE", res.Error!.Code);
        }

        // 5th wrong attempt → code locked (423 semantics).
        var fifth = await svc.FulfillRedemptionAsync(t.Staff.Id, new FulfillRedemptionRequest
        { CardId = t.Card.Id, BusinessId = t.Business.Id, Code = "XXXXXX" });
        Assert.False(fifth.Success);
        Assert.Equal("CODE_LOCKED", fifth.Error!.Code);

        // Even the CORRECT code is rejected once locked.
        var correct = await svc.FulfillRedemptionAsync(t.Staff.Id, new FulfillRedemptionRequest
        { CardId = t.Card.Id, BusinessId = t.Business.Id, Code = code });
        Assert.False(correct.Success);
        Assert.Equal("CODE_LOCKED", correct.Error!.Code);
    }

    [Fact]
    public async Task Cancel_RestoresExactlyStampsConsumed()
    {
        var (t, redemption, _) = await ClaimPendingAsync();
        var svc = CreateRedemptionService(t);

        var res = await svc.CancelRedemptionAsync(t.Owner.Id, redemption.Id, new CancelRedemptionRequest { Note = "oops" });
        Assert.True(res.Success, $"Cancel failed: {res.Error?.Code} - {res.Error?.Message}");
        Assert.Equal(5, res.Data!.StampsRestored);

        var card = await _db.LoyaltyCards.SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(5, card.TotalStamps);
        var reloaded = await _db.Redemptions.SingleAsync(r => r.Id == redemption.Id);
        Assert.Equal(RedemptionStatus.Cancelled, reloaded.Status);
    }

    // ── Expiry worker ────────────────────────────────────────────

    [Fact]
    public async Task ExpiryWorker_ResetsTotalStamps_PastStampExpiryDays()
    {
        var t = await SeedTenantAsync(totalStamps: 4, lifetimeStamps: 4,
            stampExpiryDays: 30, lastStampAt: DateTime.UtcNow.AddDays(-40));
        var svc = CreateMaintenanceService();

        var expired = await svc.ExpireStampsAsync();
        Assert.Equal(1, expired);

        _db.ChangeTracker.Clear();
        var card = await _db.LoyaltyCards.AsNoTracking().SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(0, card.TotalStamps);
        Assert.Equal(4, card.LifetimeStamps); // never touched

        // Notification + dedupe log exist; re-run never notifies again.
        var log = await _db.NotificationLogs.SingleAsync(n => n.UserId == t.Customer.Id);
        Assert.Equal("StampExpiry", log.TemplateType);
        var second = await svc.ExpireStampsAsync();
        Assert.Equal(0, second);
        Assert.Equal(1, await _db.NotificationLogs.CountAsync(n => n.TemplateType == "StampExpiry"));

        _db.ChangeTracker.Clear();
        var reloadedCard = await _db.LoyaltyCards.AsNoTracking().SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(0, reloadedCard.TotalStamps);
        Assert.Equal(4, reloadedCard.LifetimeStamps);
    }

    [Fact]
    public async Task ExpiryWorker_BoundaryDayNotYetPast_DoesNotExpire()
    {
        // LastStampAt 29.9 days ago with 30-day expiry → not yet expired.
        var t = await SeedTenantAsync(totalStamps: 4, lifetimeStamps: 4,
            stampExpiryDays: 30, lastStampAt: DateTime.UtcNow.AddDays(0.1 - 30));
        var svc = CreateMaintenanceService();

        var expired = await svc.ExpireStampsAsync();
        Assert.Equal(0, expired);
        var card = await _db.LoyaltyCards.SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(4, card.TotalStamps);
    }

    [Fact]
    public async Task ExpiryWorker_NullStampExpiryDays_NeverExpires()
    {
        var t = await SeedTenantAsync(totalStamps: 4, lifetimeStamps: 4,
            stampExpiryDays: null, lastStampAt: DateTime.UtcNow.AddDays(-365));
        var svc = CreateMaintenanceService();

        var expired = await svc.ExpireStampsAsync();
        Assert.Equal(0, expired);
        var card = await _db.LoyaltyCards.SingleAsync(c => c.Id == t.Card.Id);
        Assert.Equal(4, card.TotalStamps);
    }

    // ── Win-back worker ──────────────────────────────────────────

    [Fact]
    public async Task WinBack_InactiveCustomer_NudgedOncePerBusiness()
    {
        var t = await SeedTenantAsync(totalStamps: 2, lifetimeStamps: 8,
            lastStampAt: DateTime.UtcNow.AddDays(-45));
        var svc = CreateMaintenanceService();

        var sent = await svc.SendWinBackNotificationsAsync(30);
        Assert.Equal(1, sent);

        var log = await _db.NotificationLogs.SingleAsync(n => n.TemplateType == "WinBackNudge");
        Assert.Equal(t.Customer.Id, log.UserId);
        Assert.Equal(t.Business.Id, log.BusinessId);
        Assert.Equal(1, await _db.Notifications.CountAsync(n => n.Type == "WinBackNudge"));

        // Re-run: deduped via NotificationLog.
        var second = await svc.SendWinBackNotificationsAsync(30);
        Assert.Equal(0, second);
        Assert.Equal(1, await _db.NotificationLogs.CountAsync(n => n.TemplateType == "WinBackNudge"));
    }

    [Fact]
    public async Task WinBack_RecentCustomer_NotNudged()
    {
        var t = await SeedTenantAsync(totalStamps: 2, lifetimeStamps: 2,
            lastStampAt: DateTime.UtcNow.AddDays(-3));
        var svc = CreateMaintenanceService();

        var sent = await svc.SendWinBackNotificationsAsync(30);
        Assert.Equal(0, sent);
        Assert.Equal(0, await _db.NotificationLogs.CountAsync());
    }

    // ── Idempotency purge (CleanupService) ───────────────────────

    [Fact]
    public async Task IdempotencyPurge_RemovesOnlyExpiredKeys()
    {
        var t = await SeedTenantAsync();
        _db.IdempotencyKeys.AddRange(
            new IdempotencyKey
            {
                Id = Guid.NewGuid(), Key = "k-expired", UserId = t.Staff.Id,
                RequestHash = "h", ResponseJson = "{}",
                CreatedAt = DateTime.UtcNow.AddDays(-2), ExpiresAt = DateTime.UtcNow.AddHours(-1)
            },
            new IdempotencyKey
            {
                Id = Guid.NewGuid(), Key = "k-live", UserId = t.Staff.Id,
                RequestHash = "h", ResponseJson = "{}",
                CreatedAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddHours(20)
            });
        await _db.SaveChangesAsync();

        var deleted = await CleanupService.CleanIdempotencyKeysAsync(_db, DateTime.UtcNow, CancellationToken.None);

        Assert.Equal(1, deleted);
        Assert.Null(await _db.IdempotencyKeys.FirstOrDefaultAsync(k => k.Key == "k-expired"));
        Assert.NotNull(await _db.IdempotencyKeys.FirstOrDefaultAsync(k => k.Key == "k-live"));
    }

    // ── Schema / Phase 6 risk sign-off ───────────────────────────

    [Fact]
    public void Redemptions_StatusCheckConstraint_IsPresent()
    {
        var ddl = _db.Database
            .SqlQueryRaw<string>("SELECT sql AS Value FROM sqlite_master WHERE type = 'table' AND name = 'redemptions'")
            .ToList().Single();
        Assert.Contains("CHECK", ddl);
    }

    [Fact]
    public async Task Redemptions_CannotHoldStatusOutsidePendingFulfilledCancelled()
    {
        // CHECK constraint present → a direct SQL insert with an out-of-range status fails.
        var t = await SeedTenantAsync();
        var sql = @"INSERT INTO redemptions (id, card_id, business_id, reward_value, status, redeemed_at, created_at)
                    VALUES ({0}, {1}, {2}, 100, 7, {3}, {3})";
        await Assert.ThrowsAnyAsync<Exception>(() =>
            _db.Database.ExecuteSqlRawAsync(sql, Guid.NewGuid(), t.Card.Id, t.Business.Id, DateTime.UtcNow));
    }

    [Fact]
    public async Task ApiEventLogs_HasDetailsJsonColumn()
    {
        var columns = await _db.Database
            .SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('api_event_logs')")
            .ToListAsync();
        Assert.Contains("details_json", columns);
    }

    // ── Rate-limit wiring (Phase 4) ──────────────────────────────

    [Fact]
    public void StampEndpoints_CarryExpectedRateLimitPolicies()
    {
        Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute PolicyOf(System.Reflection.MethodInfo m) =>
            (Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute)m
                .GetCustomAttributes(typeof(Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute), true).Single();

        var award = PolicyOf(typeof(PunchedApi.API.Controllers.StampController)
            .GetMethod("AwardStamp")!);
        Assert.Equal("stamp-award", award.PolicyName);

        var enroll = PolicyOf(typeof(PunchedApi.API.Controllers.EnrollAndStampController)
            .GetMethod("EnrollAndStamp")!);
        Assert.Equal("stamp-enroll", enroll.PolicyName);

        var lookup = PolicyOf(typeof(PunchedApi.API.Controllers.StampController)
            .GetMethod("ManualLookup")!);
        Assert.Equal("manual-lookup", lookup.PolicyName);
    }
}

