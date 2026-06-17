using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Unit of Work interface coordinating repository operations and database transactions.
/// Ensures all changes within a business operation are committed atomically.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    /// <summary>Repository for UserAuth entities.</summary>
    IRepository<UserAuth> UserAuths { get; }

    /// <summary>Repository for User entities.</summary>
    IRepository<User> Users { get; }

    /// <summary>Repository for RefreshToken entities.</summary>
    IRepository<RefreshToken> RefreshTokens { get; }

    /// <summary>Repository for Business entities.</summary>
    IRepository<Business> Businesses { get; }

    /// <summary>Repository for LoyaltyProgram entities.</summary>
    IRepository<LoyaltyProgram> LoyaltyPrograms { get; }

    /// <summary>Repository for LoyaltyCard entities.</summary>
    IRepository<LoyaltyCard> LoyaltyCards { get; }

    /// <summary>Repository for QrToken entities.</summary>
    IRepository<QrToken> QrTokens { get; }

    /// <summary>Repository for Stamp entities.</summary>
    IRepository<Stamp> Stamps { get; }

    /// <summary>Repository for Redemption entities.</summary>
    IRepository<Redemption> Redemptions { get; }

    /// <summary>Repository for ReferralProgram entities.</summary>
    IRepository<ReferralProgram> ReferralPrograms { get; }

    /// <summary>Repository for ReferralLink entities.</summary>
    IRepository<ReferralLink> ReferralLinks { get; }

    /// <summary>Repository for Referral entities.</summary>
    IRepository<Referral> Referrals { get; }

    /// <summary>
    /// Commits all pending changes to the database.
    /// </summary>
    /// <returns>Number of state entries written to the database.</returns>
    Task<int> SaveChangesAsync();
}
