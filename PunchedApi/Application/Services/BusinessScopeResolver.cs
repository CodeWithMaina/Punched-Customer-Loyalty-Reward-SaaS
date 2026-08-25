using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Resolves the authenticated owner's business id with a short-TTL cache so that
/// hot request paths do not pay an extra database round trip per request purely
/// for tenant resolution. The mapping (OwnerId → BusinessId) is stable; any flow
/// that creates a business invalidates its owner key immediately.
/// </summary>
public interface IBusinessScopeResolver
{
    Task<Guid?> GetOwnedBusinessIdAsync(Guid ownerId);
    void InvalidateOwner(Guid ownerId);
}

/// <remarks>
/// Registered as a singleton, so the (scoped) DbContext is resolved per lookup
/// through IServiceScopeFactory instead of being captured in the singleton.
/// </remarks>
public sealed class BusinessScopeResolver : IBusinessScopeResolver
{
    private const string KeyPrefix = "bizscope:owner:";
    private static readonly TimeSpan PositiveTtl = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan NegativeTtl = TimeSpan.FromSeconds(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;

    public BusinessScopeResolver(IServiceScopeFactory scopeFactory, IMemoryCache cache)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
    }

    public async Task<Guid?> GetOwnedBusinessIdAsync(Guid ownerId)
    {
        return await _cache.GetOrCreateAsync(KeyPrefix + ownerId, async entry =>
        {
            Guid? businessId;
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                businessId = await context.Businesses
                    .AsNoTracking()
                    .Where(b => b.OwnerId == ownerId)
                    .Select(b => (Guid?)b.Id)
                    .FirstOrDefaultAsync();
            }

            // A missing mapping is cached very briefly so a business created
            // moments ago is picked up quickly without hammering the DB.
            entry.AbsoluteExpirationRelativeToNow =
                businessId.HasValue ? PositiveTtl : NegativeTtl;

            return businessId;
        });
    }

    public void InvalidateOwner(Guid ownerId) =>
        _cache.Remove(KeyPrefix + ownerId);
}

