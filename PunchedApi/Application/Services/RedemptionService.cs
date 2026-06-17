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
    private readonly ILogger<RedemptionService> _logger;

    public RedemptionService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ILogger<RedemptionService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
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

            if (card.TotalStamps < card.Program.StampsRequired)
                return ApiResponse<RedemptionResponse>.Fail(
                    "INSUFFICIENT_STAMPS",
                    $"You need {card.Program.StampsRequired - card.TotalStamps} more stamps to claim this reward.");

            // Create redemption record
            var redemption = new Redemption
            {
                Id = Guid.NewGuid(),
                CardId = card.Id,
                BusinessId = card.BusinessId,
                RewardValue = card.Program.RewardValue,
                Status = "completed",
                RedeemedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Redemptions.AddAsync(redemption);

            // Reset current stamps and increment redemption count
            card.TotalStamps = 0;
            card.TotalRedemptions++;
            _unitOfWork.LoyaltyCards.Update(card);

            await _unitOfWork.SaveChangesAsync();

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
            var redemptions = await _context.Redemptions
                .Include(r => r.Card)
                .Include(r => r.Business)
                    .ThenInclude(b => b.LoyaltyPrograms)
                .Where(r => r.Card.CustomerId == customerId)
                .OrderByDescending(r => r.RedeemedAt)
                .ToListAsync();

            var result = redemptions.Select(r => new RedemptionResponse
            {
                Id = r.Id,
                CardId = r.CardId,
                BusinessName = r.Business.Name,
                RewardValue = r.RewardValue,
                RewardDescription = r.Business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive)?.RewardDescription ?? "Reward",
                Status = r.Status,
                RedeemedAt = r.RedeemedAt
            }).ToList();

            return ApiResponse<List<RedemptionResponse>>.Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting redemptions for customer {CustomerId}", customerId);
            return ApiResponse<List<RedemptionResponse>>.Fail("FETCH_FAILED", "Failed to load redemptions.");
        }
    }
}
