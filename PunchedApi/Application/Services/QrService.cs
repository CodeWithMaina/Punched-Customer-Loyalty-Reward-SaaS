using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Application.Services;

public class QrService : IQrService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<QrService> _logger;

    // Token lifespan — short enough to prevent replay, long enough for a POS scan
    private const int TokenLifespanSeconds = 45;

    public QrService(IUnitOfWork unitOfWork, ILogger<QrService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ApiResponse<QrTokenResponse>> GenerateTokenAsync(Guid customerId, GenerateQrRequest request)
    {
        try
        {
            // Verify the customer is actually enrolled at this business
            var enrolled = await _unitOfWork.LoyaltyCards
                .AnyAsync(c => c.CustomerId == customerId && c.BusinessId == request.BusinessId);

            if (!enrolled)
                return ApiResponse<QrTokenResponse>.Fail("NOT_ENROLLED", "You are not enrolled in this business's loyalty program.");

            // Generate a cryptographically random token
            var rawToken = GenerateSecureToken();
            var tokenHash = HashToken(rawToken);
            var expiresAt = DateTime.UtcNow.AddSeconds(TokenLifespanSeconds);

            var qrToken = new QrToken
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                BusinessId = request.BusinessId,
                TokenHash = tokenHash,
                ExpiresAt = expiresAt,
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.QrTokens.AddAsync(qrToken);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("QR token generated for customer {CustomerId} at business {BusinessId}", customerId, request.BusinessId);

            return ApiResponse<QrTokenResponse>.Ok(new QrTokenResponse
            {
                Token = rawToken,
                ExpiresAt = expiresAt,
                BusinessId = request.BusinessId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR token for customer {CustomerId}", customerId);
            return ApiResponse<QrTokenResponse>.Fail("GENERATE_FAILED", "Failed to generate QR token.");
        }
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
