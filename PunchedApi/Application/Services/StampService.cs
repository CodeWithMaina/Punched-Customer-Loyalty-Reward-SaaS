using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class StampService : IStampService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ISseService _sseService;
    private readonly IReferralService _referralService;
    private readonly IEmailService _emailService;
        private readonly IAnalyticsAggregationService _analyticsAggregationService;
    private readonly INotificationsService _notificationsService;
        private readonly IBusinessScopeResolver _businessScopeResolver;
    private readonly IPermissionService _permissionService;
    private readonly IIdempotencyService _idempotencyService;
    private readonly ILogger<StampService> _logger;

    public StampService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ISseService sseService,
        IReferralService referralService,
        IEmailService emailService,
        IAnalyticsAggregationService analyticsAggregationService,
        INotificationsService notificationsService,
        IBusinessScopeResolver businessScopeResolver,
        IPermissionService permissionService,
        IIdempotencyService idempotencyService,
        ILogger<StampService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _sseService = sseService;
        _referralService = referralService;
        _emailService = emailService;
        _analyticsAggregationService = analyticsAggregationService;
        _notificationsService = notificationsService;
                _businessScopeResolver = businessScopeResolver;
        _permissionService = permissionService;
        _idempotencyService = idempotencyService;
        _logger = logger;
    }

        public async Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(Guid staffOrBusinessUserId,
        AwardStampRequest request, string? idempotencyKey = null)
    {
        try
        {
                         // Hash the presented token for DB lookup
            var tokenHash = HashToken(request.Token);

            // Idempotency: when a key is supplied, replays that share the same key
            // and body hash return the stored response; a conflicting body → 409.
            var requestHash = HashBody(request);
            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var lookup = await _idempotencyService.TryGetAsync(idempotencyKey, staffOrBusinessUserId, requestHash);
                if (lookup.Found)
                {
                    if (lookup.Conflict)
                        return ApiResponse<StampAwardedResponse>.Fail("IDEMPOTENCY_CONFLICT",
                            "Idempotency key already used with a different request body.");
                    var replay = JsonSerializer.Deserialize<ApiResponse<StampAwardedResponse>>(lookup.ResponseJson);
                    if (replay != null) return replay;
                }
            }

            // Resolve the actor + scoped business in the same way for every scan path.
            var resolver = await ResolveActorAsync(staffOrBusinessUserId);
            if (!resolver.Success) return PropagateFailure<StampAwardedResponse>(resolver);

            var actor = resolver.Data!.Actor;
            var scopedBusinessId = resolver.Data.ScopedBusinessId;

            // Token lookup is scoped to the business to prevent cross-business attacks.
            var qrToken = await _unitOfWork.QrTokens.FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && t.BusinessId == scopedBusinessId);

            if (qrToken == null)
                return ApiResponse<StampAwardedResponse>.Fail("INVALID_TOKEN", "QR code is invalid.");

            if (qrToken.IsUsed)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");

            if (qrToken.ExpiresAt < DateTime.UtcNow)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_EXPIRED", "QR code has expired.");

            if (request.BusinessId != scopedBusinessId)
                return ApiResponse<StampAwardedResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to award stamps for this business.");

            // Find the loyalty card for this customer + business
            var card = await _context.LoyaltyCards
                .Include(c => c.Program)
                .Include(c => c.Customer)
                .Include(c => c.Business)
                .FirstOrDefaultAsync(c => c.CustomerId == qrToken.CustomerId && c.BusinessId == scopedBusinessId);

            if (card == null)
                return ApiResponse<StampAwardedResponse>.Fail("NOT_ENROLLED", "Customer is not enrolled in this business's loyalty program.");

                        var now = DateTime.UtcNow;

            // Validate the requested stamp count against the program's cap.
            var stampCount = request.StampCount ?? 1;
            if (stampCount < 1)
                return ApiResponse<StampAwardedResponse>.Fail("STAMP_LIMIT_EXCEEDED", "stampCount must be at least 1.");
            if (stampCount > card.Program.MaxStampsPerVisit)
                return ApiResponse<StampAwardedResponse>.Fail("STAMP_LIMIT_EXCEEDED",
                    $"stampCount exceeds this program's MaxStampsPerVisit ({card.Program.MaxStampsPerVisit}).");

            int lastStampNumber = 0;
            bool rewardReady = false;
            Guid? redemptionId = null;

            // Atomically claim the QR token as part of the same transaction that
            // awards the stamps. The conditional UPDATE guarantees that concurrent
            // requests (double scan / double tap / retried network request) cannot
            // both pass the IsUsed check and create duplicate stamps.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var claimed = await _context.QrTokens
                    .Where(t => t.Id == qrToken.Id && !t.IsUsed)
                    .ExecuteUpdateAsync(u => u.SetProperty(x => x.IsUsed, true));

                if (claimed == 0)
                {
                    await transaction.RollbackAsync();
                    return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");
                }

                // Lock the loyalty card row (PostgreSQL FOR UPDATE). SQLite in tests
                // does not support row locks — the conditional ExecuteUpdate is the
                // real guard there, so locking is skipped.
                await LockCardForUpdateAsync(card.Id);

                // Award N stamps in one locked transaction.
                for (int i = 0; i < stampCount; i++)
                {
                    card.TotalStamps++;
                    card.LifetimeStamps++;
                    card.LastStampAt = now;
                    lastStampNumber = card.LifetimeStamps;
                    rewardReady = card.TotalStamps >= card.Program.StampsRequired;

                    if (rewardReady)
                    {
                        card.RewardExpiresAt = card.Program.RewardExpirationHours > 0
                            ? now.AddHours(card.Program.RewardExpirationHours)
                            : (DateTime?)null;
                        card.TotalStamps = 0;
                        card.TotalRedemptions++;

                        var redemption = new Redemption
                        {
                            Id = Guid.NewGuid(),
                            CardId = card.Id,
                            BusinessId = scopedBusinessId,
                            PerformedByUserId = staffOrBusinessUserId,
                            PerformedByRole = actor.Role.ToString(),
                            RewardValue = card.Program.RewardValue,
                            Status = RedemptionStatus.Pending,
                            RedeemedAt = now,
                            CreatedAt = now,
                            FulfilmentCodeHash = HashToken(GenerateFulfilmentCode())
                        };
                        redemptionId = redemption.Id;
                        await _unitOfWork.Redemptions.AddAsync(redemption);
                    }

                    var stamp = new Stamp
                    {
                        Id = Guid.NewGuid(),
                        CardId = card.Id,
                        StampNumber = (short)card.LifetimeStamps,
                        StampedAt = now,
                        QrTokenId = qrToken.Id,
                        AwardedByUserId = staffOrBusinessUserId,
                        Source = StampSource.Scan,
                        CreatedAt = now
                    };
                    await _unitOfWork.Stamps.AddAsync(stamp);
                }

                _unitOfWork.LoyaltyCards.Update(card);

                await _unitOfWork.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            await _analyticsAggregationService.RecomputeTodayForBusinessAsync(scopedBusinessId);
            await _analyticsAggregationService.RecomputeStaffDayAsync(
                scopedBusinessId,
                DateOnly.FromDateTime(DateTime.UtcNow));

            // If the awarding user is a staff member and they've reached their daily goal,
            // fire a GoalReached in-app notification.
            if (actor.Role == UserRole.Staff && actor.StaffBusinessId.HasValue)
            {
                var dailyGoal = actor.DailyGoalOverride
                    ?? (await _context.Businesses
                        .AsNoTracking()
                        .Where(b => b.Id == actor.StaffBusinessId.Value)
                        .Select(b => b.DefaultDailyGoal)
                        .FirstOrDefaultAsync());

                if (dailyGoal.HasValue)
                {
                    var stampsToday = await _context.Stamps
                        .Where(s => s.AwardedByUserId == actor.Id
                            && s.Source == StampSource.Scan
                            && s.StampedAt.Date == now.Date)
                        .CountAsync();

                    if (stampsToday == dailyGoal.Value)
                    {
                                                await _notificationsService.CreateGoalReachedAsync(actor.Id, scopedBusinessId, stampsToday);
                    }
                }
            }

                        // If this is the customer's first stamp at this business, process referral qualification
            if (card.LifetimeStamps == 1)
            {
                await _referralService.ProcessFirstStampReferralAsync(card.CustomerId, scopedBusinessId);
            }

            // Push SSE event to customer's live connection
            _sseService.Publish(card.Id, new SseStampEvent
            {
                Event = "stamp.awarded",
                CardId = card.Id,
                StampNumber = lastStampNumber,
                TotalStamps = rewardReady ? 0 : card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                StampedAt = now,
                RedemptionId = redemptionId
            });

            _logger.LogInformation("Stamp awarded: card={CardId}, stamp={StampNumber}, rewardReady={RewardReady}, stamps={Count}",
                card.Id, lastStampNumber, rewardReady, stampCount);

            var response = ApiResponse<StampAwardedResponse>.Ok(new StampAwardedResponse
            {
                CardId = card.Id,
                CustomerId = card.CustomerId,
                CustomerName = card.Customer.FullName,
                StampNumber = lastStampNumber,
                TotalStamps = rewardReady ? 0 : card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                RewardDescription = card.Program.RewardDescription,
                StampedAt = now
            });

            // Store idempotency replay (first response wins).
            if (!string.IsNullOrEmpty(idempotencyKey))
                await _idempotencyService.StoreAsync(
                    idempotencyKey, staffOrBusinessUserId, requestHash,
                    JsonSerializer.Serialize(response));

            return response;
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            _logger.LogWarning("Duplicate stamp attempt for business {BusinessId} (QR token already used)", request.BusinessId);
            return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error awarding stamp for business {BusinessId}", request.BusinessId);
            return ApiResponse<StampAwardedResponse>.Fail("AWARD_FAILED", "Failed to award stamp.");
        }
    }

        public async Task<ApiResponse<Stamp>> CreateEnrollmentStampAsync(Guid cardId, int stampNumber)
    {
        var card = await _context.LoyaltyCards
            .Include(c => c.Customer)
            .Include(c => c.Business)
            .Include(c => c.Program)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId);

        if (card == null)
            return ApiResponse<Stamp>.Fail("CARD_NOT_FOUND", "Loyalty card not found.");

        var now = DateTime.UtcNow;
        var stamp = new Stamp
        {
            Id = Guid.NewGuid(),
            CardId = cardId,
            StampNumber = (short)stampNumber,
            StampedAt = now,
            QrTokenId = null,
            AwardedByUserId = null,
            Source = StampSource.Enrollment,
            CreatedAt = now
        };
        await _unitOfWork.Stamps.AddAsync(stamp);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<Stamp>.Ok(stamp);
    }

    public async Task<ApiResponse<Stamp>> CreateScanStampAsync(Guid cardId, int stampNumber, Guid staffUserId)
    {
        var card = await _context.LoyaltyCards
            .Include(c => c.Customer)
            .Include(c => c.Business)
            .Include(c => c.Program)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId);

        if (card == null)
            return ApiResponse<Stamp>.Fail("CARD_NOT_FOUND", "Loyalty card not found.");

        var now = DateTime.UtcNow;
        var stamp = new Stamp
        {
            Id = Guid.NewGuid(),
            CardId = cardId, StampNumber = (short)stampNumber,
            StampedAt = now,
            QrTokenId = null,
            AwardedByUserId = staffUserId,
            Source = StampSource.Scan,
            CreatedAt = now
        };
        await _unitOfWork.Stamps.AddAsync(stamp);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<Stamp>.Ok(stamp);
    }

    public async Task<ApiResponse<List<StampDto>>> GetRecentStampsAsync(Guid businessId, Guid? staffUserId, int limit = 20)
    {
        try
        {
            var stamps = await _context.Stamps
                .Include(s => s.Card).ThenInclude(c => c.Customer)
                .Include(s => s.Card).ThenInclude(c => c.Program)
                .Include(s => s.Card).ThenInclude(c => c.Business)
                .Where(s => s.Card.BusinessId == businessId)
                .Where(s => !staffUserId.HasValue || s.AwardedByUserId == staffUserId.Value)
                .OrderByDescending(s => s.StampedAt)
                .Take(limit)
                .Select(s => new StampDto
                {
                    Id = s.Id,
                    CustomerName = s.Card.Customer.FullName,
                    Timestamp = s.StampedAt,
                    Source = s.Source ?? StampSource.Scan,
                    RewardDescription = s.Card.Program != null ? s.Card.Program.RewardDescription : null
                })
                .ToListAsync();

            return ApiResponse<List<StampDto>>.Ok(stamps);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent stamps for business {BusinessId}", businessId);
            return ApiResponse<List<StampDto>>.Fail("ACTIVITY_FAILED", "Failed to load activity feed.");
        }
    }

        private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static string GenerateFulfilmentCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = new byte[6];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[6];
        for (int i = 0; i < 6; i++)
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        return new string(chars);
    }

    private static string HashBody(object request)
    {
        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
        return HashToken(json);
    }

    private static string SerializeDetails(object details)
    {
        return JsonSerializer.Serialize(details, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
    }

    /// <summary>Resolves actor role + scoped business id (shared by all scan endpoints).</summary>
        private async Task<ApiResponse<ActorScope>> ResolveActorAsync(Guid userId)
    {
        var actor = await _unitOfWork.Users.GetByIdAsync(userId);
        if (actor == null)
            return ApiResponse<ActorScope>.Fail("UNAUTHORIZED", "Authenticated user not found.");

        if (actor.Role == UserRole.Staff)
        {
            if (!_permissionService.HasPermission("Staff", "stamps.award"))
                return ApiResponse<ActorScope>.Fail("FORBIDDEN", "You do not have permission to award stamps.");
            if (actor.StaffBusinessId == null)
                return ApiResponse<ActorScope>.Fail("NOT_LINKED", "Staff user is not linked to a business.");
            return ApiResponse<ActorScope>.Ok(new ActorScope(actor, actor.StaffBusinessId.Value));
        }

        if (actor.Role == UserRole.Business)
        {
            if (!_permissionService.HasPermission("Business", "stamps.award"))
                return ApiResponse<ActorScope>.Fail("FORBIDDEN", "You do not have permission to award stamps.");
            var owned = await _businessScopeResolver.GetOwnedBusinessIdAsync(actor.Id);
            if (owned == null)
                return ApiResponse<ActorScope>.Fail("NOT_FOUND", "No business found for this account.");
            return ApiResponse<ActorScope>.Ok(new ActorScope(actor, owned.Value));
        }

        return ApiResponse<ActorScope>.Fail("UNAUTHORIZED", "Only business owners or staff can award stamps.");
    }

    /// <summary>PostgreSQL row lock (FOR UPDATE). SQLite does not support it — skipped.</summary>
    private async Task LockCardForUpdateAsync(Guid cardId)
    {
        var provider = _context.Database.ProviderName;
        if (provider != null && provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
            return;
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT id FROM loyalty_cards WHERE id = {0} FOR UPDATE", cardId);
    }

    private static ApiResponse<T> PropagateFailure<T>(ApiResponse<ActorScope> scope) =>
        ApiResponse<T>.Fail(scope.Error!.Code, scope.Error!.Message);

    /// <summary>POST /v1/stamps/resolve — validates a QR token without consuming it.</summary>
    public async Task<ApiResponse<ResolveQrResponse>> ResolveTokenAsync(Guid userId, AwardStampRequest request)
    {
        try
        {
            var tokenHash = HashToken(request.Token);
            var resolver = await ResolveActorAsync(userId);
            if (!resolver.Success) return PropagateFailure<ResolveQrResponse>(resolver);

            var scopedBusinessId = resolver.Data.ScopedBusinessId;
            if (request.BusinessId != scopedBusinessId)
                return ApiResponse<ResolveQrResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to view this business.");

            var qrToken = await _unitOfWork.QrTokens.FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && t.BusinessId == scopedBusinessId);

            if (qrToken == null)
                return ApiResponse<ResolveQrResponse>.Fail("INVALID_TOKEN", "QR code is invalid.");
            if (qrToken.IsUsed)
                return ApiResponse<ResolveQrResponse>.Fail("TOKEN_USED", "QR code has already been used.");
            if (qrToken.ExpiresAt < DateTime.UtcNow)
                return ApiResponse<ResolveQrResponse>.Fail("TOKEN_EXPIRED", "QR code has expired.");

            var card = await _context.LoyaltyCards
                .Include(c => c.Program)
                .Include(c => c.Customer)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CustomerId == qrToken.CustomerId && c.BusinessId == scopedBusinessId);

            if (card == null)
                return ApiResponse<ResolveQrResponse>.Fail("NOT_ENROLLED", "Customer is not enrolled in this business's loyalty program.");

            var remaining = Math.Max(0, card.Program.StampsRequired - card.TotalStamps);
            return ApiResponse<ResolveQrResponse>.Ok(new ResolveQrResponse
            {
                CustomerId = card.CustomerId,
                CustomerFirstName = card.Customer.FullName,
                CardId = card.Id,
                TotalStamps = card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                StampsRemaining = remaining,
                RewardReady = remaining == 0,
                ProgramName = card.Program.Name,
                RewardValue = card.Program.RewardValue,
                MaxStampsPerVisit = card.Program.MaxStampsPerVisit,
                ExpiresAt = qrToken.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving token for business {BusinessId}", request.BusinessId);
                        return ApiResponse<ResolveQrResponse>.Fail("RESOLVE_FAILED", "Failed to resolve QR code.");
        }
    }

    /// <summary>POST /v1/stamps/adjust — Business-only manual stamp adjustment.</summary>
    public async Task<ApiResponse<StampAdjustmentResponse>> AdjustStampsAsync(Guid actorUserId, StampAdjustmentRequest request)
    {
        try
        {
            var actor = await _unitOfWork.Users.GetByIdAsync(actorUserId);
            if (actor == null)
                return ApiResponse<StampAdjustmentResponse>.Fail("UNAUTHORIZED", "Authenticated user not found.");

            if (actor.Role != UserRole.Business)
                return ApiResponse<StampAdjustmentResponse>.Fail("FORBIDDEN", "Only business owners can adjust stamps.");
            if (!_permissionService.HasPermission("Business", "stamps.adjust"))
                return ApiResponse<StampAdjustmentResponse>.Fail("FORBIDDEN", "You do not have permission to adjust stamps.");

            var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(actor.Id);
            if (businessId == null)
                return ApiResponse<StampAdjustmentResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var scopedBusinessId = businessId.Value;
            var card = await _context.LoyaltyCards
                .Include(c => c.Program)
                .Include(c => c.Customer)
                .Include(c => c.Business)
                .FirstOrDefaultAsync(c => c.Id == request.CardId && c.BusinessId == scopedBusinessId);

            if (card == null)
                return ApiResponse<StampAdjustmentResponse>.Fail("CARD_NOT_FOUND", "Loyalty card not found for your business.");

            if (request.Delta == 0)
                return ApiResponse<StampAdjustmentResponse>.Fail("INVALID_DELTA", "Delta must not be zero.");

            var resulting = card.TotalStamps + request.Delta;
            if (resulting < 0)
                return ApiResponse<StampAdjustmentResponse>.Fail("ADJUSTMENT_BELOW_ZERO", "Adjustment would make total stamps negative.");

            var now = DateTime.UtcNow;
            int before = card.TotalStamps;

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await LockCardForUpdateAsync(card.Id);

                card.TotalStamps = resulting;
                // Keep the chk_lifetime_gte_total invariant: a positive adjustment
                // grants real stamps, so they count toward the lifetime total too.
                if (request.Delta > 0)
                    card.LifetimeStamps += request.Delta;
                card.LastStampAt = now;
                _unitOfWork.LoyaltyCards.Update(card);

                await _unitOfWork.StampAdjustments.AddAsync(new StampAdjustment
                {
                    Id = Guid.NewGuid(),
                    CardId = card.Id,
                    AdjustedByUserId = actor.Id,
                    AdjustedByRole = actor.Role.ToString(),
                    Delta = request.Delta,
                    Reason = request.Reason,
                    Note = request.Note,
                    CreatedAt = now
                });

                await _unitOfWork.ApiEventLogs.AddAsync(new ApiEventLog
                {
                    Id = Guid.NewGuid(),
                    TenantId = scopedBusinessId,
                    UserId = actor.Id,
                    Endpoint = "POST /v1/stamps/adjust",
                    Method = "POST",
                    StatusCode = 200,
                    CreatedAt = now,
                    DetailsJson = SerializeDetails(new
                    {
                        actor = actor.Id,
                        cardId = card.Id,
                        customerId = card.CustomerId,
                        before = new { totalStamps = before },
                        after = new { totalStamps = resulting },
                        delta = request.Delta,
                        reason = request.Reason.ToString()
                    })
                });

                await _unitOfWork.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            var rewardReady = card.TotalStamps >= card.Program.StampsRequired;

            await _analyticsAggregationService.RecomputeTodayForBusinessAsync(scopedBusinessId);

            _sseService.Publish(card.Id, new SseStampEvent
            {
                Event = "stamp.adjusted",
                CardId = card.Id,
                StampNumber = card.LifetimeStamps,
                TotalStamps = card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                StampedAt = now,
                Message = $"Your card was corrected by {card.Business.Name}."
            });
            await _notificationsService.CreateAsync(card.CustomerId, scopedBusinessId, "CardCorrected");

            return ApiResponse<StampAdjustmentResponse>.Ok(new StampAdjustmentResponse
            {
                CardId = card.Id,
                TotalStampsBefore = before,
                TotalStampsAfter = card.TotalStamps,
                Delta = request.Delta,
                CustomerName = card.Customer.FullName,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                AdjustedAt = now
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adjusting stamps for card {CardId}", request.CardId);
                        return ApiResponse<StampAdjustmentResponse>.Fail("ADJUST_FAILED", "Failed to adjust stamps.");
        }
    }

    /// <summary>POST /v1/stamps/lookup — Business + Staff phone lookup issuing a one-time manual token.</summary>
    public async Task<ApiResponse<ManualLookupResponse>> ManualLookupAsync(Guid userId, ManualLookupRequest request)
    {
        try
        {
            var resolver = await ResolveActorAsync(userId);
            if (!resolver.Success) return PropagateFailure<ManualLookupResponse>(resolver);

            var scopedBusinessId = resolver.Data.ScopedBusinessId;
            if (request.BusinessId != scopedBusinessId)
                return ApiResponse<ManualLookupResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to look up this business.");

            var customer = await _context.Users
                .Include(u => u.LoyaltyCards!)
                    .ThenInclude(c => c.Program)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.PhoneNumber == NormalisePhone(request.Phone)
                    && u.LoyaltyCards.Any(c => c.BusinessId == scopedBusinessId));

            if (customer == null)
                return ApiResponse<ManualLookupResponse>.Fail("CUSTOMER_NOT_FOUND", "No customer with that phone number found at this business.");

            var card = customer.LoyaltyCards.First(c => c.BusinessId == scopedBusinessId);

            var rawToken = GenerateSecureToken();
            var tokenHash = HashToken(rawToken);
            var expiresAt = DateTime.UtcNow.AddSeconds(120);

            await _unitOfWork.QrTokens.AddAsync(new QrToken
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                BusinessId = scopedBusinessId,
                TokenHash = tokenHash,
                ExpiresAt = expiresAt,
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            });
            await _unitOfWork.SaveChangesAsync();

            await _unitOfWork.ApiEventLogs.AddAsync(new ApiEventLog
            {
                Id = Guid.NewGuid(),
                TenantId = scopedBusinessId,
                UserId = userId,
                Endpoint = "POST /v1/stamps/lookup",
                Method = "POST",
                StatusCode = 200,
                CreatedAt = DateTime.UtcNow,
                DetailsJson = SerializeDetails(new
                {
                    actor = userId,
                    cardId = card.Id,
                    customerId = customer.Id,
                    tokenExpiresAt = expiresAt
                })
            });
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<ManualLookupResponse>.Ok(new ManualLookupResponse
            {
                CustomerId = customer.Id,
                MaskedName = MaskName(customer.FullName),
                CardId = card.Id,
                CardStatus = "active",
                Token = rawToken,
                TokenExpiresAt = expiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error looking up customer by phone at business {BusinessId}", request.BusinessId);
                            return ApiResponse<ManualLookupResponse>.Fail("LOOKUP_FAILED", "Failed to look up customer.");
        }
    }

    /// <summary>POST /v1/cards/enroll-and-stamp — enroll then award in one locked transaction.</summary>
    public async Task<ApiResponse<StampAwardedResponse>> EnrollAndStampAsync(Guid userId, EnrollAndStampRequest request, string? idempotencyKey = null)
    {
        var requestHash = HashBody(request);
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var lookup = await _idempotencyService.TryGetAsync(idempotencyKey, userId, requestHash);
            if (lookup.Found)
            {
                if (lookup.Conflict)
                    return ApiResponse<StampAwardedResponse>.Fail("IDEMPOTENCY_CONFLICT",
                        "Idempotency key already used with a different request body.");
                var replay = JsonSerializer.Deserialize<ApiResponse<StampAwardedResponse>>(lookup.ResponseJson);
                if (replay != null) return replay;
            }
        }

        try
        {
            var resolver = await ResolveActorAsync(userId);
            if (!resolver.Success) return PropagateFailure<StampAwardedResponse>(resolver);

            var actor = resolver.Data!.Actor;
            var scopedBusinessId = resolver.Data.ScopedBusinessId;
            if (request.BusinessId != scopedBusinessId)
                return ApiResponse<StampAwardedResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to enroll at this business.");

            var tokenHash = HashToken(request.Token);
            var qrToken = await _unitOfWork.QrTokens.FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && t.BusinessId == scopedBusinessId);

            if (qrToken == null)
                return ApiResponse<StampAwardedResponse>.Fail("INVALID_TOKEN", "QR code is invalid.");
            if (qrToken.IsUsed)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");
            if (qrToken.ExpiresAt < DateTime.UtcNow)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_EXPIRED", "QR code has expired.");

            var customer = await _context.Users
                .Include(u => u.LoyaltyCards!)
                    .ThenInclude(c => c.Program)
                .FirstOrDefaultAsync(u => u.Id == qrToken.CustomerId);
            if (customer == null)
                return ApiResponse<StampAwardedResponse>.Fail("UNAUTHORIZED", "Customer not found.");

            var stamps = request.Stamps ?? 1;
            if (stamps < 1)
                return ApiResponse<StampAwardedResponse>.Fail("STAMP_LIMIT_EXCEEDED", "stamps must be at least 1.");

            var now = DateTime.UtcNow;
            Guid? redemptionId = null;

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                                var claimed = await _context.QrTokens
                    .Where(t => t.Id == qrToken.Id && !t.IsUsed)
                    .ExecuteUpdateAsync(u => u.SetProperty(x => x.IsUsed, true));
                if (claimed == 0)
                {
                    await transaction.RollbackAsync();
                    return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");
                }

                var card = await _context.LoyaltyCards
                    .Include(c => c.Program)
                    .Include(c => c.Customer)
                    .Include(c => c.Business)
                    .FirstOrDefaultAsync(c => c.CustomerId == qrToken.CustomerId && c.BusinessId == scopedBusinessId);

                if (card == null)
                {
                    var program = await _context.LoyaltyPrograms
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.BusinessId == scopedBusinessId && p.IsActive);
                    if (program == null)
                    {
                        await transaction.RollbackAsync();
                        return ApiResponse<StampAwardedResponse>.Fail("NOT_FOUND", "No active loyalty program for this business.");
                    }

                    card = new LoyaltyCard
                    {
                        Id = Guid.NewGuid(),
                        CustomerId = qrToken.CustomerId,
                        BusinessId = scopedBusinessId,
                        ProgramId = program.Id,
                        TotalStamps = 0,
                        LifetimeStamps = 0,
                        EnrolledAt = now,
                        CreatedAt = now
                    };
                    await _unitOfWork.LoyaltyCards.AddAsync(card);
                    await _unitOfWork.SaveChangesAsync();
                }

                await LockCardForUpdateAsync(card.Id);
                card = await _context.LoyaltyCards
                    .Include(c => c.Program)
                    .Include(c => c.Customer)
                    .Include(c => c.Business)
                    .FirstAsync(c => c.Id == card.Id);

                var beforeStamps = card.TotalStamps;
                if (stamps > card.Program.MaxStampsPerVisit)
                    return ApiResponse<StampAwardedResponse>.Fail("STAMP_LIMIT_EXCEEDED",
                        $"stamps exceeds this program's MaxStampsPerVisit ({card.Program.MaxStampsPerVisit}).");

                int lastStampNumber = 0;
                bool rewardReady = false;

                for (int i = 0; i < stamps; i++)
                {
                    card.TotalStamps++;
                    card.LifetimeStamps++;
                    card.LastStampAt = now;
                    lastStampNumber = card.LifetimeStamps;
                    rewardReady = card.TotalStamps >= card.Program.StampsRequired;

                    if (rewardReady)
                    {
                        card.RewardExpiresAt = card.Program.RewardExpirationHours > 0
                            ? now.AddHours(card.Program.RewardExpirationHours) : (DateTime?)null;
                        card.TotalStamps = 0;
                        card.TotalRedemptions++;

                        var redemption = new Redemption
                        {
                            Id = Guid.NewGuid(),
                            CardId = card.Id,
                            BusinessId = scopedBusinessId,
                            PerformedByUserId = userId,
                            PerformedByRole = actor.Role.ToString(),
                            RewardValue = card.Program.RewardValue,
                            Status = RedemptionStatus.Pending,
                            RedeemedAt = now,
                            CreatedAt = now,
                            FulfilmentCodeHash = HashToken(GenerateFulfilmentCode())
                        };
                        redemptionId = redemption.Id;
                        await _unitOfWork.Redemptions.AddAsync(redemption);
                    }

                    await _unitOfWork.Stamps.AddAsync(new Stamp
                    {
                        Id = Guid.NewGuid(),
                        CardId = card.Id,
                        StampNumber = (short)card.LifetimeStamps,
                        StampedAt = now,
                        QrTokenId = qrToken.Id,
                        AwardedByUserId = userId,
                        Source = StampSource.Scan,
                        CreatedAt = now
                    });
                }

                                _unitOfWork.LoyaltyCards.Update(card);

                // Audit: enroll-and-stamp with actor + target card + before/after counters.
                await _unitOfWork.ApiEventLogs.AddAsync(new ApiEventLog
                {
                    Id = Guid.NewGuid(),
                    TenantId = scopedBusinessId,
                    UserId = userId,
                    Endpoint = "POST /v1/cards/enroll-and-stamp",
                    Method = "POST",
                    StatusCode = 200,
                    CreatedAt = now,
                    DetailsJson = SerializeDetails(new
                    {
                        actor = userId,
                        cardId = card.Id,
                        customerId = card.CustomerId,
                        before = new { totalStamps = beforeStamps, lifetimeStamps = card.LifetimeStamps - stamps },
                        after = new { totalStamps = card.TotalStamps, lifetimeStamps = card.LifetimeStamps },
                        stamps
                    })
                });

                await _unitOfWork.SaveChangesAsync();
                await transaction.CommitAsync();

                await _analyticsAggregationService.RecomputeTodayForBusinessAsync(scopedBusinessId);

                _sseService.Publish(card.Id, new SseStampEvent
                {
                    Event = "stamp.awarded",
                    CardId = card.Id,
                    StampNumber = lastStampNumber,
                    TotalStamps = rewardReady ? 0 : card.TotalStamps,
                    StampsRequired = card.Program.StampsRequired,
                    RewardReady = rewardReady,
                    StampedAt = now,
                    RedemptionId = redemptionId
                });

                if (card.LifetimeStamps == stamps)
                    await _referralService.ProcessFirstStampReferralAsync(card.CustomerId, scopedBusinessId);

                var response = ApiResponse<StampAwardedResponse>.Ok(new StampAwardedResponse
                {
                    CardId = card.Id,
                    CustomerId = card.CustomerId,
                    CustomerName = card.Customer.FullName,
                    StampNumber = lastStampNumber,
                    TotalStamps = rewardReady ? 0 : card.TotalStamps,
                    StampsRequired = card.Program.StampsRequired,
                    RewardReady = rewardReady,
                    RewardDescription = card.Program.RewardDescription,
                    StampedAt = now
                });

                if (!string.IsNullOrEmpty(idempotencyKey))
                    await _idempotencyService.StoreAsync(idempotencyKey, userId, requestHash,
                        JsonSerializer.Serialize(response));

                return response;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            _logger.LogWarning("Duplicate enroll-and-stamp attempt for business {BusinessId}", request.BusinessId);
            return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enroll-and-stamp for business {BusinessId}", request.BusinessId);
                        return ApiResponse<StampAwardedResponse>.Fail("AWARD_FAILED", "Failed to enroll and stamp.");
        }
    }

    private static string NormalisePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var p = phone.Trim();
        if (!p.StartsWith("+"))
            p = p.StartsWith("0") ? "+254" + p.Substring(1) : "+" + p;
        return p;
    }

    private static string MaskName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return "—";
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var masked = parts.Select(p => char.ToUpperInvariant(p[0]) + new string('*', Math.Max(0, p.Length - 1)));
        return string.Join(" ", masked);
    }
