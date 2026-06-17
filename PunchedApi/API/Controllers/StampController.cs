using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Stamp awarding controller — Business owners and Staff scan QR codes to award stamps.
/// Base route: /v1/stamps
/// </summary>
[ApiController]
[Route("v1/stamps")]
[Produces("application/json")]
[Authorize(Roles = "Business,Staff")]
public class StampController : ControllerBase
{
    private readonly IStampService _stampService;

    public StampController(IStampService stampService)
    {
        _stampService = stampService;
    }

    /// <summary>
    /// Award a stamp by validating a scanned QR token.
    /// The token is cryptographically verified and single-use.
    /// Triggers an SSE event to the customer's live connection.
    /// </summary>
    [HttpPost("award")]
    [ProducesResponseType(typeof(ApiResponse<StampAwardedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AwardStamp([FromBody] AwardStampRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _stampService.AwardStampAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "INVALID_TOKEN" or "TOKEN_USED" or "TOKEN_EXPIRED" => BadRequest(result),
                "NOT_ENROLLED" => NotFound(result),
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
