using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.API.Filters;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business management controller.
/// Base route: /v1/businesses
/// </summary>
[ApiController]
[Route("v1/businesses")]
[Produces("application/json")]
public partial class BusinessController : ControllerBase
{
    private readonly IBusinessService _businessService;
    private readonly IStampService _stampService;
    private readonly INotificationsService _notificationsService;
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<BusinessController> _logger;

    public BusinessController(
        IBusinessService businessService,
        IStampService stampService,
        INotificationsService notificationsService,
        IAppointmentService appointmentService,
        ILogger<BusinessController> logger)
    {
        _businessService = businessService;
        _stampService = stampService;
        _notificationsService = notificationsService;
        _appointmentService = appointmentService;
        _logger = logger;
    }

    /// <summary>
    /// List all businesses (public, paginated, optional category + search filter).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<BusinessResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListBusinesses(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(page, 1);
        var result = await _businessService.ListBusinessesAsync(category, search, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Get a business by ID (public).
    /// </summary>
    [HttpGet("{businessId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBusiness(Guid businessId)
    {
        var result = await _businessService.GetBusinessByIdAsync(businessId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Create a new business for the authenticated Business-role user.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateBusiness([FromBody] CreateBusinessRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.CreateBusinessAsync(userId.Value, request);
        if (!result.Success)
            return result.Error?.Code == "BUSINESS_EXISTS" ? Conflict(result) : BadRequest(result);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Get the authenticated business owner's own business.
    /// </summary>
    [HttpGet("me")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyBusiness()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetMyBusinessAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Update the authenticated business owner's business details.
    /// </summary>
    [HttpPatch("me")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMyBusiness([FromBody] UpdateBusinessRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.UpdateMyBusinessAsync(userId.Value, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }





    /// <summary>
    /// Business activity feed: recent stamps (newest-first), optionally filtered to a staff member.
    /// Business-scoped — caller must be the owner or a linked staff member.
    /// </summary>
    [RequireModule("stamps")]
    [HttpGet("{businessId:guid}/activity/recent")]
    [Authorize(Roles = "Business,Staff")]
    [ProducesResponseType(typeof(ApiResponse<List<StampDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetRecentActivity(
        Guid businessId,
        [FromQuery] Guid? staffUserId,
        [FromQuery] int limit = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (!await _businessService.CanAccessBusinessAsync(userId.Value, businessId))
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<List<StampDto>>.Fail("FORBIDDEN", "You are not authorized to view this business's activity."));

        limit = Math.Clamp(limit, 1, 50);
        var result = await _stampService.GetRecentStampsAsync(businessId, staffUserId, limit);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Get the authenticated staff member's in-app notifications.
    /// </summary>
    [RequireModule("notifications")]
    [HttpGet("me/notifications")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<List<NotificationDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyNotifications([FromQuery] bool unreadOnly = false)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var notifications = await _notificationsService.GetAsync(userId.Value, unreadOnly, 50);
        return Ok(ApiResponse<List<NotificationDto>>.Ok(notifications));
    }

    /// <summary>
    /// Mark the authenticated staff member's notification(s) as read.
    /// Optionally pass a notificationId; omit to mark all as read.
    /// </summary>
    [RequireModule("notifications")]
    [HttpPost("me/notifications/read")]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkNotificationsRead([FromBody] MarkNotificationReadRequest? request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _notificationsService.MarkReadAsync(userId.Value, request?.NotificationId);
        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Notifications marked as read." }));
    }


    /// <summary>
    /// Maps an ApiResponse failure to the HTTP status dictated by backend.md §9.
    /// Success always returns 200 (Ok) via the callers.
    /// </summary>
    private IActionResult MapFailure<T>(ApiResponse<T> result)
        => result.Error?.Code switch
        {
            "NOT_FOUND" or "SERVICE_NOT_FOUND" or "STAFF_NOT_FOUND" or "CUSTOMER_NOT_FOUND" => NotFound(result),
            "FORBIDDEN" or "MODULE_DISABLED" => StatusCode(StatusCodes.Status403Forbidden, result),
            "OVERBOOKING" or "SLOT_UNAVAILABLE" or "INVALID_STATUS_TRANSITION" => Conflict(result),
            _ => BadRequest(result)   // STAFF_NOT_AVAILABLE, VALIDATION_ERROR, BUSINESS_NOT_FOUND, fallback
        };


    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}