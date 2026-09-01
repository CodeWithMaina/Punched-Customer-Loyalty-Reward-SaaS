using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging.Abstractions;
using PunchedApi.Application.Authorization;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace PunchedApi.API.Filters;

/// <summary>
/// Module entitlement gate. Runs as an authorization filter — i.e. AFTER
/// authentication ([Authorize]) and after server-side tenant resolution inside
/// IBusinessContext. Never reads businessId from route/query/body.
/// Returns 403 MODULE_DISABLED when the caller's business lacks the module.
/// Enforcement is unconditional (fail-closed) — there is no toggle.
/// Every blocked request increments the <c>module_disabled_total</c> counter
/// (tags: module, endpoint) and emits a Warning structured log so the
/// production flip dashboard can track MODULE_DISABLED traffic.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireModuleAttribute : Attribute, IAsyncAuthorizationFilter
{
    private static readonly Meter ModuleMeter = new("PunchedApi.Modules", "Module entitlement gating metrics");
    private static readonly Counter<long> ModuleDisabledCounter =
        ModuleMeter.CreateCounter<long>("module_disabled_total", description: "Requests blocked by [RequireModule] because the business lacks the module");

    private readonly string _moduleKey;

    public RequireModuleAttribute(string moduleKey)
    {
        _moduleKey = moduleKey;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext ctx)
    {
        // Skip if the endpoint was explicitly made anonymous (e.g. public
        // catalog/availability endpoints on a decorated controller).
        if (ctx.Filters.OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any())
            return;

        var businessContext = ctx.HttpContext.RequestServices
            .GetRequiredService<IBusinessContext>();

        if (!await businessContext.HasModuleAsync(_moduleKey))
        {
            var businessId = await businessContext.GetBusinessIdAsync();
            var endpoint = ctx.HttpContext.Request.Path;

            ModuleDisabledCounter.Add(1,
                new KeyValuePair<string, object?>("module", _moduleKey),
                new KeyValuePair<string, object?>("endpoint", endpoint));

            LoggerFor(ctx.HttpContext.RequestServices).LogWarning(
                "MODULE_DISABLED: business {BusinessId} blocked from {Endpoint} — module '{ModuleKey}' is not enabled.",
                businessId, endpoint, _moduleKey);

            ctx.Result = new ObjectResult(new
            {
                success = false,
                data = (object?)null,
                error = new
                {
                    code = "MODULE_DISABLED",
                    message = $"The '{_moduleKey}' module is not enabled for this business."
                }
            })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }

    private static ILogger<RequireModuleAttribute> LoggerFor(IServiceProvider services) =>
        services.GetService<ILoggerFactory>()?.CreateLogger<RequireModuleAttribute>()
        ?? NullLogger<RequireModuleAttribute>.Instance;
}