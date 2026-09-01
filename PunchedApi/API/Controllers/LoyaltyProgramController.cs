using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.API.Filters;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Loyalty program management — Business owners create and manage their programs.
/// Base route: /v1/programs
/// </summary>
[ApiController]
[Route("v1/programs")]
[Produces("application/json")]
[Authorize(Roles = "Business")]
    [RequireModule("loyalty")]
[EnableRateLimiting("general")]
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

    /// <summary>Get one loyalty program owned by the authenticated business.</summary>
    [HttpGet("me/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProgram(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.GetBusinessProgramAsync(userId.Value, id);
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

    /// <summary>Activate a program — resumes accepting enrollments and stamps.</summary>
    [HttpPost("me/{id:guid}/activate")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActivateProgram(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.ActivateProgramAsync(userId.Value, id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Pause a program — retains progress but stops new stamps/enrollments.</summary>
    [HttpPost("me/{id:guid}/pause")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PauseProgram(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.PauseProgramAsync(userId.Value, id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Archive a program — terminal state, hidden from customer surfaces.</summary>
    [HttpPost("me/{id:guid}/archive")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ArchiveProgram(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.ArchiveProgramAsync(userId.Value, id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Duplicate a program as a new draft (for seasonal/variant programs).</summary>
    [HttpPost("me/{id:guid}/duplicate")]
    [ProducesResponseType(typeof(ApiResponse<LoyaltyProgramResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> DuplicateProgram(Guid id, [FromBody] DuplicateProgramRequest? request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.DuplicateProgramAsync(userId.Value, id, request?.NewName);
        return result.Success ? CreatedAtAction(nameof(GetProgram), new { id = result.Data?.Id }, result) : BadRequest(result);
    }

    /// <summary>Program overview + live performance metrics.</summary>
    [HttpGet("me/{id:guid}/details")]
    [ProducesResponseType(typeof(ApiResponse<ProgramDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProgramDetails(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var result = await _loyaltyService.GetProgramDetailAsync(userId.Value, id);
        return result.Success ? Ok(result) : NotFound(result);
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
