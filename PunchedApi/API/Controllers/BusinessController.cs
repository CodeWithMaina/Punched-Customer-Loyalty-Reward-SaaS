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
    private readonly ILogger<BusinessController> _logger;

    public BusinessController(IBusinessService businessService, ILogger<BusinessController> logger)
    {
        _businessService = businessService;
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
    [ProducesResponseType(typeof(ApiResponse<List<BusinessCustomerResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyCustomers([FromQuery] string? search)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessCustomersAsync(userId.Value, search);
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

        var result = await _businessService.GetBusinessCustomersAsync(userId.Value, search);
        if (!result.Success) return BadRequest(result);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Name,Email,Phone,DateOfBirth,Gender,TotalStamps,LifetimeStamps,TotalRedemptions,EnrolledAt,LastStampAt");

        foreach (var c in result.Data!)
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
