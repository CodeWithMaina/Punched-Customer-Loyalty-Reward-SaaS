using Microsoft.Data.Sqlite;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Tests;

/// <summary>
/// Phase 5 tests for ServiceCatalogService: owner CRUD, public active list, and owner isolation.
/// </summary>
public class ServiceCatalogServiceTests
{
    private sealed class Env
    {
        public ApplicationDbContext Context = null!;
        public ServiceCatalogService Service = null!;
        public Business Business = null!;
        public User Owner = null!;
    }

    private static async Task<Env> CreateEnvAsync(SqliteConnection connection)
    {
        var context = BookingTestBase.CreateContext(connection);
        var service = BookingTestBase.CreateCatalogService(context);
        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        await BookingTestBase.SeedAsync(context, owner, business);
        return new Env { Context = context, Service = service, Business = business, Owner = owner };
    }

    [Fact]
    public async Task CreateServiceAsync_SetsActiveAndPrice_ReturnsCreated()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var result = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Manicure",
            DurationMinutes = 45,
            Price = 800m
        });

        Assert.True(result.Success, result.Error?.Message);
        Assert.True(result.Data!.IsActive);
        Assert.Equal(800m, result.Data.Price);
        Assert.Equal(45, result.Data.DurationMinutes);
        Assert.Equal(env.Business.Id, result.Data.BusinessId);
    }

    [Fact]
    public async Task UpdateServiceAsync_AppliesProvidedFieldsOnly()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var created = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Cut",
            DurationMinutes = 60,
            Price = 500m
        });
        var id = created.Data!.Id;

        var updated = await env.Service.UpdateServiceAsync(env.Owner.Id, id, new UpdateServiceRequest { Price = 650m });

        Assert.True(updated.Success, updated.Error?.Message);
        Assert.Equal("Cut", updated.Data!.Name);
        Assert.Equal(60, updated.Data.DurationMinutes);
        Assert.Equal(650m, updated.Data.Price);
        Assert.True(updated.Data.IsActive);
    }

    [Fact]
    public async Task DeleteServiceAsync_SoftDeletes_ReturnsTrue()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var created = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Cut",
            DurationMinutes = 60,
            Price = 500m
        });
        var id = created.Data!.Id;

        var result = await env.Service.DeleteServiceAsync(env.Owner.Id, id);

        Assert.True(result.Success, result.Error?.Message);
        Assert.True(result.Data);
        var svc = await context.ServiceCatalogItems.FindAsync(id);
        Assert.False(svc!.IsActive);
    }
[Fact]
    public async Task GetServicesForBusinessAsync_ReturnsOnlyActive_GetMyReturnsAll()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var active = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Active",
            DurationMinutes = 30,
            Price = 100m
        });
        var inactive = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Inactive",
            DurationMinutes = 30,
            Price = 100m
        });
        await env.Service.UpdateServiceAsync(env.Owner.Id, inactive.Data!.Id, new UpdateServiceRequest { IsActive = false });

        var pub = await env.Service.GetServicesForBusinessAsync(env.Business.Id);
        Assert.True(pub.Success, pub.Error?.Message);
        Assert.Single(pub.Data!);
        Assert.Equal(active.Data!.Id, pub.Data[0].Id);

        var mine = await env.Service.GetMyServicesAsync(env.Owner.Id);
        Assert.True(mine.Success, mine.Error?.Message);
        Assert.Equal(2, mine.Data!.Count);
    }

    [Fact]
    public async Task OwnerIsolation_SecondOwnerForbidden_UnknownNotFound_NoBusinessNotFound()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherOwner = BookingTestBase.CreateOwner("other@test.com");
        var otherBusiness = BookingTestBase.CreateBusiness(otherOwner.Id, "Other");
        var noBizOwner = BookingTestBase.CreateOwner("nobiz@test.com");
        await BookingTestBase.SeedAsync(context, otherOwner, otherBusiness, noBizOwner);

        var created = await env.Service.CreateServiceAsync(env.Owner.Id, new CreateServiceRequest
        {
            Name = "Cut",
            DurationMinutes = 60,
            Price = 500m
        });
        var id = created.Data!.Id;

        // second owner on another business's service → FORBIDDEN
        var get = await env.Service.GetServiceAsync(otherOwner.Id, id);
        Assert.Equal("FORBIDDEN", get.Error?.Code);
        var upd = await env.Service.UpdateServiceAsync(otherOwner.Id, id, new UpdateServiceRequest { Price = 999m });
        Assert.Equal("FORBIDDEN", upd.Error?.Code);
        var del = await env.Service.DeleteServiceAsync(otherOwner.Id, id);
        Assert.Equal("FORBIDDEN", del.Error?.Code);

        // unknown service → NOT_FOUND
        var unknown = await env.Service.GetServiceAsync(env.Owner.Id, Guid.NewGuid());
        Assert.Equal("NOT_FOUND", unknown.Error?.Code);

        // owner with no business → NOT_FOUND
        var noBiz = await env.Service.GetMyServicesAsync(noBizOwner.Id);
        Assert.Equal("NOT_FOUND", noBiz.Error?.Code);
    }
}