using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.API.Filters;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Stamp awarding controller — Business owners and Staff scan QR codes to award stamps.
/// Base route: /v1/stamps
/// </summary>
[ApiController]
[Route("v1/stamps")]
[Produces("application/json")]
[Authorize(Roles = "Business,Staff")]
[RequireModule("stamps")]
[EnableRateLimiting("general")]
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
    /// Accepts an optional Idempotency-Key header for safe retries.
    /// Rate-limited to 20 awards per hour per user (safe-by-construction: the
    /// 429 path never reaches the service, so no tokens or idempotency entries
    /// are consumed).
    /// </summary>
    [HttpPost("award")]
    [EnableRateLimiting("stamp-award")]
    [ProducesResponseType(typeof(ApiResponse<StampAwardedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AwardStamp([FromBody] AwardStampRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var idempotencyKey = Request.Headers.TryGetValue("Idempotency-Key", out var key) ? key.ToString() : null;
        var result = await _stampService.AwardStampAsync(userId.Value, request, idempotencyKey);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "INVALID_TOKEN" or "TOKEN_USED" or "TOKEN_EXPIRED" => BadRequest(result),
                "NOT_ENROLLED" => NotFound(result),
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

    /// <summary>
    /// Resolve a scanned QR token for preview — never consumes it and never mutates state.
    /// </summary>
    [HttpPost("resolve")]
    [ProducesResponseType(typeof(ApiResponse<ResolveQrResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResolveToken([FromBody] AwardStampRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _stampService.ResolveTokenAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "INVALID_TOKEN" or "TOKEN_USED" or "TOKEN_EXPIRED" => BadRequest(result),
                "NOT_ENROLLED" => NotFound(result),
                "FORBIDDEN_SCOPE" => StatusCode(StatusCodes.Status403Forbidden, result),
                "NOT_LINKED" => StatusCode(StatusCodes.Status403Forbidden, result),
                "UNAUTHORIZED" => Unauthorized(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    /// <summary>
    /// Business-only manual stamp adjustment.
    /// </summary>
    [HttpPost("adjust")]
    [ProducesResponseType(typeof(ApiResponse<StampAdjustmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdjustStamps([FromBody] StampAdjustmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _stampService.AdjustStampsAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "FORBIDDEN" or "FORBIDDEN_SCOPE" => StatusCode(StatusCodes.Status403Forbidden, result),
                "NOT_FOUND" or "CARD_NOT_FOUND" => NotFound(result),
                "ADJUSTMENT_BELOW_ZERO" or "INVALID_DELTA" => BadRequest(result),
                "UNAUTHORIZED" => Unauthorized(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    /// <summary>
    /// Business + Staff phone lookup issuing a one-time manual token (rate-limited to 5/hr).
    /// </summary>
    [HttpPost("lookup")]
    [EnableRateLimiting("manual-lookup")]
    [ProducesResponseType(typeof(ApiResponse<ManualLookupResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ManualLookup([FromBody] ManualLookupRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _stampService.ManualLookupAsync(userId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "FORBIDDEN_SCOPE" => StatusCode(StatusCodes.Status403Forbidden, result),
                "CUSTOMER_NOT_FOUND" => NotFound(result),
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, result),
                "NOT_LINKED" => StatusCode(StatusCodes.Status403Forbidden, result),
                "UNAUTHORIZED" => Unauthorized(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }

    /// <summary>
    /// Paged stamp activity feed scoped to the caller's business (owner or staff).
    /// Filterable by program, customer, staff member, source and time window —
    /// surfaces the Business → Program → Customer → Stamp relationship.
    /// </summary>
    [HttpGet("activity")]
    [ProducesResponseType(typeof(ApiResponse<StampActivityPage>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Activity([FromQuery] StampActivityQuery query)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _stampService.GetActivityAsync(userId.Value, query ?? new StampActivityQuery());
        return result.Success ? Ok(result) : StatusCode(StatusCodes.Status403Forbidden, result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
