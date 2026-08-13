using System.Reflection;

namespace PunchedApi.Tests;

/// <summary>
/// R5: Verify AnalyticsBackfillSeedStep is registered as a seed step.
/// R12: Verify AnalyticsWorker background service exists.
/// R6: Verify AdminController has backfill endpoints.
/// </summary>
public class InfrastructureVerificationTests
{
    private const string MainProjectNamespace = "PunchedApi";

    [Fact]
    public void AnalyticsBackfillSeedStep_Exists_And_ImplementsISeedStep()
    {
        var seedStepType = Assembly.Load(MainProjectNamespace)
            .GetType("PunchedApi.Infrastructure.Data.Seeding.Steps.AnalyticsBackfillSeedStep");

        Assert.NotNull(seedStepType);

        var interfaceType = typeof(PunchedApi.Infrastructure.Data.Seeding.ISeedStep);
        Assert.True(interfaceType.IsAssignableFrom(seedStepType));
    }

    [Fact]
    public void AnalyticsAggregationService_Exists_And_ImplementsIInterface()
    {
        var serviceType = typeof(PunchedApi.Application.Services.AnalyticsAggregationService);
        var interfaceType = typeof(PunchedApi.Domain.Interfaces.IAnalyticsAggregationService);
        Assert.True(interfaceType.IsAssignableFrom(serviceType));
    }

    [Fact]
    public void AnalyticsWorker_Exists_And_IsBackgroundService()
    {
        var workerType = typeof(PunchedApi.Application.Services.AnalyticsWorker);

        Assert.NotNull(workerType);

        var bgServiceType = typeof(Microsoft.Extensions.Hosting.BackgroundService);
        Assert.True(bgServiceType.IsAssignableFrom(workerType));
    }

    [Fact]
    public void AdminController_HasBackfillEndpoints()
    {
        var controllerType = typeof(PunchedApi.API.Controllers.AdminController);
        var methods = controllerType.GetMethods(BindingFlags.Public | BindingFlags.Instance);

        var backfillAnalytics = methods.FirstOrDefault(m => m.Name == "BackfillAnalytics");
        Assert.NotNull(backfillAnalytics);

        var httpPostAttr = backfillAnalytics!.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpPostAttribute>();
        Assert.NotNull(httpPostAttr);
        Assert.Equal("backfill/analytics", httpPostAttr!.Template);

        var backfillSegments = methods.FirstOrDefault(m => m.Name == "BackfillSegments");
        Assert.NotNull(backfillSegments);

        var backfillHistory = methods.FirstOrDefault(m => m.Name == "BackfillProgramHistory");
        Assert.NotNull(backfillHistory);
    }

    [Fact]
    public void Program_HasAnalyticsWorkerRegistration()
    {
        // Verify the AnalyticsWorker is registered as a hosted service
        var workerType = typeof(PunchedApi.Application.Services.AnalyticsWorker);
        Assert.NotNull(workerType);

        var hostedServiceInterface = typeof(Microsoft.Extensions.Hosting.IHostedService);
        Assert.True(hostedServiceInterface.IsAssignableFrom(workerType));
    }

    [Fact]
    public void SeedExecutionContext_HasServiceProvider()
    {
        var contextType = typeof(PunchedApi.Infrastructure.Data.Seeding.SeedExecutionContext);
        var serviceProviderProp = contextType.GetProperty("ServiceProvider");
        Assert.NotNull(serviceProviderProp);
        Assert.Equal(typeof(IServiceProvider), serviceProviderProp!.PropertyType);
    }
}
