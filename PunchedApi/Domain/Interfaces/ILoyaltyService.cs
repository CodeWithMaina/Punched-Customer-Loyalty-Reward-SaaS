using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface ILoyaltyService
{
    // Business program management
    Task<ApiResponse<List<LoyaltyProgramResponse>>> GetBusinessProgramsAsync(Guid ownerId);
    Task<ApiResponse<LoyaltyProgramResponse>> CreateProgramAsync(Guid ownerId, CreateLoyaltyProgramRequest request);
    Task<ApiResponse<LoyaltyProgramResponse>> UpdateProgramAsync(Guid ownerId, Guid programId, UpdateLoyaltyProgramRequest request);
    Task<ApiResponse<bool>> DeleteProgramAsync(Guid ownerId, Guid programId);

    // Legacy upsert (kept for backward compatibility)
    Task<ApiResponse<LoyaltyProgramResponse>> UpsertProgramAsync(Guid ownerId, UpsertLoyaltyProgramRequest request);
    Task<ApiResponse<LoyaltyProgramResponse>> GetProgramAsync(Guid businessId);

    // Customer card operations
    Task<ApiResponse<LoyaltyCardResponse>> EnrollAsync(Guid customerId, EnrollCardRequest request);
    Task<ApiResponse<List<LoyaltyCardResponse>>> GetMyCardsAsync(Guid customerId);
    Task<ApiResponse<LoyaltyCardResponse>> GetCardByIdAsync(Guid customerId, Guid cardId);
}
