using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Reward redemption controller — Customers claim rewards and view history.
/// Base route: /v1/redemptions
/// </summary>
[ApiController]
[Route("v1/redemptions")]
[Produces("application/json")]
[Authorize(Roles = "Customer")]
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
    [ProducesResponseType(typeof(ApiResponse<RedemptionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ClaimReward([FromBody] ClaimRewardRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.ClaimRewardAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "NOT_FOUND" => NotFound(result),
                "INSUFFICIENT_STAMPS" => BadRequest(result),
                _ => BadRequest(result)
            };
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Get the authenticated customer's redemption history.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<RedemptionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyRedemptions()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _redemptionService.GetMyRedemptionsAsync(userId.Value);
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
