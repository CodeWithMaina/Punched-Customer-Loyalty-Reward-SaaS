using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Handles reward claiming and redemption history.
/// When a customer reaches the stamp threshold, they can claim a reward
/// which creates a Redemption record, resets current stamps, and increments
/// the card's totalRedemptions.
/// </summary>
public class RedemptionService : IRedemptionService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IAnalyticsAggregationService _analyticsAggregationService;
    private readonly IBusinessScopeResolver _businessScopeResolver;
    private readonly IPermissionService _permissionService;
    private readonly INotificationsService _notificationsService;
    private readonly ISseService _sseService;
    private readonly IIdempotencyService _idempotencyService;
    private readonly ILogger<RedemptionService> _logger;

    public RedemptionService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        IAnalyticsAggregationService analyticsAggregationService,
        IBusinessScopeResolver businessScopeResolver,
        IPermissionService permissionService,
        INotificationsService notificationsService,
        ISseService sseService,
        IIdempotencyService idempotencyService,
        ILogger<RedemptionService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _analyticsAggregationService = analyticsAggregationService;
        _businessScopeResolver = businessScopeResolver;
        _permissionService = permissionService;
        _notificationsService = notificationsService;
        _sseService = sseService;
        _idempotencyService = idempotencyService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ApiResponse<RedemptionResponse>> ClaimRewardAsync(Guid customerId, ClaimRewardRequest request, string? idempotencyKey = null)
    {
        try
        {
            // Idempotency: same key + same body → replay stored response;
            // same key + different body → 409 IDEMPOTENCY_CONFLICT.
            var requestHash = HashBody(request);
            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var lookup = await _idempotencyService.TryGetAsync(idempotencyKey, customerId, requestHash);
                if (lookup.Found)
                {
                    if (lookup.Conflict)
                        return ApiResponse<RedemptionResponse>.Fail("IDEMPOTENCY_CONFLICT",
                            "Idempotency key already used with a different request body.");
                    var replay = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<RedemptionResponse>>(lookup.ResponseJson);
                    if (replay != null) return replay;
                }
            }

            var card = await _context.LoyaltyCards
                .Include(c => c.Program)
                .Include(c => c.Business)
                .FirstOrDefaultAsync(c => c.Id == request.CardId && c.CustomerId == customerId);

            if (card == null)
                return ApiResponse<RedemptionResponse>.Fail("NOT_FOUND", "Loyalty card not found.");

            var stampsRequired = card.Program.StampsRequired;
            if (card.TotalStamps < stampsRequired)
                return ApiResponse<RedemptionResponse>.Fail(
                    "INSUFFICIENT_STAMPS",
                    $"You need {stampsRequired - card.TotalStamps} more stamps to claim this reward.");

            var now = DateTime.UtcNow;

            // Atomically consume the stamps. The conditional UPDATE is the source of
            // truth: two concurrent claims (double tap / retried request) can never
            // both pass, because only the first one finds a row with enough stamps.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var claimed = await _context.LoyaltyCards
                .Where(c => c.Id == card.Id && c.TotalStamps >= stampsRequired)
                .ExecuteUpdateAsync(u => u
                    .SetProperty(c => c.TotalStamps, 0)
                    .SetProperty(c => c.TotalRedemptions, c => c.TotalRedemptions + 1));

            if (claimed == 0)
            {
                await transaction.RollbackAsync();
                return ApiResponse<RedemptionResponse>.Fail("INSUFFICIENT_STAMPS",
                    "This reward has already been claimed or there are not enough stamps.");
            }

            var plaintextCode = GenerateFulfilmentCode();
            var redemption = new Redemption
            {
                Id = Guid.NewGuid(),
                CardId = card.Id,
                BusinessId = card.BusinessId,
                PerformedByUserId = customerId,
                PerformedByRole = UserRole.Customer.ToString(),
                RewardValue = card.Program.RewardValue,
                Status = RedemptionStatus.Pending,
                PayoutStatus = "pending",
                StampsConsumed = stampsRequired,
                FulfilmentCodeHash = HashToken(plaintextCode),
                RedeemedAt = now,
                CreatedAt = now
            };

            await _unitOfWork.Redemptions.AddAsync(redemption);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            await _analyticsAggregationService.RecomputeTodayForBusinessAsync(card.BusinessId);

            _sseService.Publish(card.Id, new SseStampEvent
            {
                Event = "reward.claimed",
                CardId = card.Id,
                StampNumber = card.LifetimeStamps,
                TotalStamps = 0,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = true,
                StampedAt = now,
                RedemptionId = redemption.Id,
                Message = $"Reward claimed: {card.Program.RewardDescription}"
            });

            _logger.LogInformation(
                "Reward claimed: card={CardId}, redemption={RedemptionId}, value={Value}",
                card.Id, redemption.Id, card.Program.RewardValue);

            var response = ApiResponse<RedemptionResponse>.Ok(new RedemptionResponse
            {
                Id = redemption.Id,
                CardId = card.Id,
                BusinessName = card.Business.Name,
                RewardValue = card.Program.RewardValue,
                RewardDescription = card.Program.RewardDescription,
                Status = redemption.Status.ToString(),
                FulfilmentCode = plaintextCode,
                RedeemedAt = redemption.RedeemedAt
            });

            if (!string.IsNullOrEmpty(idempotencyKey))
                await _idempotencyService.StoreAsync(idempotencyKey, customerId, requestHash,
                    System.Text.Json.JsonSerializer.Serialize(response));

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error claiming reward for card {CardId}", request.CardId);
            return ApiResponse<RedemptionResponse>.Fail("CLAIM_FAILED", "Failed to claim reward.");
        }
    }

    /// <inheritdoc />
    public async Task<ApiResponse<List<RedemptionResponse>>> GetMyRedemptionsAsync(Guid customerId)
    {
        try
        {
            // Server-side projection: one query, no entity graph loading. The reward
            // description always comes from the card's own program (previously this
            // fell back to "any active business program", which could describe the
            // wrong reward).
            var result = await _context.Redemptions
                .AsNoTracking()
                .Where(r => r.Card.CustomerId == customerId)
                .OrderByDescending(r => r.RedeemedAt)
                .Select(r => new RedemptionResponse
                {
                    Id = r.Id,
                    CardId = r.CardId,
                    BusinessName = r.Business.Name,
                    RewardValue = r.RewardValue,
                    RewardDescription = r.Card.Program != null ? r.Card.Program.RewardDescription : "Reward",
                    Status = r.Status.ToString(),
                    RedeemedAt = r.RedeemedAt
                })
                .ToListAsync();

            return ApiResponse<List<RedemptionResponse>>.Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting redemptions for customer {CustomerId}", customerId);
            return ApiResponse<List<RedemptionResponse>>.Fail("FETCH_FAILED", "Failed to load redemptions.");
        }
    }

    // ── Phase 2: fulfil / cancel ─────────────────────────────

    /// <summary>
    /// GET /v1/redemptions/pending — Business + Staff: the fulfilment queue for
    /// the scoped business, newest first.
    /// </summary>
    public async Task<ApiResponse<List<RedemptionResponse>>> GetPendingForBusinessAsync(Guid userId)
    {
        try
        {
            Guid scopedBusinessId;
            try
            {
                scopedBusinessId = await ResolveStaffBusinessAsync(userId, requirePermission: false);
            }
            catch (InvalidOperationException ex)
            {
                var code = ex.Message switch
                {
                    "ACTOR_NOT_FOUND" => "UNAUTHORIZED",
                    "NOT_FOUND" => "NOT_FOUND",
                    "NOT_LINKED" => "NOT_LINKED",
                    _ => "UNAUTHORIZED"
                };
                return ApiResponse<List<RedemptionResponse>>.Fail(code, "Could not resolve your business scope.");
            }

            var result = await _context.Redemptions
                .AsNoTracking()
                .Where(r => r.BusinessId == scopedBusinessId && r.Status == RedemptionStatus.Pending)
                .OrderBy(r => r.RedeemedAt)
                .Select(r => new RedemptionResponse
                {
                    Id = r.Id,
                    CardId = r.CardId,
                    BusinessName = r.Business.Name,
                    CustomerName = r.Card.Customer.FullName,
                    RewardValue = r.RewardValue,
                    RewardDescription = r.Card.Program != null ? r.Card.Program.RewardDescription : "Reward",
                    Status = r.Status.ToString(),
                    RedeemedAt = r.RedeemedAt
                })
                .ToListAsync();

            return ApiResponse<List<RedemptionResponse>>.Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing pending redemptions for user {UserId}", userId);
            return ApiResponse<List<RedemptionResponse>>.Fail("FETCH_FAILED", "Failed to load pending redemptions.");
        }
    }

    private async Task<Guid> ResolveStaffBusinessAsync(Guid userId, bool requirePermission)
    {
        var actor = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new InvalidOperationException("ACTOR_NOT_FOUND");

        if (actor.Role == UserRole.Business)
        {
            if (requirePermission && !_permissionService.HasPermission("Business", "redemptions.fulfill"))
                throw new InvalidOperationException("FORBIDDEN");
            return await _businessScopeResolver.GetOwnedBusinessIdAsync(actor.Id)
                ?? throw new InvalidOperationException("NOT_FOUND");
        }
        if (actor.Role == UserRole.Staff)
        {
            if (requirePermission && !_permissionService.HasPermission("Staff", "redemptions.fulfill"))
                throw new InvalidOperationException("FORBIDDEN");
            if (actor.StaffBusinessId == null)
                throw new InvalidOperationException("NOT_LINKED");
            return actor.StaffBusinessId.Value;
        }
        throw new InvalidOperationException("UNAUTHORIZED");
    }

    /// <summary>
    /// POST /v1/redemptions/fulfill — Business + Staff verify a 6-char code and mark
    /// the pending redemption fulfilled. Locks the code after 5 wrong attempts.
    /// </summary>
    public async Task<ApiResponse<FulfillRedemptionResponse>> FulfillRedemptionAsync(Guid userId, FulfillRedemptionRequest request)
    {
        try
        {
            Guid scopedBusinessId;
            try
            {
                scopedBusinessId = await ResolveStaffBusinessAsync(userId, requirePermission: true);
            }
            catch (InvalidOperationException ex)
            {
                var code = ex.Message;
                var msg = code switch
                {
                    "ACTOR_NOT_FOUND" => "Authenticated user not found.",
                    "FORBIDDEN" => "You do not have permission to fulfill redemptions (redemptions.fulfill required).",
                    "NOT_FOUND" => "No business found for this account.",
                    "NOT_LINKED" => "Staff user is not linked to a business.",
                    _ => "Only business owners or staff can fulfill redemptions."
                };
                return ApiResponse<FulfillRedemptionResponse>.Fail(code, msg);
            }

            if (request.BusinessId != scopedBusinessId)
                return ApiResponse<FulfillRedemptionResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to fulfill redemptions for this business.");

            var card = await _context.LoyaltyCards
                .Include(c => c.Business)
                .Include(c => c.Customer)
                .Include(c => c.Program)
                .FirstOrDefaultAsync(c => c.Id == request.CardId && c.BusinessId == scopedBusinessId);
            if (card == null)
                return ApiResponse<FulfillRedemptionResponse>.Fail("CARD_NOT_FOUND", "Loyalty card not found for your business.");

            var redemption = await _context.Redemptions
                .FirstOrDefaultAsync(r => r.CardId == request.CardId && r.Status == RedemptionStatus.Pending);
            if (redemption == null)
                return ApiResponse<FulfillRedemptionResponse>.Fail("NO_PENDING_REDEMPTION", "No pending redemption for this card.");

            if (redemption.CodeLocked)
                return ApiResponse<FulfillRedemptionResponse>.Fail("CODE_LOCKED", "Too many wrong attempts — this redemption is locked.");

            var presented = HashToken(request.Code?.Trim().ToUpperInvariant() ?? string.Empty);
            if (!string.Equals(presented, redemption.FulfilmentCodeHash, StringComparison.OrdinalIgnoreCase))
            {
                redemption.FailedAttempts++;
                redemption.CodeLocked = redemption.FailedAttempts >= 5;
                await _context.SaveChangesAsync();
                return redemption.CodeLocked
                    ? ApiResponse<FulfillRedemptionResponse>.Fail("CODE_LOCKED", "Too many wrong attempts — this redemption is locked.")
                    : ApiResponse<FulfillRedemptionResponse>.Fail("INVALID_CODE", "Incorrect fulfilment code.");
            }

            var now = DateTime.UtcNow;
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var provider = _context.Database.ProviderName;
                if (provider == null || !provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
                    await _context.Database.ExecuteSqlRawAsync(
                        "SELECT id FROM loyalty_cards WHERE id = {0} FOR UPDATE", card.Id);

                redemption.Status = RedemptionStatus.Fulfilled;
                redemption.FulfilledByUserId = userId;
                redemption.FulfilledAt = now;
                _context.Redemptions.Update(redemption);
                await _context.SaveChangesAsync();

                await _context.ApiEventLogs.AddAsync(new ApiEventLog
                {
                    Id = Guid.NewGuid(),
                    TenantId = scopedBusinessId,
                    UserId = userId,
                    Endpoint = "POST /v1/redemptions/fulfill",
                    Method = "POST",
                    StatusCode = 200,
                    CreatedAt = now
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            _sseService.Publish(card.Id, new SseStampEvent
            {
                Event = "redemption.fulfilled",
                CardId = card.Id,
                StampNumber = card.LifetimeStamps,
                TotalStamps = card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = false,
                StampedAt = now,
                RedemptionId = redemption.Id,
                Message = "Enjoy your reward!"
            });

            await _notificationsService.CreateAsync(card.CustomerId, scopedBusinessId, "RewardFulfilled");

            return ApiResponse<FulfillRedemptionResponse>.Ok(new FulfillRedemptionResponse
            {
                RedemptionId = redemption.Id,
                CardId = card.Id,
                CustomerName = card.Customer.FullName,
                RewardDescription = card.Program.RewardDescription,
                Status = RedemptionStatus.Fulfilled.ToString(),
                FulfilledAt = now
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fulfilling redemption for card {CardId}", request.CardId);
            return ApiResponse<FulfillRedemptionResponse>.Fail("FULFILL_FAILED", "Failed to fulfill redemption.");
        }
    }

    /// <summary>
    /// POST /v1/redemptions/{id}/cancel — Business only. Marks Pending → Cancelled and
    /// restores exactly the stamps consumed at claim.
    /// </summary>
    public async Task<ApiResponse<CancelRedemptionResponse>> CancelRedemptionAsync(Guid actorUserId, Guid redemptionId, CancelRedemptionRequest request)
    {
        try
        {
            var actor = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == actorUserId);
            if (actor == null)
                return ApiResponse<CancelRedemptionResponse>.Fail("UNAUTHORIZED", "Authenticated user not found.");
            if (actor.Role != UserRole.Business)
                return ApiResponse<CancelRedemptionResponse>.Fail("FORBIDDEN", "Only business owners can cancel redemptions.");

            var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(actor.Id);
            if (businessId == null)
                return ApiResponse<CancelRedemptionResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var redemption = await _context.Redemptions
                .Include(r => r.Card)
                .FirstOrDefaultAsync(r => r.Id == redemptionId && r.Card.BusinessId == businessId.Value);
            if (redemption == null)
                return ApiResponse<CancelRedemptionResponse>.Fail("NOT_FOUND", "Redemption not found for your business.");
            if (redemption.Status != RedemptionStatus.Pending)
                return ApiResponse<CancelRedemptionResponse>.Fail("NOT_PENDING", "Only pending redemptions can be cancelled.");

            var card = await _context.LoyaltyCards
                .Include(c => c.Customer)
                .Include(c => c.Business)
                .Include(c => c.Program)
                .FirstAsync(c => c.Id == redemption.CardId);

            var now = DateTime.UtcNow;
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var provider = _context.Database.ProviderName;
                if (provider == null || !provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
                    await _context.Database.ExecuteSqlRawAsync(
                        "SELECT id FROM loyalty_cards WHERE id = {0} FOR UPDATE", card.Id);

                card.TotalStamps += redemption.StampsConsumed;
                card.LastStampAt = now;
                redemption.Status = RedemptionStatus.Cancelled;
                _context.LoyaltyCards.Update(card);
                _context.Redemptions.Update(redemption);
                await _context.SaveChangesAsync();

                await _context.ApiEventLogs.AddAsync(new ApiEventLog
                {
                    Id = Guid.NewGuid(),
                    TenantId = businessId,
                    UserId = actorUserId,
                    Endpoint = $"POST /v1/redemptions/{redemptionId}/cancel",
                    Method = "POST",
                    StatusCode = 200,
                    CreatedAt = now
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            _sseService.Publish(card.Id, new SseStampEvent
            {
                Event = "redemption.cancelled",
                CardId = card.Id,
                StampNumber = card.LifetimeStamps,
                TotalStamps = card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = false,
                StampedAt = now,
                RedemptionId = redemption.Id,
                Message = $"Your redemption was cancelled. {redemption.StampsConsumed} stamp(s) restored."
            });

            await _notificationsService.CreateAsync(card.CustomerId, businessId.Value, "RewardCancelled");

            return ApiResponse<CancelRedemptionResponse>.Ok(new CancelRedemptionResponse
            {
                RedemptionId = redemption.Id,
                CardId = card.Id,
                Status = RedemptionStatus.Cancelled.ToString(),
                StampsRestored = redemption.StampsConsumed,
                TotalStampsAfter = card.TotalStamps,
                CancelledAt = now,
                Note = request.Note
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling redemption {RedemptionId}", redemptionId);
            return ApiResponse<CancelRedemptionResponse>.Fail("CANCEL_FAILED", "Failed to cancel redemption.");
        }
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string HashBody(object request)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(request,
            new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
        return HashToken(json);
    }

    private static string GenerateFulfilmentCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = new byte[6];
        System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
        var chars = new char[6];
        for (int i = 0; i < 6; i++)
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        return new string(chars);
    }
}
