using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class LoyaltyService : ILoyaltyService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LoyaltyService> _logger;

    public LoyaltyService(IUnitOfWork unitOfWork, ApplicationDbContext context, ILogger<LoyaltyService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
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
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.LoyaltyPrograms.AddAsync(program);
            }
            else
            {
                program.StampsRequired = request.StampsRequired;
                program.RewardValue = request.RewardValue;
                program.RewardDescription = request.RewardDescription.Trim();
                program.RewardExpirationHours = request.RewardExpirationHours;
                _unitOfWork.LoyaltyPrograms.Update(program);
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
                IsActive = true,
                StampsRequired = request.StampsRequired,
                RewardValue = request.RewardValue,
                RewardDescription = request.RewardDescription.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.LoyaltyPrograms.AddAsync(program);
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
            if (request.IsActive.HasValue) program.IsActive = request.IsActive.Value;
            if (request.StampsRequired.HasValue) program.StampsRequired = request.StampsRequired.Value;
            if (request.RewardValue.HasValue) program.RewardValue = request.RewardValue.Value;
            if (request.RewardDescription != null) program.RewardDescription = request.RewardDescription.Trim();

            _unitOfWork.LoyaltyPrograms.Update(program);
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

            var card = new LoyaltyCard
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                BusinessId = business.Id,
                ProgramId = activeProgram.Id,
                TotalStamps = 0,
                LifetimeStamps = 0,
                TotalRedemptions = 0,
                EnrolledAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.LoyaltyCards.AddAsync(card);
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
        IsActive = p.IsActive,
        StampsRequired = p.StampsRequired,
        RewardValue = p.RewardValue,
        RewardDescription = p.RewardDescription,
        RewardExpirationHours = p.RewardExpirationHours,
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
