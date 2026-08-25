using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        _logger = logger;
    }

    public async Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(Guid staffOrBusinessUserId, AwardStampRequest request)
    {
        try
        {
            var actor = await _unitOfWork.Users.GetByIdAsync(staffOrBusinessUserId);
            if (actor == null)
                return ApiResponse<StampAwardedResponse>.Fail("UNAUTHORIZED", "Authenticated user not found.");

            Guid? scopedBusinessId = null;
            if (actor.Role == UserRole.Staff)
            {
                if (actor.StaffBusinessId == null)
                    return ApiResponse<StampAwardedResponse>.Fail("NOT_LINKED", "Staff user is not linked to a business.");

                scopedBusinessId = actor.StaffBusinessId.Value;
            }
            else if (actor.Role == UserRole.Business)
            {
                var ownedBusinessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(actor.Id);
                if (ownedBusinessId == null)
                    return ApiResponse<StampAwardedResponse>.Fail("NOT_FOUND", "No business found for this account.");

                scopedBusinessId = ownedBusinessId.Value;
            }
            else
            {
                return ApiResponse<StampAwardedResponse>.Fail("UNAUTHORIZED", "Only business owners or staff can award stamps.");
            }

            if (request.BusinessId != scopedBusinessId.Value)
                return ApiResponse<StampAwardedResponse>.Fail("FORBIDDEN_SCOPE", "You are not authorized to award stamps for this business.");

            // Hash the presented token for DB lookup
            var tokenHash = HashToken(request.Token);

            // Find QR token — scoped to the business to prevent cross-business stamp attacks
            var qrToken = await _unitOfWork.QrTokens.FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && t.BusinessId == scopedBusinessId.Value);

            if (qrToken == null)
                return ApiResponse<StampAwardedResponse>.Fail("INVALID_TOKEN", "QR code is invalid.");

            if (qrToken.IsUsed)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_USED", "QR code has already been used.");

            if (qrToken.ExpiresAt < DateTime.UtcNow)
                return ApiResponse<StampAwardedResponse>.Fail("TOKEN_EXPIRED", "QR code has expired.");

            // Find the loyalty card for this customer + business
            var card = await _context.LoyaltyCards
                .Include(c => c.Program)
                .Include(c => c.Customer)
                .Include(c => c.Business)
                .FirstOrDefaultAsync(c => c.CustomerId == qrToken.CustomerId && c.BusinessId == scopedBusinessId.Value);

            if (card == null)
                return ApiResponse<StampAwardedResponse>.Fail("NOT_ENROLLED", "Customer is not enrolled in this business's loyalty program.");

            var now = DateTime.UtcNow;
            int stampNumber;
            bool rewardReady;

            // Atomically claim the QR token as part of the same transaction that
            // awards the stamp. The conditional UPDATE guarantees that concurrent
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

                // Lock the loyalty card row for the remainder of the transaction so the
                // counter increments below are serialized: concurrent stamps on the same
                // card, or a simultaneous reward claim (conditional UPDATE in
                // RedemptionService), can never interleave with this read-modify-write.
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT id FROM loyalty_cards WHERE id = {0} FOR UPDATE", card.Id);

                // Increment stamp counters
                card.TotalStamps++;
                card.LifetimeStamps++;
                card.LastStampAt = now;

                stampNumber = card.TotalStamps;
                rewardReady = card.TotalStamps >= card.Program.StampsRequired;

                // If reward threshold reached, set expiration and reset counter
                if (rewardReady)
                {
                    // Set reward expiry based on program setting (0 = no expiry)
                    card.RewardExpiresAt = card.Program.RewardExpirationHours > 0
                        ? now.AddHours(card.Program.RewardExpirationHours)
                        : (DateTime?)null;

                    card.TotalStamps = 0;
                    card.TotalRedemptions++;

                    // Auto-create a redemption record
                    var redemption = new Redemption
                    {
                        Id = Guid.NewGuid(),
                        CardId = card.Id,
                        BusinessId = scopedBusinessId.Value,
                        PerformedByUserId = staffOrBusinessUserId,
                        PerformedByRole = actor.Role.ToString(),
                        RewardValue = card.Program.RewardValue,
                        Status = "pending",
                        RedeemedAt = now,
                        CreatedAt = now
                    };
                    await _unitOfWork.Redemptions.AddAsync(redemption);
                }

                _unitOfWork.LoyaltyCards.Update(card);

                // Immutable stamp audit record
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

                await _unitOfWork.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            await _analyticsAggregationService.RecomputeTodayForBusinessAsync(scopedBusinessId.Value);
            await _analyticsAggregationService.RecomputeStaffDayAsync(
                scopedBusinessId.Value,
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
                        await _notificationsService.CreateGoalReachedAsync(actor.Id, scopedBusinessId.Value, stampsToday);
                    }
                }
            }

            // If this is the customer's first stamp at this business, process referral qualification
            if (card.LifetimeStamps == 1)
            {
                await _referralService.ProcessFirstStampReferralAsync(card.CustomerId, scopedBusinessId.Value);
            }

            // Push SSE event to customer's live connection
            _sseService.Publish(card.Id, new SseStampEvent
            {
                CardId = card.Id,
                StampNumber = stampNumber,
                TotalStamps = rewardReady ? 0 : card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                StampedAt = now
            });

            _logger.LogInformation("Stamp awarded: card={CardId}, stamp={StampNumber}, rewardReady={RewardReady}",
                card.Id, stampNumber, rewardReady);

            // Fire-and-forget email notifications (don't block the response)
            _ = Task.Run(async () =>
            {
                try
                {
                    if (rewardReady)
                        await _emailService.SendRewardReadyAsync(
                            card.Customer.Email, card.Business.Name, card.Program.RewardDescription);
                    else
                        await _emailService.SendStampNotificationAsync(
                            card.Customer.Email, card.Business.Name, stampNumber, card.Program.StampsRequired);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Non-critical: failed to send stamp email for card {CardId}", card.Id);
                }
            });

            return ApiResponse<StampAwardedResponse>.Ok(new StampAwardedResponse
            {
                CardId = card.Id,
                CustomerId = card.CustomerId,
                CustomerName = card.Customer.FullName,
                StampNumber = stampNumber,
                TotalStamps = rewardReady ? 0 : card.TotalStamps,
                StampsRequired = card.Program.StampsRequired,
                RewardReady = rewardReady,
                RewardDescription = card.Program.RewardDescription,
                StampedAt = now
            });
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
}