public async Task<ApiResponse<StampActivityPage>> GetActivityAsync(Guid actorUserId, StampActivityQuery query)
    {
        var resolver = await ResolveActorAsync(actorUserId);
        if (!resolver.Success) return PropagateFailure<StampActivityPage>(resolver);

        var businessId = resolver.Data.ScopedBusinessId;
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var baseQuery = _context.Stamps.AsNoTracking().Where(s => s.Card.BusinessId == businessId);
        if (query.ProgramId.HasValue) baseQuery = baseQuery.Where(s => s.Card.ProgramId == query.ProgramId.Value);
        if (query.CustomerId.HasValue) baseQuery = baseQuery.Where(s => s.Card.CustomerId == query.CustomerId.Value);
        if (query.StaffId.HasValue) baseQuery = baseQuery.Where(s => s.AwardedByUserId == query.StaffId.Value);
        if (!string.IsNullOrWhiteSpace(query.Source)) baseQuery = baseQuery.Where(s => s.Source == query.Source);
        if (query.From.HasValue) baseQuery = baseQuery.Where(s => s.StampedAt >= query.From.Value.ToUniversalTime());
        if (query.To.HasValue) baseQuery = baseQuery.Where(s => s.StampedAt <= query.To.Value.ToUniversalTime());

        var total = await baseQuery.LongCountAsync();

        var stamps = await baseQuery
            .Include(s => s.Card).ThenInclude(c => c.Program)
            .Include(s => s.Card).ThenInclude(c => c.Customer)
            .OrderByDescending(s => s.StampedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Resolve awarding-user display names in a single round trip (soft-deleted
        // users are simply omitted, matching the whole-account query filters).
        var awardedIds = stamps.Where(s => s.AwardedByUserId.HasValue)
            .Select(s => s.AwardedByUserId!.Value).Distinct().ToList();
        var users = awardedIds.Count == 0
            ? new Dictionary<Guid, AwardedUser>()
            : await _context.Users.AsNoTracking()
                .Where(u => awardedIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.Role })
                .ToDictionaryAsync(u => u.Id, u => new AwardedUser(u.FullName, u.Role.ToString()));

        var items = stamps.Select(s =>
        {
            users.TryGetValue(s.AwardedByUserId ?? Guid.Empty, out var awarded);
            return new StampActivityItem
            {
                Id = s.Id,
                CardId = s.CardId,
                ProgramId = s.Card.ProgramId,
                ProgramName = s.Card.Program?.Name ?? string.Empty,
                CustomerId = s.Card.CustomerId,
                CustomerName = s.Card.Customer?.FullName ?? string.Empty,
                StampNumber = s.StampNumber,
                Source = s.Source,
                AwardedByUserId = s.AwardedByUserId,
                AwardedByName = awarded.Name,
                AwardedByRole = awarded.Role,
                StampedAt = s.StampedAt
            };
        }).ToList();

        return ApiResponse<StampActivityPage>.Ok(new StampActivityPage
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }
}

/// <summary>Resolved actor + business scope used by all scan endpoints.</summary>
internal record ActorScope(User Actor, Guid ScopedBusinessId);

/// <summary>Display metadata for the user who awarded a stamp (used by the activity feed).</summary>
internal sealed record AwardedUser(string Name, string Role);







