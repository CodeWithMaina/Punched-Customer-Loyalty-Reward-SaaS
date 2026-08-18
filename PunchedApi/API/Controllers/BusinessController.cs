using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business management controller.
/// Base route: /v1/businesses
/// </summary>
[ApiController]
[Route("v1/businesses")]
[Produces("application/json")]
public class BusinessController : ControllerBase
{
    private readonly IBusinessService _businessService;
    private readonly IStampService _stampService;
    private readonly INotificationsService _notificationsService;
    private readonly ILogger<BusinessController> _logger;

    public BusinessController(
        IBusinessService businessService,
        IStampService stampService,
        INotificationsService notificationsService,
        ILogger<BusinessController> logger)
    {
        _businessService = businessService;
        _stampService = stampService;
        _notificationsService = notificationsService;
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
    /// Get all customers enrolled in the authenticated business's loyalty program.
    /// Results are scoped strictly to the business — no cross-tenant access.
    /// </summary>
    [HttpGet("me/customers")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<BusinessCustomerResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyCustomers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? enrolledFrom,
        [FromQuery] DateOnly? enrolledTo,
        [FromQuery] string sortBy = "recent",
        [FromQuery] string sortDirection = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (enrolledFrom.HasValue && enrolledTo.HasValue && enrolledTo < enrolledFrom)
            return BadRequest(ApiResponse<PaginatedResponse<BusinessCustomerResponse>>.Fail("INVALID_DATE_RANGE", "End date cannot precede start date."));

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await _businessService.GetBusinessCustomersAsync(
            userId.Value, search, status, enrolledFrom, enrolledTo, sortBy, sortDirection, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Get detailed profile of a single customer enrolled in this business.
    /// </summary>
    [HttpGet("me/customers/{customerId:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessCustomerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSingleCustomer(Guid customerId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetSingleCustomerAsync(userId.Value, customerId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get business dashboard stats (active cards, stamps, redemptions).
    /// </summary>
    [HttpGet("me/dashboard")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "dashboard")]
    [ProducesResponseType(typeof(ApiResponse<BusinessDashboardResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetDashboardAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get comprehensive business analytics (charts data).
    /// </summary>
    [HttpGet("me/analytics")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "analytics")]
    [ProducesResponseType(typeof(ApiResponse<BusinessAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAnalytics([FromQuery] string period = "30d")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessAnalyticsAsync(userId.Value, period);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Period-over-period comparison. The business is always derived from the authenticated
    /// user's claims — no client-supplied BusinessId is accepted.
    /// Supports 1d/7d/30d/90d/365d and custom(?start=&amp;end=).
    /// </summary>
    [HttpGet("me/analytics/compare")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "analytics")]
    [ProducesResponseType(typeof(ApiResponse<BusinessAnalyticsComparisonResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAnalyticsComparison(
        [FromQuery] string period = "30d",
        [FromQuery] string? prev = null,
        [FromQuery] DateOnly? start = null,
        [FromQuery] DateOnly? end = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessAnalyticsComparisonAsync(userId.Value, period, prev, start, end);
        if (!result.Success && result.Error?.Code is "NOT_FOUND") return NotFound(result);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("me/insights")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<InsightResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinessInsights([FromQuery] bool includeDismissed = false)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessInsightsAsync(userId.Value, includeDismissed);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost("me/insights/{insightId:guid}/dismiss")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DismissBusinessInsight(Guid insightId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.DismissBusinessInsightAsync(userId.Value, userId.Value, insightId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpGet("me/segments")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<CustomerSegmentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerSegments([FromQuery] string? segment = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessCustomerSegmentsAsync(userId.Value, segment);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpGet("me/notifications/analytics")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<NotificationAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotificationAnalytics([FromQuery] int days = 30)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetNotificationAnalyticsAsync(userId.Value, days);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

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
    /// Get all staff members linked to this business.
    /// Supports ?search=name/email and ?sort=alpha|stamps|recent.
    /// </summary>
    [HttpGet("me/staff")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffMemberResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyStaff(
        [FromQuery] string? search,
        [FromQuery] string sort = "alpha")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var validSorts = new[] { "alpha", "stamps", "recent" };
        if (!validSorts.Contains(sort)) sort = "alpha";

        var result = await _businessService.GetMyStaffAsync(userId.Value, search, sort);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Set the business-level default daily stamp goal for staff members.
    /// </summary>
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
    /// Get period-filtered stamp stats for a single customer (owner view).
    /// Supports period=today|7d|30d|all (default: 7d).
    /// </summary>
    [HttpGet("me/customers/{customerId:guid}/stats")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<CustomerPeriodStatsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerPeriodStats(Guid customerId, [FromQuery] string period = "7d")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var validPeriods = new[] { "today", "7d", "30d", "all" };
        if (!validPeriods.Contains(period)) period = "7d";

        var result = await _businessService.GetCustomerPeriodStatsAsync(userId.Value, customerId, period);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get the business a staff member is linked to.
    /// </summary>
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

    /// <summary>
    /// Business activity feed: recent stamps (newest-first), optionally filtered to a staff member.
    /// Business-scoped — caller must be the owner or a linked staff member.
    /// </summary>
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

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// Export all customers enrolled in this business as a CSV file.
    /// Includes name, email, phone, date of birth, gender, stamps, and enrollment date.
    /// </summary>
    [HttpGet("me/customers/export")]
    [Authorize(Roles = "Business")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ExportCustomersCsv([FromQuery] string? search)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessCustomersAsync(
            userId.Value, search, null, null, null, "recent", "desc", 1, 100);
        if (!result.Success) return BadRequest(result);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Name,Email,Phone,DateOfBirth,Gender,TotalStamps,LifetimeStamps,TotalRedemptions,EnrolledAt,LastStampAt");

        foreach (var c in result.Data!.Items)
        {
            static string Esc(string? v) =>
                string.IsNullOrEmpty(v) ? "" : v.Contains(',') || v.Contains('"') ? $"\"{v.Replace("\"", "\"\"")}\"" : v;

            sb.AppendLine(string.Join(",",
                Esc(c.FullName),
                Esc(c.Email),
                Esc(c.PhoneNumber),
                c.DateOfBirth?.ToString("yyyy-MM-dd") ?? "",
                Esc(c.Gender),
                c.TotalStamps,
                c.LifetimeStamps,
                c.TotalRedemptions,
                c.EnrolledAt.ToString("yyyy-MM-dd"),
                c.LastStampAt?.ToString("yyyy-MM-dd") ?? ""
            ));
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"customers_{DateTime.UtcNow:yyyyMMdd}.csv";
        return File(bytes, "text/csv", fileName);
    }
}
