using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.API.Filters;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business controller - Appointments module endpoints (me/appointments*, staff/appointments*, availability)
/// Split from BusinessController.cs (plugin module architecture, Phase 5).
/// Routes are identical to the pre-split controller; each action is gated on
/// its owning module via [RequireModule] (403 MODULE_DISABLED when
/// 403 MODULE_DISABLED (fail-closed: the business lacks the module).
/// </summary>
public partial class BusinessController
{
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  BOOKING — OWNER APPOINTMENT ROUTES
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /// <summary>
    /// Owner: list this business's appointments with filters + paging.
    /// </summary>
    [RequireModule("appointments")]
    [HttpGet("me/appointments")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<AppointmentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinessAppointments(
        [FromQuery] Guid? staffId,
        [FromQuery] Guid? customerId,
        [FromQuery] Guid? serviceId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetBusinessAppointmentsAsync(
            userId.Value, status, from, to, staffId, customerId, serviceId, page, pageSize);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: get a single appointment in this business.</summary>
    [RequireModule("appointments")]
    [HttpGet("me/appointments/{id:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBusinessAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetAppointmentAsync(userId.Value, "Business", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: book an appointment on behalf of a customer.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateBusinessAppointment([FromBody] CreateAppointmentOnBehalfRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CreateAppointmentOnBehalfAsync(userId.Value, "Business", request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: reschedule an appointment in this business.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments/{id:guid}/reschedule")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RescheduleBusinessAppointment(Guid id, [FromBody] RescheduleAppointmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.RescheduleAsync(userId.Value, "Business", id, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: cancel an appointment in this business.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments/{id:guid}/cancel")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CancelBusinessAppointment(Guid id, [FromBody] CancelAppointmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CancelAsync(userId.Value, "Business", id, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: confirm a booked appointment.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments/{id:guid}/confirm")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ConfirmBusinessAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.ConfirmAsync(userId.Value, "Business", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: complete a confirmed appointment.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments/{id:guid}/complete")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CompleteBusinessAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CompleteAsync(userId.Value, "Business", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: mark a confirmed appointment as a no-show.</summary>
    [RequireModule("appointments")]
    [HttpPost("me/appointments/{id:guid}/no-show")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> MarkBusinessNoShow(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.MarkNoShowAsync(userId.Value, "Business", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }


    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  BOOKING — STAFF APPOINTMENT ROUTES
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /// <summary>Staff: list the authenticated staff member's own appointments.</summary>
    [RequireModule("appointments")]
    [HttpGet("staff/appointments")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<List<AppointmentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffAppointments(
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetStaffAppointmentsAsync(userId.Value, status, from, to);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Staff: get a single appointment assigned to the authenticated staff member.</summary>
    [RequireModule("appointments")]
    [HttpGet("staff/appointments/{id:guid}")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetAppointmentAsync(userId.Value, "Staff", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Staff: confirm a booked appointment assigned to this staff member.</summary>
    [RequireModule("appointments")]
    [HttpPost("staff/appointments/{id:guid}/confirm")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ConfirmStaffAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.ConfirmAsync(userId.Value, "Staff", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Staff: complete a confirmed appointment assigned to this staff member.</summary>
    [RequireModule("appointments")]
    [HttpPost("staff/appointments/{id:guid}/complete")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CompleteStaffAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CompleteAsync(userId.Value, "Staff", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Staff: mark a confirmed appointment assigned to this staff member as a no-show.</summary>
    [RequireModule("appointments")]
    [HttpPost("staff/appointments/{id:guid}/no-show")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> MarkStaffNoShow(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.MarkNoShowAsync(userId.Value, "Staff", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  BOOKING — PUBLIC AVAILABILITY
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /// <summary>Public: compute bookable slots for a business across a date range.</summary>
    [RequireModule("appointments")]
    [HttpGet("{businessId:guid}/availability")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<AvailabilitySlotResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailability(
        Guid businessId,
        [FromQuery] Guid[] serviceIds,
        [FromQuery] Guid? staffId,
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate)
    {
        var request = new AvailabilityQueryRequest
        {
            BusinessId = businessId,
            ServiceIds = serviceIds,
            StaffUserId = staffId,
            StartDate = startDate,
            EndDate = endDate
        };

        var result = await _appointmentService.GetAvailableSlotsAsync(Guid.Empty, "Anonymous", businessId, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }
}
