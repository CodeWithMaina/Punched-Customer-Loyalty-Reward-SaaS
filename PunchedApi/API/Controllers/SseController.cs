using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Server-Sent Events controller — pushes real-time stamp notifications to customers.
/// Base route: /v1/sse
/// </summary>
[ApiController]
[Route("v1/sse")]
[Authorize(Roles = "Customer")]
public class SseController : ControllerBase
{
    private readonly ISseService _sseService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SseController> _logger;

    public SseController(ISseService sseService, ApplicationDbContext context, ILogger<SseController> logger)
    {
        _sseService = sseService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Open a persistent SSE stream for real-time stamp events on a loyalty card.
    /// Only the owning customer may subscribe to a card's event stream.
    /// Sends heartbeat comments every 15 seconds to keep the connection alive.
    /// </summary>
    [HttpGet("cards/{cardId:guid}")]
    public async Task Subscribe(Guid cardId, CancellationToken ct)
    {
        var customerId = GetUserId();
        if (customerId == null)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        // Multi-tenant guard: verify the card belongs to this customer
        var cardExists = await _context.LoyaltyCards
            .AnyAsync(c => c.Id == cardId && c.CustomerId == customerId.Value, ct);

        if (!cardExists)
        {
            Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("X-Accel-Buffering", "no");

        _logger.LogInformation("SSE: customer {CustomerId} subscribed to card {CardId}", customerId, cardId);

        using var heartbeatTimer = new PeriodicTimer(TimeSpan.FromSeconds(15));

        // Fire-and-forget heartbeat loop
        var heartbeatTask = Task.Run(async () =>
        {
            try
            {
                while (await heartbeatTimer.WaitForNextTickAsync(ct))
                {
                    await Response.WriteAsync(": heartbeat\n\n", ct);
                    await Response.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException) { }
        }, ct);

        try
        {
            await foreach (var evt in _sseService.SubscribeAsync(cardId, ct))
            {
                var json = JsonSerializer.Serialize(evt);
                await Response.WriteAsync($"event: stamp_awarded\ndata: {json}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("SSE: customer {CustomerId} disconnected from card {CardId}", customerId, cardId);
        }
        finally
        {
            await heartbeatTask;
        }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
