using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// QR token controller — customers generate tokens for stamp scanning.
/// Base route: /v1/qr
/// </summary>
[ApiController]
[Route("v1/qr")]
[Produces("application/json")]
[Authorize(Roles = "Customer")]
public class QrController : ControllerBase
{
    private readonly IQrService _qrService;

    public QrController(IQrService qrService)
    {
        _qrService = qrService;
    }

    /// <summary>
    /// Generate a short-lived QR token for a specific business.
    /// The plain token must be encoded into a QR image on the client.
    /// Token expires after 45 seconds.
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(ApiResponse<QrTokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateToken([FromBody] GenerateQrRequest request)
    {
        var customerId = GetUserId();
        if (customerId == null) return Unauthorized();

        var result = await _qrService.GenerateTokenAsync(customerId.Value, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
