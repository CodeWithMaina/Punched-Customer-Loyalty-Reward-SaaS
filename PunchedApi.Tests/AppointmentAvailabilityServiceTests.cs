using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Services;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Tests;

/// <summary>
/// Phase 5 tests for the AppointmentAvailabilityService slot engine (backend.md §5).
/// </summary>
public class AppointmentAvailabilityServiceTests
{
    private static readonly DateOnly Day = new(2026, 8, 20);

    private static AppointmentAvailabilityService CreateAvailability(ApplicationDbContext context)
        => BookingTestBase.CreateAvailabilityService(context);

    [Fact]
    public async Task WorkingWindows_ProduceSlotsWithinShift_NonWorkingAndAbsentProduceNone()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var workingStaff = BookingTestBase.CreateStaff(business.Id, "working@test.com");
        var offStaff = BookingTestBase.CreateStaff(business.Id, "off@test.com");
        var absentStaff = BookingTestBase.CreateStaff(business.Id, "absent@test.com");
        var service = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);

        await BookingTestBase.SeedAsync(context,
            owner, business, workingStaff, offStaff, absentStaff, service,
            BookingTestBase.CreateAssignment(business.Id, workingStaff.Id, service.Id),
            BookingTestBase.CreateAssignment(business.Id, offStaff.Id, service.Id),
            BookingTestBase.CreateAssignment(business.Id, absentStaff.Id, service.Id),
            BookingTestBase.CreateShift(business.Id, workingStaff.Id, Day, 9, 12, isWorking: true),
            BookingTestBase.CreateShift(business.Id, offStaff.Id, Day, 9, 12, isWorking: false));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { service.Id }, null, Day, Day);

        Assert.True(result.Success, result.Error?.Message);
        Assert.NotEmpty(result.Data!);
        Assert.All(result.Data!, s => Assert.Equal(workingStaff.Id, s.StaffUserId));
        Assert.All(result.Data!, s => Assert.True(s.StartAtUtc.TimeOfDay >= TimeSpan.FromHours(9)));
        Assert.All(result.Data!, s => Assert.True(s.EndAtUtc.TimeOfDay <= TimeSpan.FromHours(12)));
        Assert.All(result.Data!, s => Assert.Equal(60, (s.EndAtUtc - s.StartAtUtc).TotalMinutes));
    }

    [Fact]
    public async Task MultiService_SumsDurations_AndDropsSlotPastEndHour()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var staff = BookingTestBase.CreateStaff(business.Id);
        var s1 = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        var s2 = BookingTestBase.CreateService(business.Id, "Style", 30, 300m);

        await BookingTestBase.SeedAsync(context, owner, business, staff, s1, s2,
            BookingTestBase.CreateAssignment(business.Id, staff.Id, s1.Id),
            BookingTestBase.CreateAssignment(business.Id, staff.Id, s2.Id),
            BookingTestBase.CreateShift(business.Id, staff.Id, Day, 9, 12));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { s1.Id, s2.Id }, staff.Id, Day, Day);

        Assert.True(result.Success, result.Error?.Message);
        Assert.All(result.Data!, s => Assert.Equal(90, (s.EndAtUtc - s.StartAtUtc).TotalMinutes));
        var maxStart = result.Data!.Max(s => s.StartAtUtc);
        Assert.Equal(10, maxStart.Hour);
        Assert.Equal(30, maxStart.Minute);
    }
