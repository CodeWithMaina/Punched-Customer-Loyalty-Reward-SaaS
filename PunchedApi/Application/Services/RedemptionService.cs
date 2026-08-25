using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<RedemptionService> _logger;

    public RedemptionService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        IAnalyticsAggregationService analyticsAggregationService,
        ILogger<RedemptionService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _analyticsAggregationService = analyticsAggregationService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ApiResponse<RedemptionResponse>> ClaimRewardAsync(Guid customerId, ClaimRewardRequest request)
    {
        try
        {
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

            var redemption = new Redemption
            {
                Id = Guid.NewGuid(),
                CardId = card.Id,
                BusinessId = card.BusinessId,
                PerformedByUserId = customerId,
                PerformedByRole = UserRole.Customer.ToString(),
                RewardValue = card.Program.RewardValue,
                Status = "pending",
                RedeemedAt = now,
                CreatedAt = now
            };

            await _unitOfWork.Redemptions.AddAsync(redemption);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            await _analyticsAggregationService.RecomputeTodayForBusinessAsync(card.BusinessId);

            _logger.LogInformation(
                "Reward claimed: card={CardId}, redemption={RedemptionId}, value={Value}",
                card.Id, redemption.Id, card.Program.RewardValue);

            return ApiResponse<RedemptionResponse>.Ok(new RedemptionResponse
            {
                Id = redemption.Id,
                CardId = card.Id,
                BusinessName = card.Business.Name,
                RewardValue = card.Program.RewardValue,
                RewardDescription = card.Program.RewardDescription,
                Status = redemption.Status,
                RedeemedAt = redemption.RedeemedAt
            });
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
                    Status = r.Status,
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
}
