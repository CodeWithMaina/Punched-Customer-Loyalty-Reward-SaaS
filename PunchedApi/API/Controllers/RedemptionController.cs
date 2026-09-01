using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.API.Filters;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Reward redemption controller — Customers claim rewards and view history.
/// Base route: /v1/redemptions
/// </summary>
[ApiController]
[Route("v1/redemptions")]
[Produces("application/json")]
[Authorize(Roles = "Customer,Business,Staff")]
    [RequireModule("rewards")]
[EnableRateLimiting("general")]
public class RedemptionController : ControllerBase
{
    private readonly IRedemptionService _redemptionService;

    public RedemptionController(IRedemptionService redemptionService)
    {
        _redemptionService = redemptionService;
    }

    /// <summary>
    /// Claim a reward when a loyalty card has enough stamps.
    /// Creates a Redemption record and resets the card's stamps to 0.
    /// </summary>
    [HttpPost("claim")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<RedemptionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ClaimReward([FromBody] ClaimRewardRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var idempotencyKey = Request.Headers.TryGetValue("Idempotency-Key", out var key) ? key.ToString() : null;
        var result = await _redemptionService.ClaimRewardAsync(userId.Value, request, idempotencyKey);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "NOT_FOUND" => NotFound(result),
                "INSUFFICIENT_STAMPS" => BadRequest(result),
                "IDEMPOTENCY_CONFLICT" => StatusCode(StatusCodes.Status409Conflict, result),
                _ => BadRequest(result)
            };
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Get the authenticated customer's redemption history.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<List<RedemptionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyRedemptions()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.GetMyRedemptionsAsync(userId.Value);
        return Ok(result);
    }

    /// <summary>
    /// Pending redemptions for the authenticated business/staff member (fulfilment queue).
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "Business,Staff")]
    [ProducesResponseType(typeof(ApiResponse<List<RedemptionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingRedemptions()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.GetPendingForBusinessAsync(userId.Value);
        return result.Success ? Ok(result) : NotFound(result);
    }

    /// <summary>
    /// Verify a 6-char fulfilment code and mark a pending redemption fulfilled (Business + Staff).
    /// </summary>
    [HttpPost("fulfill")]
    [Authorize(Roles = "Business,Staff")]
    [ProducesResponseType(typeof(ApiResponse<FulfillRedemptionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public async Task<IActionResult> FulfillRedemption([FromBody] FulfillRedemptionRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.FulfillRedemptionAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "FORBIDDEN" or "FORBIDDEN_SCOPE" or "NOT_LINKED" => StatusCode(StatusCodes.Status403Forbidden, result),
                "CODE_LOCKED" => StatusCode(StatusCodes.Status423Locked, result),
                "INVALID_CODE" => BadRequest(result),
                "CARD_NOT_FOUND" or "NO_PENDING_REDEMPTION" => NotFound(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    /// <summary>
    /// Cancel a pending redemption and restore the consumed stamps (Business only).
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<CancelRedemptionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CancelRedemption(Guid id, [FromBody] CancelRedemptionRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.CancelRedemptionAsync(userId.Value, id, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, result),
                "NOT_FOUND" => NotFound(result),
                "NOT_PENDING" => BadRequest(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
