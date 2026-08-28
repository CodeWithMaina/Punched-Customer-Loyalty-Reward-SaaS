using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.API.Filters;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business controller - Staff module endpoints (me/staff*, staff/my-business, staff/analytics, staff/activity, daily goals)
/// Split from BusinessController.cs (plugin module architecture, Phase 5).
/// Routes are identical to the pre-split controller; each action is gated on
/// its owning module via [RequireModule] (403 MODULE_DISABLED when
/// Modules:EnforcementEnabled=true and the business lacks the module).
/// </summary>
public partial class BusinessController
{
    [RequireModule("staff")]

    [HttpGet("me/staff/utilization")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffUtilizationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffUtilization([FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetStaffUtilizationAsync(userId.Value, from, to);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
    [RequireModule("staff")]

    [HttpGet("me/staff/{staffId:guid}/shifts")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffShiftResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffShifts(Guid staffId, [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetStaffShiftsAsync(userId.Value, staffId, from, to);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
    [RequireModule("staff")]

    [HttpPut("me/staff/{staffId:guid}/shifts")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpsertStaffShift(Guid staffId, [FromBody] UpsertStaffShiftRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.UpsertStaffShiftAsync(userId.Value, staffId, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Link a staff user to this business. Staff can then scan QR codes.
    /// </summary>
    [RequireModule("staff")]
    [HttpPost("me/staff/{staffUserId:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LinkStaff(Guid staffUserId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.LinkStaffToBusinessAsync(userId.Value, staffUserId);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Get a management overview of the business's staff: summary counts,
    /// performance snapshot (top performers / needs attention / recently active).
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("me/staff/overview")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<StaffOverviewResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffOverview()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetStaffOverviewAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get all staff members linked to this business — server-side search,
    /// filtering, sorting and pagination.
    /// Query: search, status(active|inactive), activity(today|week|idle),
    /// goalStatus(met|behind|none), sortBy(name|stamps|recent|goal|added),
    /// sortDirection(asc|desc), page, pageSize.
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("me/staff")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<StaffListResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyStaff(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? activity,
        [FromQuery] string? goalStatus,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDirection = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var validSorts = new[] { "name", "stamps", "recent", "goal", "added" };
        if (!validSorts.Contains(sortBy.ToLowerInvariant())) sortBy = "name";

        var result = await _businessService.GetMyStaffAsync(
            userId.Value, search, status, activity, goalStatus, sortBy, sortDirection, page, pageSize);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Set the business-level default daily stamp goal for staff members.
    /// </summary>
    [RequireModule("staff")]
    [HttpPut("me/daily-goal")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetBusinessDailyGoal([FromBody] UpdateBusinessDailyGoalRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (request.DailyGoal.HasValue && (request.DailyGoal.Value < 1 || request.DailyGoal.Value > 1000))
            return BadRequest(ApiResponse<BusinessResponse>.Fail("INVALID_GOAL", "Daily goal must be between 1 and 1000."));

        var result = await _businessService.SetBusinessDailyGoalAsync(userId.Value, request.DailyGoal);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Set (or clear, when dailyGoal is null) a staff member's personal daily stamp goal override.
    /// </summary>
    [RequireModule("staff")]
    [HttpPut("me/staff/{staffUserId:guid}/daily-goal")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<StaffMemberResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetStaffDailyGoal(Guid staffUserId, [FromBody] SetStaffDailyGoalRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (request.DailyGoal.HasValue && (request.DailyGoal.Value < 1 || request.DailyGoal.Value > 1000))
            return BadRequest(ApiResponse<StaffMemberResponse>.Fail("INVALID_GOAL", "Daily goal must be between 1 and 1000."));

        var result = await _businessService.SetStaffDailyGoalAsync(userId.Value, staffUserId, request.DailyGoal);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get real per-attribution stamp analytics for a single staff member (owner view).
    /// Supports period=today|7d|30d|all (default: all).
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("me/staff/{staffId:guid}/analytics")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<StaffMemberAnalyticsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffMemberAnalytics(Guid staffId, [FromQuery] string period = "all")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var validPeriods = new[] { "today", "7d", "30d", "all" };
        if (!validPeriods.Contains(period)) period = "all";

        var result = await _businessService.GetStaffMemberAnalyticsAsync(userId.Value, staffId, period);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Owner endpoint: get full activity timeline for a specific staff member.
    /// Filters: activityType=all|stamp|redemption, customerId, from, to, status, page, pageSize.
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("me/staff/{staffId:guid}/activity")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<StaffActivityFeedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffMemberActivity(
        Guid staffId,
        [FromQuery] string? activityType,
        [FromQuery] Guid? customerId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var request = new StaffActivityFilterRequest
        {
            ActivityType = activityType,
            CustomerId = customerId,
            From = from,
            To = to,
            Status = status,
            Page = page,
            PageSize = pageSize
        };

        var result = await _businessService.GetStaffActivityForOwnerAsync(userId.Value, staffId, request);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get the business a staff member is linked to.
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("staff/my-business")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<StaffBusinessResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffBusiness()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetStaffBusinessAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get stamp analytics for the business the staff member is linked to.
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("staff/analytics")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<StaffAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffAnalytics()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetStaffAnalyticsAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Staff endpoint: get the authenticated staff member's own activity timeline.
    /// Any staff identity is derived from the authenticated token.
    /// </summary>
    [RequireModule("staff")]
    [HttpGet("staff/activity")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<StaffActivityFeedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyStaffActivity(
        [FromQuery] string? activityType,
        [FromQuery] Guid? customerId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var request = new StaffActivityFilterRequest
        {
            ActivityType = activityType,
            CustomerId = customerId,
            From = from,
            To = to,
            Status = status,
            Page = page,
            PageSize = pageSize
        };

        var result = await _businessService.GetMyStaffActivityAsync(userId.Value, request);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
}
