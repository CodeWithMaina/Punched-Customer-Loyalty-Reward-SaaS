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
    private readonly ILogger<StampService> _logger;

    public StampService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ISseService sseService,
        IReferralService referralService,
        IEmailService emailService,
        ILogger<StampService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _sseService = sseService;
        _referralService = referralService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(Guid staffOrBusinessUserId, AwardStampRequest request)
    {
        try
        {
            // Hash the presented token for DB lookup
            var tokenHash = HashToken(request.Token);

            // Find QR token — scoped to the business to prevent cross-business stamp attacks
            var qrToken = await _unitOfWork.QrTokens.FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && t.BusinessId == request.BusinessId);

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
                .FirstOrDefaultAsync(c => c.CustomerId == qrToken.CustomerId && c.BusinessId == request.BusinessId);

            if (card == null)
                return ApiResponse<StampAwardedResponse>.Fail("NOT_ENROLLED", "Customer is not enrolled in this business's loyalty program.");

            var now = DateTime.UtcNow;

            // Mark token as used (idempotency guard)
            qrToken.IsUsed = true;
            _unitOfWork.QrTokens.Update(qrToken);

            // Increment stamp counters
            card.TotalStamps++;
            card.LifetimeStamps++;
            card.LastStampAt = now;

            var stampNumber = card.TotalStamps;
            var rewardReady = card.TotalStamps >= card.Program.StampsRequired;

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
                    BusinessId = request.BusinessId,
                    RewardValue = card.Program.RewardValue,
                    Status = "completed",
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
                CreatedAt = now
            };
            await _unitOfWork.Stamps.AddAsync(stamp);

            await _unitOfWork.SaveChangesAsync();

            // If this is the customer's first stamp at this business, process referral qualification
            if (card.LifetimeStamps == 1)
            {
                await _referralService.ProcessFirstStampReferralAsync(card.CustomerId, request.BusinessId);
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

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
