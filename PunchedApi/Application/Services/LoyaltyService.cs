using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Programs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class LoyaltyService : ILoyaltyService
{
        private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IStampService _stampService;
    private readonly IProgramRuleEngine _ruleEngine;
    private readonly ILogger<LoyaltyService> _logger;

    public LoyaltyService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        IStampService stampService,
        IProgramRuleEngine ruleEngine,
        ILogger<LoyaltyService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _stampService = stampService;
        _ruleEngine = ruleEngine;
        _logger = logger;
    }

    public async Task<ApiResponse<LoyaltyProgramResponse>> UpsertProgramAsync(Guid ownerId, UpsertLoyaltyProgramRequest request)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var program = await _unitOfWork.LoyaltyPrograms
                .FirstOrDefaultAsync(p => p.BusinessId == business.Id);

            if (program == null)
            {
                program = new LoyaltyProgram
                {
                    Id = Guid.NewGuid(),
                    BusinessId = business.Id,
                    Name = "Loyalty Program",
                    IsActive = true,
                    StampsRequired = request.StampsRequired,
                    RewardValue = request.RewardValue,
                    RewardDescription = request.RewardDescription.Trim(),
                    RewardExpirationHours = request.RewardExpirationHours,
                    DefaultEnrollmentStamps = Math.Clamp(request.DefaultEnrollmentStamps, 0, 100),
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.LoyaltyPrograms.AddAsync(program);
                await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
                {
                    Id = Guid.NewGuid(),
                    LoyaltyProgramId = program.Id,
                    StampsRequired = program.StampsRequired,
                    RewardValue = program.RewardValue,
                    RewardDescription = program.RewardDescription,
                    EffectiveFrom = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    ChangedByUserId = ownerId
                });
            }
            else
            {
                var now = DateTime.UtcNow;
                var activeHistory = await _context.LoyaltyProgramHistory
                    .Where(h => h.LoyaltyProgramId == program.Id && h.EffectiveTo == null)
                    .ToListAsync();

                foreach (var history in activeHistory)
                {
                    history.EffectiveTo = now;
                }

                program.StampsRequired = request.StampsRequired;
                program.RewardValue = request.RewardValue;
                program.RewardDescription = request.RewardDescription.Trim();
                program.RewardExpirationHours = request.RewardExpirationHours;
                program.DefaultEnrollmentStamps = Math.Clamp(request.DefaultEnrollmentStamps, 0, 100);
                _unitOfWork.LoyaltyPrograms.Update(program);

                await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
                {
                    Id = Guid.NewGuid(),
                    LoyaltyProgramId = program.Id,
                    StampsRequired = program.StampsRequired,
                    RewardValue = program.RewardValue,
                    RewardDescription = program.RewardDescription,
                    EffectiveFrom = now,
                    CreatedAt = now,
                    ChangedByUserId = ownerId
                });
            }

            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting program for owner {OwnerId}", ownerId);
            return ApiResponse<LoyaltyProgramResponse>.Fail("UPSERT_FAILED", "Failed to save loyalty program.");
        }
    }

    // ── Business program management ─────────────────────────

    public async Task<ApiResponse<List<LoyaltyProgramResponse>>> GetBusinessProgramsAsync(Guid ownerId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<LoyaltyProgramResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var programs = await _context.LoyaltyPrograms
            .Where(p => p.BusinessId == business.Id)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<LoyaltyProgramResponse>>.Ok(programs.Select(MapProgram).ToList());
    }

    public async Task<ApiResponse<LoyaltyProgramResponse>> GetBusinessProgramAsync(Guid ownerId, Guid programId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var program = await _context.LoyaltyPrograms
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);
        return program == null
            ? ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "Loyalty program not found.")
            : ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
    }

    public async Task<ApiResponse<LoyaltyProgramResponse>> CreateProgramAsync(Guid ownerId, CreateLoyaltyProgramRequest request)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var program = new LoyaltyProgram
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                Name = request.Name.Trim(),
                Description = request.Description,
                IsActive = true,
                Status = ProgramStatus.Active,
                StampsRequired = request.StampsRequired,
                RewardValue = request.RewardValue,
                RewardDescription = request.RewardDescription.Trim(),
                DefaultEnrollmentStamps = Math.Clamp(request.DefaultEnrollmentStamps, 0, 100),
                ProgramType = ValidateProgramType(request.ProgramType),
                ConfigJson = request.Config?.ToJson(),
                StartsAt = NormalizeUtc(request.StartsAt),
                EndsAt = NormalizeUtc(request.EndsAt),
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.LoyaltyPrograms.AddAsync(program);
            await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
            {
                Id = Guid.NewGuid(),
                LoyaltyProgramId = program.Id,
                StampsRequired = program.StampsRequired,
                RewardValue = program.RewardValue,
                RewardDescription = program.RewardDescription,
                EffectiveFrom = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                ChangedByUserId = ownerId
            });
            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating program for owner {OwnerId}", ownerId);
            return ApiResponse<LoyaltyProgramResponse>.Fail("CREATE_FAILED", "Failed to create loyalty program.");
        }
    }

    public async Task<ApiResponse<LoyaltyProgramResponse>> UpdateProgramAsync(Guid ownerId, Guid programId, UpdateLoyaltyProgramRequest request)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var program = await _unitOfWork.LoyaltyPrograms
                .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);

            if (program == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "Loyalty program not found.");

            if (request.Name != null) program.Name = request.Name.Trim();
            if (request.Description != null) program.Description = request.Description;
            if (request.StartsAt.HasValue) program.StartsAt = NormalizeUtc(request.StartsAt);
            if (request.EndsAt.HasValue) program.EndsAt = NormalizeUtc(request.EndsAt);
            if (request.ProgramType != null) program.ProgramType = ValidateProgramType(request.ProgramType);
            if (request.Config != null) program.ConfigJson = request.Config.ToJson();
            if (request.Status.HasValue) ApplyStatus(program, request.Status.Value);
            else if (request.IsActive.HasValue) ApplyStatus(program, request.IsActive.Value ? ProgramStatus.Active : ProgramStatus.Paused);
            var changed = false;
            var now = DateTime.UtcNow;
            if (request.StampsRequired.HasValue && request.StampsRequired.Value != program.StampsRequired) changed = true;
            if (request.RewardValue.HasValue && request.RewardValue.Value != program.RewardValue) changed = true;
            if (request.RewardDescription != null && request.RewardDescription.Trim() != program.RewardDescription) changed = true;
            if (request.StampsRequired.HasValue) program.StampsRequired = request.StampsRequired.Value;
            if (request.RewardValue.HasValue) program.RewardValue = request.RewardValue.Value;
            if (request.RewardDescription != null) program.RewardDescription = request.RewardDescription.Trim();
            if (request.DefaultEnrollmentStamps.HasValue)
                program.DefaultEnrollmentStamps = Math.Clamp(request.DefaultEnrollmentStamps.Value, 0, 100);

            _unitOfWork.LoyaltyPrograms.Update(program);

            if (changed)
            {
                var activeHistory = await _context.LoyaltyProgramHistory
                    .Where(h => h.LoyaltyProgramId == program.Id && h.EffectiveTo == null)
                    .ToListAsync();

                foreach (var history in activeHistory)
                {
                    history.EffectiveTo = now;
                }

                await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
                {
                    Id = Guid.NewGuid(),
                    LoyaltyProgramId = program.Id,
                    StampsRequired = program.StampsRequired,
                    RewardValue = program.RewardValue,
                    RewardDescription = program.RewardDescription,
                    EffectiveFrom = now,
                    CreatedAt = now,
                    ChangedByUserId = ownerId
                });
            }

            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating program {ProgramId} for owner {OwnerId}", programId, ownerId);
            return ApiResponse<LoyaltyProgramResponse>.Fail("UPDATE_FAILED", "Failed to update loyalty program.");
        }
    }

    public async Task<ApiResponse<bool>> DeleteProgramAsync(Guid ownerId, Guid programId)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<bool>.Fail("NOT_FOUND", "No business found for this account.");

            var program = await _unitOfWork.LoyaltyPrograms
                .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);

            if (program == null)
                return ApiResponse<bool>.Fail("NOT_FOUND", "Loyalty program not found.");

            _unitOfWork.LoyaltyPrograms.Delete(program);
            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<bool>.Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting program {ProgramId} for owner {OwnerId}", programId, ownerId);
            return ApiResponse<bool>.Fail("DELETE_FAILED", "Failed to delete loyalty program.");
        }
    }

        public async Task<ApiResponse<LoyaltyProgramResponse>> ActivateProgramAsync(Guid ownerId, Guid programId)
        => await SetProgramStatusAsync(ownerId, programId, ProgramStatus.Active);

    public async Task<ApiResponse<LoyaltyProgramResponse>> PauseProgramAsync(Guid ownerId, Guid programId)
        => await SetProgramStatusAsync(ownerId, programId, ProgramStatus.Paused);

    public async Task<ApiResponse<LoyaltyProgramResponse>> ArchiveProgramAsync(Guid ownerId, Guid programId)
        => await SetProgramStatusAsync(ownerId, programId, ProgramStatus.Archived);

    public async Task<ApiResponse<LoyaltyProgramResponse>> DuplicateProgramAsync(Guid ownerId, Guid programId, string? newName = null)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var source = await _context.LoyaltyPrograms
                .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);
            if (source == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "Loyalty program not found.");

            var now = DateTime.UtcNow;
            var copy = new LoyaltyProgram
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                Name = string.IsNullOrWhiteSpace(newName)
                    ? $"{source.Name} (Copy)"
                    : newName.Trim(),
                Description = source.Description,
                IsActive = false,
                Status = ProgramStatus.Draft,
                StampsRequired = source.StampsRequired,
                RewardValue = source.RewardValue,
                RewardDescription = source.RewardDescription,
                RewardExpirationHours = source.RewardExpirationHours,
                DefaultEnrollmentStamps = source.DefaultEnrollmentStamps,
                MaxStampsPerVisit = source.MaxStampsPerVisit,
                StampExpiryDays = source.StampExpiryDays,
                ProgramType = source.ProgramType,
                ConfigJson = source.ConfigJson,
                StartsAt = source.StartsAt,
                EndsAt = source.EndsAt,
                CreatedAt = now
            };

            await _unitOfWork.LoyaltyPrograms.AddAsync(copy);
            await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
            {
                Id = Guid.NewGuid(),
                LoyaltyProgramId = copy.Id,
                StampsRequired = copy.StampsRequired,
                RewardValue = copy.RewardValue,
                RewardDescription = copy.RewardDescription,
                EffectiveFrom = now,
                CreatedAt = now,
                ChangedByUserId = ownerId
            });
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(copy));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error duplicating program {ProgramId} for owner {OwnerId}", programId, ownerId);
            return ApiResponse<LoyaltyProgramResponse>.Fail("DUPLICATE_FAILED", "Failed to duplicate loyalty program.");
        }
    }

        public async Task<ApiResponse<ProgramDetailResponse>> GetProgramDetailAsync(Guid ownerId, Guid programId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<ProgramDetailResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var program = await _context.LoyaltyPrograms
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);
        if (program == null)
            return ApiResponse<ProgramDetailResponse>.Fail("NOT_FOUND", "Loyalty program not found.");

        var activeCards = await _context.LoyaltyCards.CountAsync(c => c.ProgramId == program.Id);
        var stampsIssued = await _context.Stamps.CountAsync(s => s.Card.ProgramId == program.Id);
        var rewardsEarned = await _context.Redemptions.CountAsync(r => r.Card.ProgramId == program.Id);
        var rewardsRedeemed = await _context.Redemptions
            .CountAsync(r => r.Card.ProgramId == program.Id && r.Status == RedemptionStatus.Fulfilled);

        var completionRate = activeCards > 0 ? Math.Round(rewardsEarned * 100.0 / activeCards, 1) : 0;
        var redemptionRate = rewardsEarned > 0 ? Math.Round(rewardsRedeemed * 100.0 / rewardsEarned, 1) : 0;

        return ApiResponse<ProgramDetailResponse>.Ok(new ProgramDetailResponse
        {
            Program = MapProgram(program),
            Summary = _ruleEngine.Describe(program),
            ActiveCustomers = activeCards,
            StampsIssued = stampsIssued,
            RewardsEarned = rewardsEarned,
            RewardsRedeemed = rewardsRedeemed,
            CompletionRate = completionRate,
            RedemptionRate = redemptionRate
        });
    }

    private async Task<ApiResponse<LoyaltyProgramResponse>> SetProgramStatusAsync(Guid ownerId, Guid programId, ProgramStatus status)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var program = await _unitOfWork.LoyaltyPrograms
                .FirstOrDefaultAsync(p => p.Id == programId && p.BusinessId == business.Id);
            if (program == null)
                return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "Loyalty program not found.");

            ApplyStatus(program, status);
            _unitOfWork.LoyaltyPrograms.Update(program);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting status {Status} on program {ProgramId}", status, programId);
            return ApiResponse<LoyaltyProgramResponse>.Fail("STATUS_FAILED", "Failed to update program status.");
        }
    }

    private static void ApplyStatus(LoyaltyProgram program, ProgramStatus status)
    {
        program.Status = status;
        program.IsActive = status == ProgramStatus.Active;
    }

    private static string ValidateProgramType(string? value) =>
        ProgramTypes.IsKnown(value) ? value! : ProgramTypes.Stamp;

    private static DateTime? NormalizeUtc(DateTime? value) =>
        value.HasValue ? value.Value.ToUniversalTime() : null;

        public async Task BackfillProgramHistoryAsync(CancellationToken cancellationToken = default)
    {
        var programs = await _context.LoyaltyPrograms
            .IgnoreQueryFilters()
            .ToListAsync(cancellationToken);

        foreach (var program in programs)
        {
            var hasHistory = await _context.LoyaltyProgramHistory
                .AnyAsync(h => h.LoyaltyProgramId == program.Id, cancellationToken);

            if (!hasHistory)
            {
                await _context.LoyaltyProgramHistory.AddAsync(new LoyaltyProgramHistory
                {
                    Id = Guid.NewGuid(),
                    LoyaltyProgramId = program.Id,
                    StampsRequired = program.StampsRequired,
                    RewardValue = program.RewardValue,
                    RewardDescription = program.RewardDescription,
                    EffectiveFrom = program.CreatedAt,
                    CreatedAt = DateTime.UtcNow
                }, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync();
        _logger.LogInformation("Backfilled loyalty program history for {Count} programs", programs.Count);
    }

    // ── Legacy upsert ────────────────────────────────────────

    public async Task<ApiResponse<LoyaltyProgramResponse>> GetProgramAsync(Guid businessId)
    {
        var program = await _unitOfWork.LoyaltyPrograms
            .FirstOrDefaultAsync(p => p.BusinessId == businessId);

        if (program == null)
            return ApiResponse<LoyaltyProgramResponse>.Fail("NOT_FOUND", "No loyalty program found for this business.");

        return ApiResponse<LoyaltyProgramResponse>.Ok(MapProgram(program));
    }

    public async Task<ApiResponse<LoyaltyCardResponse>> EnrollAsync(Guid customerId, EnrollCardRequest request)
    {
        try
        {
            var business = await _context.Businesses
                .Include(b => b.LoyaltyPrograms)
                .FirstOrDefaultAsync(b => b.Id == request.BusinessId);

            if (business == null)
                return ApiResponse<LoyaltyCardResponse>.Fail("NOT_FOUND", "Business not found.");

            var activeProgram = business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);
            if (activeProgram == null)
                return ApiResponse<LoyaltyCardResponse>.Fail("NO_PROGRAM", "This business has no active loyalty program.");

            var existing = await _unitOfWork.LoyaltyCards
                .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.BusinessId == request.BusinessId);

            if (existing != null)
                return ApiResponse<LoyaltyCardResponse>.Fail("ALREADY_ENROLLED", "You are already enrolled in this program.");

            var now = DateTime.UtcNow;
            var welcomeStamps = Math.Clamp(activeProgram.DefaultEnrollmentStamps, 0, 100);

            var card = new LoyaltyCard
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                BusinessId = business.Id,
                ProgramId = activeProgram.Id,
                TotalStamps = welcomeStamps,
                LifetimeStamps = welcomeStamps,
                TotalRedemptions = 0,
                LastStampAt = welcomeStamps > 0 ? now : null,
                EnrolledAt = now,
                CreatedAt = now
            };

                        await _unitOfWork.LoyaltyCards.AddAsync(card);

            // Record the welcome stamp ledger entries via StampService so the
            // Source column and activity feed stay consistent.
            for (var i = 1; i <= welcomeStamps; i++)
            {
                await _stampService.CreateEnrollmentStampAsync(card.Id, i);
            }

            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<LoyaltyCardResponse>.Ok(MapCard(card, business, activeProgram));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enrolling customer {CustomerId} in business {BusinessId}", customerId, request.BusinessId);
            return ApiResponse<LoyaltyCardResponse>.Fail("ENROLL_FAILED", "Failed to enroll in loyalty program.");
        }
    }

    public async Task<ApiResponse<List<LoyaltyCardResponse>>> GetMyCardsAsync(Guid customerId)
    {
        var cards = await _context.LoyaltyCards
            .Include(c => c.Business)
            .Include(c => c.Program)
            .Where(c => c.CustomerId == customerId)
            .OrderByDescending(c => c.LastStampAt ?? c.EnrolledAt)
            .ToListAsync();

        var result = cards.Select(c => MapCard(c, c.Business, c.Program)).ToList();
        return ApiResponse<List<LoyaltyCardResponse>>.Ok(result);
    }

    public async Task<ApiResponse<LoyaltyCardResponse>> GetCardByIdAsync(Guid customerId, Guid cardId)
    {
        var card = await _context.LoyaltyCards
            .Include(c => c.Business)
            .Include(c => c.Program)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.CustomerId == customerId);

        if (card == null)
            return ApiResponse<LoyaltyCardResponse>.Fail("NOT_FOUND", "Loyalty card not found.");

        return ApiResponse<LoyaltyCardResponse>.Ok(MapCard(card, card.Business, card.Program));
    }

    private static LoyaltyProgramResponse MapProgram(LoyaltyProgram p) => new()
    {
        Id = p.Id,
        BusinessId = p.BusinessId,
        Name = p.Name,
        Description = p.Description,
        IsActive = p.IsActive,
        Status = p.Status switch
        {
            ProgramStatus.Draft => "draft",
            ProgramStatus.Paused => "paused",
            ProgramStatus.Archived => "archived",
            _ => "active"
        },
        StampsRequired = p.StampsRequired,
        RewardValue = p.RewardValue,
        RewardDescription = p.RewardDescription,
        RewardExpirationHours = p.RewardExpirationHours,
        DefaultEnrollmentStamps = p.DefaultEnrollmentStamps,
        ProgramType = string.IsNullOrWhiteSpace(p.ProgramType) ? "stamp" : p.ProgramType,
        Config = ProgramConfig.FromJson(p.ConfigJson),
        StartsAt = p.StartsAt,
        EndsAt = p.EndsAt,
        CreatedAt = p.CreatedAt
    };

    private static LoyaltyCardResponse MapCard(LoyaltyCard c, Business b, LoyaltyProgram p) => new()
    {
        Id = c.Id,
        CustomerId = c.CustomerId,
        BusinessId = c.BusinessId,
        BusinessName = b.Name,
        BusinessLogoUrl = b.LogoUrl,
        ProgramId = c.ProgramId,
        TotalStamps = c.TotalStamps,
        LifetimeStamps = c.LifetimeStamps,
        TotalRedemptions = c.TotalRedemptions,
        LastStampAt = c.LastStampAt,
        EnrolledAt = c.EnrolledAt,
        RewardExpiresAt = c.RewardExpiresAt,
        Program = MapProgram(p)
    };
}