[Fact]
    public async Task StaffMustBeAssignedToAllRequestedServices()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var staffA = BookingTestBase.CreateStaff(business.Id, "a@test.com");
        var staffB = BookingTestBase.CreateStaff(business.Id, "b@test.com");
        var s1 = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        var s2 = BookingTestBase.CreateService(business.Id, "Style", 30, 300m);

        await BookingTestBase.SeedAsync(context, owner, business, staffA, staffB, s1, s2,
            BookingTestBase.CreateAssignment(business.Id, staffA.Id, s1.Id),       // A: only s1
            BookingTestBase.CreateAssignment(business.Id, staffB.Id, s1.Id),
            BookingTestBase.CreateAssignment(business.Id, staffB.Id, s2.Id),       // B: both
            BookingTestBase.CreateShift(business.Id, staffA.Id, Day, 9, 12),
            BookingTestBase.CreateShift(business.Id, staffB.Id, Day, 9, 12));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { s1.Id, s2.Id }, null, Day, Day);

        Assert.True(result.Success, result.Error?.Message);
        Assert.NotEmpty(result.Data!);
        Assert.All(result.Data!, s => Assert.Equal(staffB.Id, s.StaffUserId));
    }

    [Fact]
    public async Task BusySubtraction_DropsOverlappingSlot_KeepsAdjacentNonOverlapping()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var customer = BookingTestBase.CreateCustomer();
        var staff = BookingTestBase.CreateStaff(business.Id);
        var service = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        var busy = BookingTestBase.CreateAppointment(
            business.Id, customer.Id, staff.Id,
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));

        await BookingTestBase.SeedAsync(context, owner, business, customer, staff, service, busy,
            BookingTestBase.CreateAssignment(business.Id, staff.Id, service.Id),
            BookingTestBase.CreateShift(business.Id, staff.Id, Day, 9, 12));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { service.Id }, staff.Id, Day, Day);

        Assert.True(result.Success, result.Error?.Message);
        var starts = result.Data!.Select(s => s.StartAtUtc.TimeOfDay).OrderBy(t => t).ToList();
        Assert.Equal(new[] { TimeSpan.FromHours(9), TimeSpan.FromHours(11) }, starts);
    }

    [Fact]
    public async Task FifteenMinuteGrid_SlotAtEndHourMinusDurationIncluded_EndHourExcluded()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var staff = BookingTestBase.CreateStaff(business.Id);
        var service = BookingTestBase.CreateService(business.Id, "Trim", 30, 200m);

        await BookingTestBase.SeedAsync(context, owner, business, staff, service,
            BookingTestBase.CreateAssignment(business.Id, staff.Id, service.Id),
            BookingTestBase.CreateShift(business.Id, staff.Id, Day, 9, 10));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { service.Id }, staff.Id, Day, Day);

        Assert.True(result.Success, result.Error?.Message);
        var starts = result.Data!.Select(s => s.StartAtUtc.TimeOfDay).OrderBy(t => t).ToList();
        Assert.Equal(new[] { TimeSpan.FromHours(9), TimeSpan.FromHours(9) + TimeSpan.FromMinutes(15), TimeSpan.FromHours(9) + TimeSpan.FromMinutes(30) }, starts);
        Assert.DoesNotContain(result.Data!, s => s.StartAtUtc.TimeOfDay == TimeSpan.FromHours(10));
    }
[Fact]
    public async Task UnknownBusiness_ReturnsNotFound()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var service = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        await BookingTestBase.SeedAsync(context, owner, business, service);

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(Guid.NewGuid(), new[] { service.Id }, null, Day, Day);

        Assert.False(result.Success);
        Assert.Equal("NOT_FOUND", result.Error?.Code);
    }

    [Fact]
    public async Task ServiceNotInBusinessOrInactive_ReturnsServiceNotFound()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner1 = BookingTestBase.CreateOwner("owner1@test.com");
        var owner2 = BookingTestBase.CreateOwner("owner2@test.com");
        var business1 = BookingTestBase.CreateBusiness(owner1.Id, "B1");
        var business2 = BookingTestBase.CreateBusiness(owner2.Id, "B2");
        var service1 = BookingTestBase.CreateService(business1.Id, "Cut", 60, 500m);
        var service2 = BookingTestBase.CreateService(business2.Id, "Style", 30, 300m);
        var inactive = BookingTestBase.CreateService(business1.Id, "Old", 15, 100m);
        inactive.IsActive = false;

        await BookingTestBase.SeedAsync(context, owner1, owner2, business1, business2, service1, service2, inactive);

        // service belonging to another business → SERVICE_NOT_FOUND
        var crossBiz = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business1.Id, new[] { service2.Id }, null, Day, Day);
        Assert.Equal("SERVICE_NOT_FOUND", crossBiz.Error?.Code);

        // inactive service in the same business → SERVICE_NOT_FOUND
        var inactiveSvc = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business1.Id, new[] { inactive.Id }, null, Day, Day);
        Assert.Equal("SERVICE_NOT_FOUND", inactiveSvc.Error?.Code);
    }

    [Fact]
    public async Task StaffNotInBusiness_ReturnsStaffNotFound()
    {
        using var connection = BookingTestBase.CreateConnection();
        using var context = BookingTestBase.CreateContext(connection);

        var owner = BookingTestBase.CreateOwner();
        var otherOwner = BookingTestBase.CreateOwner("x@test.com");
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var otherBusiness = BookingTestBase.CreateBusiness(otherOwner.Id, "Other");
        var service = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        var foreignStaff = BookingTestBase.CreateStaff(otherBusiness.Id, "foreign@test.com");

        await BookingTestBase.SeedAsync(context, owner, otherOwner, otherBusiness, foreignStaff, business, service,
            BookingTestBase.CreateAssignment(business.Id, foreignStaff.Id, service.Id));

        var result = await CreateAvailability(context)
            .GetAvailableSlotsAsync(business.Id, new[] { service.Id }, foreignStaff.Id, Day, Day);

        Assert.False(result.Success);
        Assert.Equal("STAFF_NOT_FOUND", result.Error?.Code);
    }
}