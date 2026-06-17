using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Infrastructure.Repositories;

/// <summary>
/// Unit of Work implementation coordinating multiple repository operations.
/// Ensures atomic commits across related entity changes.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private bool _disposed = false;

    // Lazy-initialized repositories
    private IRepository<UserAuth>? _userAuths;
    private IRepository<User>? _users;
    private IRepository<RefreshToken>? _refreshTokens;
    private IRepository<Business>? _businesses;
    private IRepository<LoyaltyProgram>? _loyaltyPrograms;
    private IRepository<LoyaltyCard>? _loyaltyCards;
    private IRepository<QrToken>? _qrTokens;
    private IRepository<Stamp>? _stamps;
    private IRepository<Redemption>? _redemptions;
    private IRepository<ReferralProgram>? _referralPrograms;
    private IRepository<ReferralLink>? _referralLinks;
    private IRepository<Referral>? _referrals;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public IRepository<UserAuth> UserAuths =>
        _userAuths ??= new Repository<UserAuth>(_context);

    /// <inheritdoc />
    public IRepository<User> Users =>
        _users ??= new Repository<User>(_context);

    /// <inheritdoc />
    public IRepository<RefreshToken> RefreshTokens =>
        _refreshTokens ??= new Repository<RefreshToken>(_context);

    /// <inheritdoc />
    public IRepository<Business> Businesses =>
        _businesses ??= new Repository<Business>(_context);

    /// <inheritdoc />
    public IRepository<LoyaltyProgram> LoyaltyPrograms =>
        _loyaltyPrograms ??= new Repository<LoyaltyProgram>(_context);

    /// <inheritdoc />
    public IRepository<LoyaltyCard> LoyaltyCards =>
        _loyaltyCards ??= new Repository<LoyaltyCard>(_context);

    /// <inheritdoc />
    public IRepository<QrToken> QrTokens =>
        _qrTokens ??= new Repository<QrToken>(_context);

    /// <inheritdoc />
    public IRepository<Stamp> Stamps =>
        _stamps ??= new Repository<Stamp>(_context);

    /// <inheritdoc />
    public IRepository<Redemption> Redemptions =>
        _redemptions ??= new Repository<Redemption>(_context);

    /// <inheritdoc />
    public IRepository<ReferralProgram> ReferralPrograms =>
        _referralPrograms ??= new Repository<ReferralProgram>(_context);

    /// <inheritdoc />
    public IRepository<ReferralLink> ReferralLinks =>
        _referralLinks ??= new Repository<ReferralLink>(_context);

    /// <inheritdoc />
    public IRepository<Referral> Referrals =>
        _referrals ??= new Repository<Referral>(_context);

    /// <inheritdoc />
    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Disposes the DbContext and releases resources.
    /// </summary>
    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _context.Dispose();
        }
        _disposed = true;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
