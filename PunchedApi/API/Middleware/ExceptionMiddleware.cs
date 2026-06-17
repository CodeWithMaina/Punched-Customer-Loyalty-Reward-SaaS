using System.Net;
using System.Text.Json;
using PunchedApi.Application.DTOs;

namespace PunchedApi.API.Middleware;

/// <summary>
/// Global exception handling middleware.
/// Catches unhandled exceptions and returns consistent API error responses.
/// Logs errors with structured logging for debugging.
/// </summary>
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionMiddleware(
        RequestDelegate next,
        ILogger<ExceptionMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, errorCode, message) = exception switch
        {
            ArgumentException argEx => (
                HttpStatusCode.BadRequest,
                "INVALID_REQUEST",
                argEx.Message),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "UNAUTHORIZED",
                "You are not authorized to perform this action."),

            KeyNotFoundException => (
                HttpStatusCode.NotFound,
                "NOT_FOUND",
                "The requested resource was not found."),

            InvalidOperationException opEx => (
                HttpStatusCode.Conflict,
                "CONFLICT",
                opEx.Message),

            _ => (
                HttpStatusCode.InternalServerError,
                "SERVER_ERROR",
                _env.IsDevelopment()
                    ? exception.Message
                    : "An unexpected error occurred. Please try again later.")
        };

        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse<object>.Fail(errorCode, message);

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
