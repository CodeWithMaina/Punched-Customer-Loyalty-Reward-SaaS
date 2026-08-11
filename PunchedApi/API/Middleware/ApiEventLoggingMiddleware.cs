using System.Diagnostics;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.API.Middleware;

public class ApiEventLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public ApiEventLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db, ILogger<ApiEventLoggingMiddleware> logger)
    {
        var sw = Stopwatch.StartNew();
        string? errorCode = null;
        Exception? caughtException = null;

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            errorCode = "UNHANDLED_EXCEPTION";
            caughtException = ex;
        }

        sw.Stop();

        // Skip chatty endpoints and static resources.
        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("/v1/sse", StringComparison.OrdinalIgnoreCase))
        {
            Guid? userId = null;
            var userClaim = context.User.FindFirst("userId")?.Value;
            if (Guid.TryParse(userClaim, out var parsedUserId))
                userId = parsedUserId;

            Guid? tenantId = null;
            if (userId.HasValue)
            {
                var business = await db.Businesses
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.OwnerId == userId.Value);

                if (business != null)
                {
                    tenantId = business.Id;
                }
                else
                {
                    var staff = await db.Users
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(u => u.Id == userId.Value);
                    tenantId = staff?.StaffBusinessId;
                }
            }

            var log = new ApiEventLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                Endpoint = path,
                Method = context.Request.Method,
                StatusCode = context.Response.StatusCode,
                DurationMs = (int)sw.ElapsedMilliseconds,
                ErrorCode = errorCode,
                CreatedAt = DateTime.UtcNow
            };

            db.ApiEventLogs.Add(log);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to persist API event log for {Method} {Path}", context.Request.Method, path);
            }
        }

        if (caughtException != null)
            throw caughtException;
    }
}
