using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.API.Filters;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Appointment controller — customer self-service booking.
/// Base route: /v1/appointments
/// Mirrors LoyaltyCardController: [Authorize] at controller level, action-level
/// [Authorize(Roles = "Customer")], and a private GetUserId() reading the "userId" claim.
/// </summary>
[ApiController]
[Route("v1/appointments")]
[Produces("application/json")]
[Authorize]
[RequireModule("appointments")]
public class AppointmentController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    /// <summary>
    /// List the authenticated customer's own appointments.
    /// upcoming/status/from/to are bound for forward compatibility but the current
    /// service signature returns the full customer list.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<List<AppointmentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyAppointments(
        [FromQuery] bool? upcoming,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetCustomerAppointmentsAsync(userId.Value);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Get a single appointment owned by the authenticated customer.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointment(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.GetAppointmentAsync(userId.Value, "Customer", id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Customer self-service booking. customerId is always forced to the caller server-side.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CreateAppointmentAsync(userId.Value, "Customer", request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Reschedule an appointment owned by the authenticated customer.
    /// </summary>
    [HttpPost("{id:guid}/reschedule")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reschedule(Guid id, [FromBody] RescheduleAppointmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.RescheduleAsync(userId.Value, "Customer", id, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Cancel an appointment owned by the authenticated customer.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelAppointmentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _appointmentService.CancelAsync(userId.Value, "Customer", id, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Maps an ApiResponse failure to the HTTP status dictated by backend.md §9.
    /// Success always returns 200 (Ok) via the callers.
    /// </summary>
    private IActionResult MapFailure<T>(ApiResponse<T> result)
        => result.Error?.Code switch
        {
            "NOT_FOUND" or "SERVICE_NOT_FOUND" or "STAFF_NOT_FOUND" or "CUSTOMER_NOT_FOUND" => NotFound(result),
            "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, result),
            "OVERBOOKING" or "SLOT_UNAVAILABLE" or "INVALID_STATUS_TRANSITION" => Conflict(result),
            _ => BadRequest(result)   // STAFF_NOT_AVAILABLE, VALIDATION_ERROR, BUSINESS_NOT_FOUND, fallback
        };

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
