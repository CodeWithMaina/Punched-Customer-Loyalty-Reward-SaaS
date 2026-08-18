using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Staff invitation management for a business owner.
/// Base route: /v1/businesses/me/staff/invitations
/// Restricted to Business-role users. The tenant (business) is always derived from the
/// authenticated owner's id — never from a client-supplied value — enforcing tenant isolation.
/// </summary>
[ApiController]
[Route("v1/businesses/me/staff/invitations")]
[Produces("application/json")]
[Authorize(Roles = "Business")]
public class StaffInvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;
    private readonly ILogger<StaffInvitationsController> _logger;

    public StaffInvitationsController(IInvitationService invitationService, ILogger<StaffInvitationsController> logger)
    {
        _invitationService = invitationService;
        _logger = logger;
    }

    /// <summary>
    /// Create and email a staff invitation.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<StaffInvitationResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateInvitation([FromBody] CreateStaffInvitationRequest request)
    {
        var ownerId = GetOwnerId();
        if (ownerId == null) return Unauthorized();

        var result = await _invitationService.CreateStaffInvitationAsync(ownerId.Value, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "DUPLICATE_INVITATION" => Conflict(result),
                _ => BadRequest(result)
            };
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// List all staff invitations for the caller's business.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<StaffInvitationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListInvitations()
    {
        var ownerId = GetOwnerId();
        if (ownerId == null) return Unauthorized();

        var result = await _invitationService.ListStaffInvitationsAsync(ownerId.Value);
        return Ok(result);
    }

    /// <summary>
    /// Re-send a pending invitation (rotates its token and refreshes expiry).
    /// </summary>
    [HttpPost("{invitationId:guid}/resend")]
    [ProducesResponseType(typeof(ApiResponse<StaffInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendInvitation(Guid invitationId)
    {
        var ownerId = GetOwnerId();
        if (ownerId == null) return Unauthorized();

        var result = await _invitationService.ResendStaffInvitationAsync(ownerId.Value, invitationId);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Revoke a pending invitation.
    /// </summary>
    [HttpPost("{invitationId:guid}/revoke")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RevokeInvitation(Guid invitationId)
    {
        var ownerId = GetOwnerId();
        if (ownerId == null) return Unauthorized();

        var result = await _invitationService.RevokeStaffInvitationAsync(ownerId.Value, invitationId);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    private Guid? GetOwnerId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

/// <summary>
/// Public invitation acceptance endpoints (no auth required — validation is token-based).
/// Used by the staff invitation acceptance page.
/// </summary>
[ApiController]
[Route("v1/invitations")]
[Produces("application/json")]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;

    public InvitationsController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    /// <summary>
    /// Validate an invitation token and return safe info for the accept page.
    /// </summary>
    [HttpGet("{token}")]
    [ProducesResponseType(typeof(ApiResponse<StaffInvitationValidationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate(string token)
    {
        // Always 200 with valid=false + error code for unusable invitations (avoids token-enumeration).
        var result = await _invitationService.ValidateStaffInvitationAsync(token);
        return Ok(result);
    }

    /// <summary>
    /// Accept an invitation: creates the staff account, links them to the business, and authenticates.
    /// </summary>
    [HttpPost("{token}/accept")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Accept(string token, [FromBody] AcceptStaffInvitationRequest request)
    {
        var result = await _invitationService.AcceptStaffInvitationAsync(token, request);
        if (!result.Success)
        {
            return result.Error?.Code switch
            {
                "EMAIL_MISMATCH" or "REVOKED" or "ALREADY_USED" or "EXPIRED" or "EMAIL_IN_USE" or "ALREADY_STAFF" or "INVALID_TOKEN" => BadRequest(result),
                _ => BadRequest(result)
            };
        }
        return Ok(result);
    }
}