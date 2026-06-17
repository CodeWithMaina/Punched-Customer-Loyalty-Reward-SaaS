using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class ReferralService : IReferralService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ReferralService> _logger;

    public ReferralService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ILogger<ReferralService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════
    //  REFERRAL PROGRAM (Business Owner)
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<ReferralProgramResponse>> UpsertProgramAsync(Guid ownerId, UpsertReferralProgramRequest request)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<ReferralProgramResponse>.Fail("NO_BUSINESS", "You don't have a registered business.");

            var existing = await _unitOfWork.ReferralPrograms.FirstOrDefaultAsync(rp => rp.BusinessId == business.Id);

            if (existing != null)
            {
                existing.ReferralsRequired = request.ReferralsRequired;
                existing.RewardType = request.RewardType;
                existing.RewardValue = request.RewardValue;
                existing.RewardDescription = request.RewardDescription;
                existing.ExpirationDays = request.ExpirationDays;
                existing.IsActive = true;
                _unitOfWork.ReferralPrograms.Update(existing);
            }
            else
            {
                existing = new ReferralProgram
                {
                    Id = Guid.NewGuid(),
                    BusinessId = business.Id,
                    ReferralsRequired = request.ReferralsRequired,
                    RewardType = request.RewardType,
                    RewardValue = request.RewardValue,
                    RewardDescription = request.RewardDescription,
                    ExpirationDays = request.ExpirationDays,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.ReferralPrograms.AddAsync(existing);
            }

            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<ReferralProgramResponse>.Ok(MapProgram(existing));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting referral program for owner {OwnerId}", ownerId);
            return ApiResponse<ReferralProgramResponse>.Fail("UPSERT_FAILED", "Failed to save referral program.");
        }
    }

    public async Task<ApiResponse<ReferralProgramResponse>> GetProgramAsync(Guid businessId)
    {
        var program = await _unitOfWork.ReferralPrograms.FirstOrDefaultAsync(rp => rp.BusinessId == businessId);
        if (program == null)
            return ApiResponse<ReferralProgramResponse>.Fail("NOT_FOUND", "No referral program found for this business.");

        return ApiResponse<ReferralProgramResponse>.Ok(MapProgram(program));
    }

    // ═══════════════════════════════════════════════════════════
    //  REFERRAL LINKS (Customer)
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<ReferralLinkResponse>> GenerateLinkAsync(Guid customerId, GenerateReferralLinkRequest request)
    {
        try
        {
            // Verify business exists and has a referral program
            var business = await _context.Businesses
                .Include(b => b.ReferralProgram)
                .FirstOrDefaultAsync(b => b.Id == request.BusinessId);

            if (business == null)
                return ApiResponse<ReferralLinkResponse>.Fail("NOT_FOUND", "Business not found.");

            if (business.ReferralProgram == null || !business.ReferralProgram.IsActive)
                return ApiResponse<ReferralLinkResponse>.Fail("NO_PROGRAM", "This business does not have an active referral program.");

            // Customer must be enrolled in the business's loyalty program
            var isEnrolled = await _unitOfWork.LoyaltyCards.AnyAsync(
                c => c.CustomerId == customerId && c.BusinessId == request.BusinessId);
            if (!isEnrolled)
                return ApiResponse<ReferralLinkResponse>.Fail("NOT_ENROLLED", "You must be enrolled in this business's loyalty program to refer others.");

            // Check for existing link
            var existing = await _context.ReferralLinks
                .Include(rl => rl.Business)
                .FirstOrDefaultAsync(rl => rl.ReferrerId == customerId && rl.BusinessId == request.BusinessId);

            if (existing != null)
                return ApiResponse<ReferralLinkResponse>.Ok(MapLink(existing));

            // Generate unique code
            var code = await GenerateUniqueCodeAsync();

            var link = new ReferralLink
            {
                Id = Guid.NewGuid(),
                ReferrerId = customerId,
                BusinessId = request.BusinessId,
                Code = code,
                SuccessfulReferrals = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.ReferralLinks.AddAsync(link);
            await _unitOfWork.SaveChangesAsync();

            link.Business = business;
            return ApiResponse<ReferralLinkResponse>.Ok(MapLink(link));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating referral link for customer {CustomerId}", customerId);
            return ApiResponse<ReferralLinkResponse>.Fail("GENERATE_FAILED", "Failed to generate referral link.");
        }
    }

    public async Task<ApiResponse<List<ReferralLinkResponse>>> GetMyLinksAsync(Guid customerId)
    {
        var links = await _context.ReferralLinks
            .Include(rl => rl.Business)
            .Where(rl => rl.ReferrerId == customerId)
            .OrderByDescending(rl => rl.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<ReferralLinkResponse>>.Ok(links.Select(MapLink).ToList());
    }

    public async Task<ApiResponse<ReferralLinkResponse>> GetLinkForBusinessAsync(Guid customerId, Guid businessId)
    {
        var link = await _context.ReferralLinks
            .Include(rl => rl.Business)
            .FirstOrDefaultAsync(rl => rl.ReferrerId == customerId && rl.BusinessId == businessId);

        if (link == null)
            return ApiResponse<ReferralLinkResponse>.Fail("NOT_FOUND", "No referral link found for this business.");

        return ApiResponse<ReferralLinkResponse>.Ok(MapLink(link));
    }

    // ═══════════════════════════════════════════════════════════
    //  REFERRAL RESOLUTION (Referee clicks link)
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<ResolveReferralResponse>> ResolveCodeAsync(Guid refereeId, ResolveReferralRequest request)
    {
        try
        {
            var code = request.Code.Trim().ToUpperInvariant();

            var link = await _context.ReferralLinks
                .Include(rl => rl.Business)
                    .ThenInclude(b => b.LoyaltyPrograms)
                .Include(rl => rl.Referrer)
                .FirstOrDefaultAsync(rl => rl.Code == code && rl.IsActive);

            if (link == null)
                return ApiResponse<ResolveReferralResponse>.Fail("INVALID_CODE", "Referral code is invalid or expired.");

            // Self-referral prevention
            if (link.ReferrerId == refereeId)
                return ApiResponse<ResolveReferralResponse>.Fail("SELF_REFERRAL", "You cannot refer yourself.");

            // Check if referee already has an active referral for this business (first-referral-wins)
            var existingReferral = await _unitOfWork.Referrals.FirstOrDefaultAsync(
                r => r.RefereeId == refereeId && r.BusinessId == link.BusinessId && r.Status != ReferralStatus.Expired);

            if (existingReferral != null)
                return ApiResponse<ResolveReferralResponse>.Fail("ALREADY_REFERRED", "You already have a referral for this business.");

            // Get referral program for expiration TTL
            var program = await _unitOfWork.ReferralPrograms.FirstOrDefaultAsync(
                rp => rp.BusinessId == link.BusinessId && rp.IsActive);

            var expirationDays = program?.ExpirationDays ?? 30;

            // Create the referral record
            var now = DateTime.UtcNow;
            var referral = new Referral
            {
                Id = Guid.NewGuid(),
                ReferralLinkId = link.Id,
                ReferrerId = link.ReferrerId,
                RefereeId = refereeId,
                BusinessId = link.BusinessId,
                Status = ReferralStatus.Pending,
                ExpiresAt = now.AddDays(expirationDays),
                CreatedAt = now
            };

            // Auto-enroll referee in the business loyalty program if not already enrolled
            var isEnrolled = await _unitOfWork.LoyaltyCards.AnyAsync(
                c => c.CustomerId == refereeId && c.BusinessId == link.BusinessId);

            bool enrolled = isEnrolled;

            var activeProgram = link.Business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);
            if (!isEnrolled && activeProgram != null)
            {
                var card = new LoyaltyCard
                {
                    Id = Guid.NewGuid(),
                    CustomerId = refereeId,
                    BusinessId = link.BusinessId,
                    ProgramId = activeProgram.Id,
                    TotalStamps = 0,
                    LifetimeStamps = 0,
                    TotalRedemptions = 0,
                    EnrolledAt = now,
                    CreatedAt = now
                };
                await _unitOfWork.LoyaltyCards.AddAsync(card);
                enrolled = true;

                // Transition to Activated since they enrolled
                referral.Status = ReferralStatus.Activated;
                referral.ActivatedAt = now;
            }
            else if (isEnrolled)
            {
                // Already enrolled → activate immediately
                referral.Status = ReferralStatus.Activated;
                referral.ActivatedAt = now;
            }

            await _unitOfWork.Referrals.AddAsync(referral);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Referral resolved: code={Code}, referee={RefereeId}, business={BusinessId}, status={Status}",
                code, refereeId, link.BusinessId, referral.Status);

            return ApiResponse<ResolveReferralResponse>.Ok(new ResolveReferralResponse
            {
                BusinessId = link.BusinessId,
                BusinessName = link.Business.Name,
                BusinessLogoUrl = link.Business.LogoUrl,
                ReferrerName = link.Referrer.FullName,
                ReferralId = referral.Id,
                Enrolled = enrolled
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving referral code for referee {RefereeId}", refereeId);
            return ApiResponse<ResolveReferralResponse>.Fail("RESOLVE_FAILED", "Failed to process referral.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  REFERRAL TRACKING
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<List<ReferralResponse>>> GetMyReferralsAsync(Guid customerId)
    {
        var referrals = await _context.Referrals
            .Include(r => r.Referee)
            .Include(r => r.Referrer)
            .Include(r => r.Business)
            .Where(r => r.ReferrerId == customerId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        // Expire stale referrals in-flight
        var now = DateTime.UtcNow;
        var expiredAny = false;
        foreach (var r in referrals.Where(r => r.ExpiresAt < now && r.Status != ReferralStatus.Expired && r.Status != ReferralStatus.Rewarded))
        {
            r.Status = ReferralStatus.Expired;
            _unitOfWork.Referrals.Update(r);
            expiredAny = true;
        }
        if (expiredAny) await _unitOfWork.SaveChangesAsync();

        return ApiResponse<List<ReferralResponse>>.Ok(referrals.Select(MapReferral).ToList());
    }

    public async Task<ApiResponse<List<ReferralResponse>>> GetIncomingReferralsAsync(Guid customerId)
    {
        var referrals = await _context.Referrals
            .Include(r => r.Referee)
            .Include(r => r.Referrer)
            .Include(r => r.Business)
            .Where(r => r.RefereeId == customerId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<ReferralResponse>>.Ok(referrals.Select(MapReferral).ToList());
    }

    public async Task<ApiResponse<ReferralStatsResponse>> GetMyStatsAsync(Guid customerId)
    {
        var referrals = await _unitOfWork.Referrals.FindAsync(r => r.ReferrerId == customerId);
        var list = referrals.ToList();

        return ApiResponse<ReferralStatsResponse>.Ok(new ReferralStatsResponse
        {
            TotalReferrals = list.Count,
            PendingReferrals = list.Count(r => r.Status == ReferralStatus.Pending),
            ActivatedReferrals = list.Count(r => r.Status == ReferralStatus.Activated),
            QualifiedReferrals = list.Count(r => r.Status == ReferralStatus.Qualified),
            RewardedReferrals = list.Count(r => r.Status == ReferralStatus.Rewarded),
            ExpiredReferrals = list.Count(r => r.Status == ReferralStatus.Expired),
            TotalRewardsEarned = list.Count(r => r.Status == ReferralStatus.Rewarded)
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  INTERNAL: First Stamp Qualification Hook
    //  Called by StampService when a customer earns their first stamp
    // ═══════════════════════════════════════════════════════════

    public async Task ProcessFirstStampReferralAsync(Guid refereeId, Guid businessId)
    {
        try
        {
            // Find active (non-expired, non-rewarded) referral for this referee+business
            var referral = await _context.Referrals
                .Include(r => r.ReferralLink)
                .FirstOrDefaultAsync(r =>
                    r.RefereeId == refereeId &&
                    r.BusinessId == businessId &&
                    (r.Status == ReferralStatus.Pending || r.Status == ReferralStatus.Activated) &&
                    r.ExpiresAt > DateTime.UtcNow);

            if (referral == null) return;

            var now = DateTime.UtcNow;

            // Transition to Qualified
            referral.Status = ReferralStatus.Qualified;
            referral.QualifiedAt = now;
            if (referral.ActivatedAt == null) referral.ActivatedAt = now;
            _unitOfWork.Referrals.Update(referral);

            // Increment successful referrals on the link
            referral.ReferralLink.SuccessfulReferrals++;
            _unitOfWork.ReferralLinks.Update(referral.ReferralLink);

            // Check if referrer has reached the reward threshold
            var program = await _unitOfWork.ReferralPrograms.FirstOrDefaultAsync(
                rp => rp.BusinessId == businessId && rp.IsActive);

            if (program != null)
            {
                // Count total qualified/rewarded referrals for this referrer+business
                var qualifiedCount = await _unitOfWork.Referrals.CountAsync(r =>
                    r.ReferrerId == referral.ReferrerId &&
                    r.BusinessId == businessId &&
                    (r.Status == ReferralStatus.Qualified || r.Status == ReferralStatus.Rewarded));

                // Calculate unrewarded batch: qualified referrals that form a complete set
                var totalRewarded = await _unitOfWork.Referrals.CountAsync(r =>
                    r.ReferrerId == referral.ReferrerId &&
                    r.BusinessId == businessId &&
                    r.Status == ReferralStatus.Rewarded);

                var unrewardedQualified = qualifiedCount - totalRewarded;

                if (unrewardedQualified >= program.ReferralsRequired)
                {
                    // Issue reward: mark the batch as rewarded
                    var toReward = await _context.Referrals
                        .Where(r =>
                            r.ReferrerId == referral.ReferrerId &&
                            r.BusinessId == businessId &&
                            r.Status == ReferralStatus.Qualified)
                        .OrderBy(r => r.QualifiedAt)
                        .Take(program.ReferralsRequired)
                        .ToListAsync();

                    foreach (var r in toReward)
                    {
                        r.Status = ReferralStatus.Rewarded;
                        r.RewardedAt = now;
                        _unitOfWork.Referrals.Update(r);
                    }

                    // Award the referral reward based on type
                    await AwardReferralRewardAsync(referral.ReferrerId, businessId, program);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Referral qualified: referral={ReferralId}, referee={RefereeId}, business={BusinessId}",
                referral.Id, refereeId, businessId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing first stamp referral for referee {RefereeId}, business {BusinessId}",
                refereeId, businessId);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    private async Task AwardReferralRewardAsync(Guid referrerId, Guid businessId, ReferralProgram program)
    {
        switch (program.RewardType)
        {
            case ReferralRewardType.Stamp:
                // Award bonus stamps to referrer's card
                var card = await _context.LoyaltyCards
                    .Include(c => c.Program)
                    .FirstOrDefaultAsync(c => c.CustomerId == referrerId && c.BusinessId == businessId);

                if (card != null)
                {
                    var stampsToAdd = (int)program.RewardValue;
                    card.TotalStamps += stampsToAdd;
                    card.LifetimeStamps += stampsToAdd;
                    card.LastStampAt = DateTime.UtcNow;
                    _unitOfWork.LoyaltyCards.Update(card);

                    _logger.LogInformation("Referral reward: {Stamps} bonus stamps awarded to referrer {ReferrerId} at business {BusinessId}",
                        stampsToAdd, referrerId, businessId);
                }
                break;

            case ReferralRewardType.Discount:
            case ReferralRewardType.FreeItem:
                // Create a redemption record for the referrer
                var referrerCard = await _unitOfWork.LoyaltyCards.FirstOrDefaultAsync(
                    c => c.CustomerId == referrerId && c.BusinessId == businessId);

                if (referrerCard != null)
                {
                    var redemption = new Redemption
                    {
                        Id = Guid.NewGuid(),
                        CardId = referrerCard.Id,
                        BusinessId = businessId,
                        RewardValue = program.RewardValue,
                        Status = "completed",
                        RedeemedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.Redemptions.AddAsync(redemption);

                    _logger.LogInformation("Referral reward: {RewardType} valued at {Value} awarded to referrer {ReferrerId}",
                        program.RewardType, program.RewardValue, referrerId);
                }
                break;
        }
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes ambiguous: I, O, 0, 1
        var random = RandomNumberGenerator.Create();
        var buffer = new byte[8];

        for (var attempt = 0; attempt < 10; attempt++)
        {
            random.GetBytes(buffer);
            var code = new string(buffer.Select(b => chars[b % chars.Length]).Take(8).ToArray());

            var exists = await _unitOfWork.ReferralLinks.AnyAsync(rl => rl.Code == code);
            if (!exists) return code;
        }

        throw new InvalidOperationException("Failed to generate unique referral code after 10 attempts.");
    }

    private static ReferralProgramResponse MapProgram(ReferralProgram program) => new()
    {
        Id = program.Id,
        BusinessId = program.BusinessId,
        ReferralsRequired = program.ReferralsRequired,
        RewardType = program.RewardType,
        RewardValue = program.RewardValue,
        RewardDescription = program.RewardDescription,
        IsActive = program.IsActive,
        ExpirationDays = program.ExpirationDays,
        CreatedAt = program.CreatedAt
    };

    private static ReferralLinkResponse MapLink(ReferralLink link) => new()
    {
        Id = link.Id,
        ReferrerId = link.ReferrerId,
        BusinessId = link.BusinessId,
        BusinessName = link.Business?.Name ?? string.Empty,
        BusinessLogoUrl = link.Business?.LogoUrl,
        Code = link.Code,
        ReferralUrl = $"https://punched.app/refer/{link.Code}",
        SuccessfulReferrals = link.SuccessfulReferrals,
        IsActive = link.IsActive,
        CreatedAt = link.CreatedAt
    };

    private static ReferralResponse MapReferral(Referral referral) => new()
    {
        Id = referral.Id,
        ReferrerId = referral.ReferrerId,
        ReferrerName = referral.Referrer?.FullName ?? string.Empty,
        RefereeId = referral.RefereeId,
        RefereeName = referral.Referee?.FullName ?? string.Empty,
        BusinessId = referral.BusinessId,
        BusinessName = referral.Business?.Name ?? string.Empty,
        Status = referral.ExpiresAt < DateTime.UtcNow && referral.Status != ReferralStatus.Rewarded
            ? ReferralStatus.Expired
            : referral.Status,
        ActivatedAt = referral.ActivatedAt,
        QualifiedAt = referral.QualifiedAt,
        RewardedAt = referral.RewardedAt,
        ExpiresAt = referral.ExpiresAt,
        CreatedAt = referral.CreatedAt
    };
}
