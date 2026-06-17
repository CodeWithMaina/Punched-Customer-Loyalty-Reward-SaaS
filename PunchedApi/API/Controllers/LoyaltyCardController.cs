using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Loyalty card controller — customer enrollment and card management.
/// Base route: /v1/cards
/// </summary>
[ApiController]
[Route("v1/cards")]
[Produces("application/json")]
[Authorize]
public class LoyaltyCardController : ControllerBase
{
    private readonly ILoyaltyService _loyaltyService;

    public LoyaltyCardController(ILoyaltyService loyaltyService)
    {
        _loyaltyService = loyaltyService;
    }

    /// <summary>
    /// Enroll the authenticated customer in a business's loyalty program.
    /// </summary>
    [HttpPost("enroll")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyCardResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Enroll([FromBody] EnrollCardRequest request)
    {
        var customerId = GetUserId();
        if (customerId == null) return Unauthorized();

        var result = await _loyaltyService.EnrollAsync(customerId.Value, request);
        if (!result.Success)
            return result.Error?.Code == "ALREADY_ENROLLED" ? Conflict(result) : BadRequest(result);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Get all loyalty cards for the authenticated customer.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<List<LoyaltyCardResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyCards()
    {
        var customerId = GetUserId();
        if (customerId == null) return Unauthorized();

        var result = await _loyaltyService.GetMyCardsAsync(customerId.Value);
        return Ok(result);
    }

    /// <summary>
    /// Get a specific loyalty card for the authenticated customer.
    /// </summary>
    [HttpGet("{cardId:guid}")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyCardResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCard(Guid cardId)
    {
        var customerId = GetUserId();
        if (customerId == null) return Unauthorized();

        var result = await _loyaltyService.GetCardByIdAsync(customerId.Value, cardId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get the loyalty program for a business (public).
    /// </summary>
    [HttpGet("program/{businessId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProgram(Guid businessId)
    {
        var result = await _loyaltyService.GetProgramAsync(businessId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
