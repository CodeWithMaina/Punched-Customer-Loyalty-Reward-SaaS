using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Infrastructure.Services;

/// <summary>
/// In-process SSE channel broker using System.Threading.Channels.
/// Each loyalty card gets a broadcast channel; subscribers get their own reader.
/// Thread-safe and allocation-efficient for concurrent scans.
/// </summary>
public class SseService : ISseService
{
    // Maps cardId → list of writers for subscribers on that card
    private readonly ConcurrentDictionary<Guid, List<ChannelWriter<SseStampEvent>>> _channels = new();
    private readonly object _lock = new();

    public async IAsyncEnumerable<SseStampEvent> SubscribeAsync(
        Guid cardId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var channel = Channel.CreateUnbounded<SseStampEvent>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

        // Register this subscriber's writer
        lock (_lock)
        {
            _channels.AddOrUpdate(
                cardId,
                _ => [channel.Writer],
                (_, list) => { list.Add(channel.Writer); return list; });
        }

        try
        {
            await foreach (var evt in channel.Reader.ReadAllAsync(ct))
            {
                yield return evt;
            }
        }
        finally
        {
            // Clean up subscriber
            lock (_lock)
            {
                if (_channels.TryGetValue(cardId, out var list))
                {
                    list.Remove(channel.Writer);
                    if (list.Count == 0)
                        _channels.TryRemove(cardId, out _);
                }
            }
            channel.Writer.TryComplete();
        }
    }

    public void Publish(Guid cardId, SseStampEvent stampEvent)
    {
        if (!_channels.TryGetValue(cardId, out var writers)) return;

        List<ChannelWriter<SseStampEvent>> snapshot;
        lock (_lock)
        {
            snapshot = [.. writers];
        }

        foreach (var writer in snapshot)
        {
            writer.TryWrite(stampEvent);
        }
    }
}
