using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.API.Filters;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Enroll-and-stamp endpoint (Business + Staff): enrolls a customer (if not already
/// enrolled at this business) and awards stamps in one locked transaction.
/// </summary>
[ApiController]
[Route("v1/cards")]
[Produces("application/json")]
[Authorize(Roles = "Business,Staff")]
[RequireModule("stamps")]
[EnableRateLimiting("general")]
public class EnrollAndStampController : ControllerBase
{
    private readonly IStampService _stampService;

    public EnrollAndStampController(IStampService stampService)
    {
        _stampService = stampService;
    }

    /// <summary>
    /// Enroll the customer at this business (if needed) and award stamps.
    /// Reuses the same QR-token + card row-lock semantics as /v1/stamps/award.
    /// Rate-limited to 20 per hour per user.
    /// </summary>
    [HttpPost("enroll-and-stamp")]
    [EnableRateLimiting("stamp-enroll")]
    [ProducesResponseType(typeof(ApiResponse<StampAwardedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> EnrollAndStamp([FromBody] EnrollAndStampRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var idempotencyKey = Request.Headers.TryGetValue("Idempotency-Key", out var key) ? key.ToString() : null;
        var result = await _stampService.EnrollAndStampAsync(userId.Value, request, idempotencyKey);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "INVALID_TOKEN" or "TOKEN_USED" or "TOKEN_EXPIRED" => BadRequest(result),
                "FORBIDDEN_SCOPE" => StatusCode(StatusCodes.Status403Forbidden, result),
                "NOT_LINKED" => StatusCode(StatusCodes.Status403Forbidden, result),
                "UNAUTHORIZED" => Unauthorized(result),
                "STAMP_LIMIT_EXCEEDED" => BadRequest(result),
                "IDEMPOTENCY_CONFLICT" => StatusCode(StatusCodes.Status409Conflict, result),
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