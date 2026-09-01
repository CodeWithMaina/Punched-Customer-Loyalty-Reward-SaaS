using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// DB-backed idempotency replay store. Entries expire after 24 hours;
/// expired entries are treated as absent and pruned opportunistically.
/// </summary>
public class IdempotencyService : IIdempotencyService
{
    private static readonly TimeSpan EntryLifetime = TimeSpan.FromHours(24);

    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<IdempotencyService> _logger;

    public IdempotencyService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ILogger<IdempotencyService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    public async Task<IdempotencyLookupResult> TryGetAsync(string key, Guid userId, string requestHash)
    {
        var entry = await _context.IdempotencyKeys
            .FirstOrDefaultAsync(k => k.Key == key && k.UserId == userId);

        if (entry == null || entry.ExpiresAt < DateTime.UtcNow)
            return new IdempotencyLookupResult { Found = false };

        if (!string.Equals(entry.RequestHash, requestHash, StringComparison.Ordinal))
            return new IdempotencyLookupResult { Found = true, Conflict = true };

        return new IdempotencyLookupResult { Found = true, ResponseJson = entry.ResponseJson };
    }

    public async Task StoreAsync(string key, Guid userId, string requestHash, string responseJson)
    {
        try
        {
            var existing = await _context.IdempotencyKeys
                .FirstOrDefaultAsync(k => k.Key == key && k.UserId == userId);

            if (existing != null)
                return; // First response wins; never overwrite.

            await _unitOfWork.IdempotencyKeys.AddAsync(new IdempotencyKey
            {
                Id = Guid.NewGuid(),
                Key = key,
                UserId = userId,
                RequestHash = requestHash,
                ResponseJson = responseJson,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.Add(EntryLifetime)
            });
            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Idempotency storage must never break the primary operation.
            _logger.LogWarning(ex, "Failed to store idempotency entry for key {Key}", key);
        }
    }
}
