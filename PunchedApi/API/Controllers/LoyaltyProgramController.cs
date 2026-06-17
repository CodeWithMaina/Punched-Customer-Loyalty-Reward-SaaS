using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Loyalty program management — Business owners create and manage their programs.
/// Base route: /v1/programs
/// </summary>
[ApiController]
[Route("v1/programs")]
[Produces("application/json")]
[Authorize(Roles = "Business")]
public class LoyaltyProgramController : ControllerBase
{
    private readonly ILoyaltyService _loyaltyService;

    public LoyaltyProgramController(ILoyaltyService loyaltyService)
    {
        _loyaltyService = loyaltyService;
    }

    /// <summary>List all loyalty programs for the authenticated business.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<List<LoyaltyProgramResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPrograms()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.GetBusinessProgramsAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>Create a new loyalty program for the authenticated business.</summary>
    [HttpPost("me")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProgram([FromBody] CreateLoyaltyProgramRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.CreateProgramAsync(userId.Value, request);
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetMyPrograms), result);
    }

    /// <summary>Update a specific loyalty program.</summary>
    [HttpPatch("me/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProgram(Guid id, [FromBody] UpdateLoyaltyProgramRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.UpdateProgramAsync(userId.Value, id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>Delete a specific loyalty program.</summary>
    [HttpDelete("me/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteProgram(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.DeleteProgramAsync(userId.Value, id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>Legacy: Create or update the single loyalty program (kept for backward-compatibility).</summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpsertProgram([FromBody] UpsertLoyaltyProgramRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.UpsertProgramAsync(userId.Value, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
