using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// In-process SSE channel broker.
/// Allows stamp services to push events to connected customer clients.
/// </summary>
public interface ISseService
{
    /// <summary>Subscribe to stamp events for a loyalty card. Returns an async stream.</summary>
    IAsyncEnumerable<SseStampEvent> SubscribeAsync(Guid cardId, CancellationToken ct);

    /// <summary>Push a stamp event to all subscribers of a card.</summary>
    void Publish(Guid cardId, SseStampEvent stampEvent);
}
