using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Idempotent-request replay store for stamp awarding / enroll-and-stamp.
/// </summary>
public interface IIdempotencyService
{
    /// <summary>
    /// Looks up a completed idempotent entry.
    /// Returns the stored response JSON when the same key + body hash is replayed,
    /// or the sentinel conflict marker when the same key was used with a different body.
    /// </summary>
    Task<IdempotencyLookupResult> TryGetAsync(string key, Guid userId, string requestHash);

    /// <summary>Stores a completed response for the given key (24h expiry).</summary>
    Task StoreAsync(string key, Guid userId, string requestHash, string responseJson);
}

/// <summary>Result of an idempotency replay lookup.</summary>
public class IdempotencyLookupResult
{
    /// <summary>True when a completed entry exists (replay or conflict).</summary>
    public bool Found { get; init; }

    /// <summary>True when the same key was used with a different request body.</summary>
    public bool Conflict { get; init; }

    /// <summary>The stored response JSON (only when Found and not Conflict).</summary>
    public string? ResponseJson { get; init; }
}
