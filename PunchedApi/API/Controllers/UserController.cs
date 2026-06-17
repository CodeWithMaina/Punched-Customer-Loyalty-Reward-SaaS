using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// User profile controller.
/// Base route: /v1/users
/// </summary>
[ApiController]
[Route("v1/users")]
[Produces("application/json")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;
    private readonly ILogger<UserController> _logger;

    public UserController(IAuthService authService, IUserService userService, ILogger<UserController> logger)
    {
        _authService = authService;
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// Get current authenticated user's profile.
    /// </summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile()
    {
        var userAuthId = GetUserAuthId();
        if (userAuthId == null)
            return Unauthorized(ApiResponse<UserProfileResponse>.Fail("UNAUTHORIZED", "Invalid token."));

        var result = await _authService.GetProfileAsync(userAuthId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Update current authenticated user's profile.
    /// </summary>
    [HttpPatch("profile")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userAuthId = GetUserAuthId();
        if (userAuthId == null)
            return Unauthorized(ApiResponse<UserProfileResponse>.Fail("UNAUTHORIZED", "Invalid token."));

        var result = await _userService.UpdateProfileAsync(userAuthId.Value, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    private Guid? GetUserAuthId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
