using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PunchedApi.Application.Authorization;

namespace PunchedApi.API.Filters;

/// <summary>
/// Module entitlement gate. Runs as an authorization filter — i.e. AFTER
/// authentication ([Authorize]) and after server-side tenant resolution inside
/// IBusinessContext. Never reads businessId from route/query/body.
/// Returns 403 MODULE_DISABLED when the caller's business lacks the module.
/// Enforcement is unconditional (fail-closed) — there is no toggle.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireModuleAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _moduleKey;

    public RequireModuleAttribute(string moduleKey) => _moduleKey = moduleKey;

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
}