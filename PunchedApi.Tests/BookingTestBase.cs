using AutoMapper;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Mappings;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;

namespace PunchedApi.Tests;

/// <summary>
/// Shared helpers for the Phase 5 booking tests. Uses SQLite in-memory (which supports
/// BeginTransactionAsync that EF Core InMemory does not). The SqliteConnection is opened
/// before the context is created and kept open for the lifetime of the test so the schema
/// persists across EF calls.
/// </summary>
internal static class BookingTestBase
{
    /// <summary>Creates and opens a long-lived SQLite in-memory connection.</summary>
    public static SqliteConnection CreateConnection()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        return connection;
    }

    /// <summary>Creates an ApplicationDbContext over the given open in-memory connection.</summary>
    public static ApplicationDbContext CreateContext(SqliteConnection connection)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    public static IMapper CreateMapper()
        => new MapperConfiguration(cfg => cfg.AddProfile<AppointmentMappingProfile>()).CreateMapper();

    public static AppointmentService CreateAppointmentService(ApplicationDbContext context)
        => new(
            new UnitOfWork(context),
            context,
            new AppointmentAvailabilityService(context, TestHelpers.CreateLogger<AppointmentAvailabilityService>()),
            CreateMapper(),
            new PunchedApi.Application.Authorization.PermissionService(),
            TestHelpers.CreateLogger<AppointmentService>());

    public static AppointmentAvailabilityService CreateAvailabilityService(ApplicationDbContext context)
        => new(context, TestHelpers.CreateLogger<AppointmentAvailabilityService>());

    public static ServiceCatalogService CreateCatalogService(ApplicationDbContext context)
        => new(new UnitOfWork(context), TestHelpers.CreateLogger<ServiceCatalogService>());

    /// <summary>Adds and saves the given entities in one commit.</summary>
    public static async Task SeedAsync(ApplicationDbContext context, params object[] entities)
    {
        foreach (var entity in entities)
            await context.AddAsync(entity);
        await context.SaveChangesAsync();
    }

    // ── Entity builders ──────────────────────────────────────────

    /// <summary>Builds a matching UserAuth (required by the 1:1 users.email → user_auths.email FK).</summary>
    private static UserAuth CreateAuth(string email) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = "abc123def456",
        IsVerified = true,
        CreatedAt = DateTime.UtcNow
    };

    public static User CreateCustomer(string email = "customer@test.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        FullName = "Test Customer",
        Role = UserRole.Customer,
        CreatedAt = DateTime.UtcNow,
        Auth = CreateAuth(email)
    };

    public static User CreateOwner(string email = "owner@test.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        FullName = "Test Owner",
        Role = UserRole.Business,
        CreatedAt = DateTime.UtcNow,
        Auth = CreateAuth(email)
    };

    public static User CreateStaff(Guid businessId, string email = "staff@test.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        FullName = "Test Staff",
        Role = UserRole.Staff,
        StaffBusinessId = businessId,
        CreatedAt = DateTime.UtcNow,
        Auth = CreateAuth(email)
    };

    public static Business CreateBusiness(Guid ownerId, string name = "Test Business") => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Category = "salon",
        Location = "Nairobi",
        MpesaNumber = "123456",
        OwnerId = ownerId,
        CreatedAt = DateTime.UtcNow
    };

    public static ServiceCatalogItem CreateService(Guid businessId, string name, int durationMinutes, decimal price) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        Name = name,
        DurationMinutes = durationMinutes,
        Price = price,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    public static StaffServiceAssignment CreateAssignment(Guid businessId, Guid staffUserId, Guid serviceId) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        StaffUserId = staffUserId,
        ServiceCatalogItemId = serviceId,
        CreatedAt = DateTime.UtcNow
    };

    public static StaffShift CreateShift(Guid businessId, Guid staffUserId, DateOnly date, int startHour, int endHour, bool isWorking = true) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        StaffUserId = staffUserId,
        Date = date,
        StartHour = startHour,
        EndHour = endHour,
        IsWorking = isWorking,
        CreatedAt = DateTime.UtcNow
    };

    public static Appointment CreateAppointment(Guid businessId, Guid customerId, Guid? staffUserId, DateTime scheduledAt, DateTime endAt, string status = "booked") => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        CustomerId = customerId,
        StaffUserId = staffUserId,
        ScheduledAt = scheduledAt,
        EndAt = endAt,
        Status = status,
        CreatedAt = DateTime.UtcNow
    };

    public static AppointmentStatusHistory CreateHistory(Guid appointmentId, string status, Guid? changedByUserId) => new()
    {
        Id = Guid.NewGuid(),
        AppointmentId = appointmentId,
        Status = status,
        ChangedAt = DateTime.UtcNow,
        ChangedByUserId = changedByUserId,
        CreatedAt = DateTime.UtcNow
    };

    public static AppointmentResource CreateResource(Guid appointmentId, Guid serviceId, string name, int durationMinutes, decimal price, int sortOrder) => new()
    {
        Id = Guid.NewGuid(),
        AppointmentId = appointmentId,
        ServiceCatalogItemId = serviceId,
        Name = name,
        DurationMinutes = durationMinutes,
        Price = price,
        SortOrder = sortOrder,
        CreatedAt = DateTime.UtcNow
    };
}
