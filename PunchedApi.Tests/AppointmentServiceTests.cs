using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Tests;

/// <summary>
/// Phase 5 tests for AppointmentService: creation, on-behalf booking, the transactional
/// overlap guard, reschedule, multi-tenant scoping, and status-transition lifecycle.
/// Uses SQLite in-memory because AppointmentService calls BeginTransactionAsync.
/// </summary>
public class AppointmentServiceTests
{
    private sealed class Env
    {
        public ApplicationDbContext Context = null!;
        public AppointmentService Service = null!;
        public Business Business = null!;
        public User Owner = null!;
        public User Customer = null!;
        public User Staff = null!;
        public ServiceCatalogItem S1 = null!;
        public ServiceCatalogItem S2 = null!;
    }

    private static readonly DateTime Ten = new(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc);

    private static async Task<Env> CreateEnvAsync(SqliteConnection connection)
    {
        var context = BookingTestBase.CreateContext(connection);
        var service = BookingTestBase.CreateAppointmentService(context);
        var owner = BookingTestBase.CreateOwner();
        var business = BookingTestBase.CreateBusiness(owner.Id);
        var customer = BookingTestBase.CreateCustomer();
        var staff = BookingTestBase.CreateStaff(business.Id);
        var s1 = BookingTestBase.CreateService(business.Id, "Cut", 60, 500m);
        var s2 = BookingTestBase.CreateService(business.Id, "Style", 30, 300m);

        await BookingTestBase.SeedAsync(context, owner, business, customer, staff, s1, s2,
            BookingTestBase.CreateAssignment(business.Id, staff.Id, s1.Id),
            BookingTestBase.CreateAssignment(business.Id, staff.Id, s2.Id),
            BookingTestBase.CreateShift(business.Id, staff.Id, new DateOnly(2026, 8, 20), 9, 18));

        return new Env
        {
            Context = context, Service = service, Business = business,
            Owner = owner, Customer = customer, Staff = staff, S1 = s1, S2 = s2
        };
    }

    [Fact]
    public async Task CreateAppointmentAsync_Customer_SetsEndAtSnapshotsAndHistory()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var request = new CreateAppointmentRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id, env.S2.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten,
            Note = "hello"
        };

        var result = await env.Service.CreateAppointmentAsync(env.Customer.Id, "Customer", request);

        Assert.True(result.Success, result.Error?.Message);
        var data = result.Data!;
        Assert.Equal("booked", data.Status);
        Assert.Equal(Ten.AddMinutes(90), data.EndAt);
        Assert.Equal(2, data.Services.Count);
        Assert.Equal(new[] { 0, 1 }, data.Services.Select(s => s.SortOrder).OrderBy(x => x).ToArray());
        Assert.Contains(data.Services, s => s.Name == env.S1.Name && s.DurationMinutes == 60 && s.Price == 500m);
        Assert.Contains(data.Services, s => s.Name == env.S2.Name && s.DurationMinutes == 30 && s.Price == 300m);

        var appt = await context.Appointments.Include(a => a.Resources).FirstAsync(a => a.Id == data.Id);
        Assert.Equal("booked", appt.Status);
        Assert.Equal(Ten.AddMinutes(90), appt.EndAt);
        Assert.Equal(2, appt.Resources.Count);

        var history = await context.AppointmentStatusHistory.Where(h => h.AppointmentId == data.Id).ToListAsync();
        Assert.Single(history);
        Assert.Equal("booked", history[0].Status);
        Assert.Equal(env.Customer.Id, history[0].ChangedByUserId);
        Assert.True((DateTime.UtcNow - history[0].ChangedAt).Duration() < TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task CreateAppointmentOnBehalfAsync_ForcesRealCustomerRole()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var valid = new CreateAppointmentOnBehalfRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten,
            CustomerId = env.Customer.Id
        };
        var ok = await env.Service.CreateAppointmentOnBehalfAsync(env.Owner.Id, "Business", valid);
        Assert.True(ok.Success, ok.Error?.Message);
        Assert.Equal(env.Customer.Id, ok.Data!.CustomerId);

        // customerId points to a Business-role user (not a Customer) → CUSTOMER_NOT_FOUND
        var bad = new CreateAppointmentOnBehalfRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten,
            CustomerId = env.Owner.Id
        };
        var badResult = await env.Service.CreateAppointmentOnBehalfAsync(env.Owner.Id, "Business", bad);
        Assert.False(badResult.Success);
        Assert.Equal("CUSTOMER_NOT_FOUND", badResult.Error?.Code);
    }
[Fact]
    public async Task CreateAppointmentOnBehalfAsync_StaffNotAssignedAllServices_ReturnsStaffNotAvailable()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var limitedStaff = BookingTestBase.CreateStaff(env.Business.Id, "limited@test.com");
        await BookingTestBase.SeedAsync(context, limitedStaff,
            BookingTestBase.CreateAssignment(env.Business.Id, limitedStaff.Id, env.S1.Id));

        var request = new CreateAppointmentOnBehalfRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id, env.S2.Id },
            StaffUserId = limitedStaff.Id,
            ScheduledAt = Ten,
            CustomerId = env.Customer.Id
        };
        var result = await env.Service.CreateAppointmentOnBehalfAsync(env.Owner.Id, "Business", request);
        Assert.False(result.Success);
        Assert.Equal("STAFF_NOT_AVAILABLE", result.Error?.Code);
    }

    [Fact]
    public async Task CreateAppointmentOnBehalfAsync_BusinessIdMismatch_ReturnsForbidden()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherOwner = BookingTestBase.CreateOwner("other@test.com");
        var otherBusiness = BookingTestBase.CreateBusiness(otherOwner.Id, "Other");
        await BookingTestBase.SeedAsync(context, otherOwner, otherBusiness);

        var request = new CreateAppointmentOnBehalfRequest
        {
            BusinessId = otherBusiness.Id,
            ServiceIds = new[] { env.S1.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten,
            CustomerId = env.Customer.Id
        };
        var result = await env.Service.CreateAppointmentOnBehalfAsync(env.Owner.Id, "Business", request);
        Assert.False(result.Success);
        Assert.Equal("FORBIDDEN", result.Error?.Code);
    }

    [Fact]
    public async Task CreateAppointmentAsync_OverlappingSlot_ReturnsOverbooking_TouchingSucceeds()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var existing = BookingTestBase.CreateAppointment(
            env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1));
        await BookingTestBase.SeedAsync(context, existing);

        var overlap = new CreateAppointmentRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten.AddMinutes(30)
        };
        var overlapResult = await env.Service.CreateAppointmentAsync(env.Customer.Id, "Customer", overlap);
        Assert.False(overlapResult.Success);
        Assert.Equal("OVERBOOKING", overlapResult.Error?.Code);

        var touching = new CreateAppointmentRequest
        {
            BusinessId = env.Business.Id,
            ServiceIds = new[] { env.S1.Id },
            StaffUserId = env.Staff.Id,
            ScheduledAt = Ten.AddHours(1)
        };
        var touchingResult = await env.Service.CreateAppointmentAsync(env.Customer.Id, "Customer", touching);
        Assert.True(touchingResult.Success, touchingResult.Error?.Message);
    }

    [Fact]
    public async Task RescheduleAsync_UpdatesTimesReplacesResources_OverlapWithOtherReturnsOverbooking()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var a = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1));
        a.Resources.Add(BookingTestBase.CreateResource(a.Id, env.S1.Id, env.S1.Name, 60, 500m, 0));
        var b = BookingTestBase.CreateAppointment(
            env.Business.Id, env.Customer.Id, env.Staff.Id,
            new DateTime(2026, 8, 20, 14, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 15, 0, 0, DateTimeKind.Utc));
        await BookingTestBase.SeedAsync(context, a, b);

        // Basic reschedule keeps S1 → EndAt = newStart + 60.
        var basic = new RescheduleAppointmentRequest { ScheduledAt = new DateTime(2026, 8, 20, 13, 0, 0, DateTimeKind.Utc) };
        var basicResult = await env.Service.RescheduleAsync(env.Customer.Id, "Customer", a.Id, basic);
        Assert.True(basicResult.Success, basicResult.Error?.Message);
        Assert.Equal(new DateTime(2026, 8, 20, 13, 0, 0, DateTimeKind.Utc), basicResult.Data!.ScheduledAt);
        Assert.Equal(new DateTime(2026, 8, 20, 14, 0, 0, DateTimeKind.Utc), basicResult.Data!.EndAt);

        // Replacing serviceIds with S2 (30 min) → EndAt recomputed, resources replaced.
        var replace = new RescheduleAppointmentRequest
        {
            ScheduledAt = new DateTime(2026, 8, 20, 16, 0, 0, DateTimeKind.Utc),
            ServiceIds = new[] { env.S2.Id }
        };
        var replaceResult = await env.Service.RescheduleAsync(env.Customer.Id, "Customer", a.Id, replace);
        Assert.True(replaceResult.Success, replaceResult.Error?.Message);
        Assert.Equal(new DateTime(2026, 8, 20, 16, 30, 0, DateTimeKind.Utc), replaceResult.Data!.EndAt);
        Assert.Single(replaceResult.Data!.Services);
        Assert.Equal(env.S2.Name, replaceResult.Data!.Services[0].Name);

        // Overlap with a different appointment B [14:00,15:00) → OVERBOOKING (self excluded).
        var overlap = new RescheduleAppointmentRequest { ScheduledAt = new DateTime(2026, 8, 20, 14, 30, 0, DateTimeKind.Utc) };
        var overlapResult = await env.Service.RescheduleAsync(env.Customer.Id, "Customer", a.Id, overlap);
        Assert.False(overlapResult.Success);
        Assert.Equal("OVERBOOKING", overlapResult.Error?.Code);
    }
[Fact]
    public async Task GetAppointmentAsync_Customer_ForOtherCustomersAppointment_ReturnsForbidden()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherCustomer = BookingTestBase.CreateCustomer("other@test.com");
        var appt = BookingTestBase.CreateAppointment(env.Business.Id, otherCustomer.Id, env.Staff.Id, Ten, Ten.AddHours(1));
        await BookingTestBase.SeedAsync(context, otherCustomer, appt);

        var result = await env.Service.GetAppointmentAsync(env.Customer.Id, "Customer", appt.Id);
        Assert.False(result.Success);
        Assert.Equal("FORBIDDEN", result.Error?.Code);
    }

    [Fact]
    public async Task GetAppointmentAsync_Owner_ForOtherBusiness_ReturnsForbidden_OwnBusinessSucceeds()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherOwner = BookingTestBase.CreateOwner("other@test.com");
        var otherBusiness = BookingTestBase.CreateBusiness(otherOwner.Id, "Other");
        var otherCustomer = BookingTestBase.CreateCustomer("oc@test.com");
        var otherStaff = BookingTestBase.CreateStaff(otherBusiness.Id, "os@test.com");
        var apptOther = BookingTestBase.CreateAppointment(otherBusiness.Id, otherCustomer.Id, otherStaff.Id, Ten, Ten.AddHours(1));
        var apptOwn = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(2), Ten.AddHours(3));
        await BookingTestBase.SeedAsync(context, otherOwner, otherBusiness, otherCustomer, otherStaff, apptOther, apptOwn);

        var forbidden = await env.Service.GetAppointmentAsync(env.Owner.Id, "Business", apptOther.Id);
        Assert.False(forbidden.Success);
        Assert.Equal("FORBIDDEN", forbidden.Error?.Code);

        var ok = await env.Service.GetAppointmentAsync(env.Owner.Id, "Business", apptOwn.Id);
        Assert.True(ok.Success, ok.Error?.Message);
    }

    [Fact]
    public async Task GetAppointmentAsync_Staff_ForOtherStaffAppointment_ReturnsForbidden()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherStaff = BookingTestBase.CreateStaff(env.Business.Id, "otherstaff@test.com");
        var appt = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, otherStaff.Id, Ten, Ten.AddHours(1));
        await BookingTestBase.SeedAsync(context, otherStaff, appt);

        var result = await env.Service.GetAppointmentAsync(env.Staff.Id, "Staff", appt.Id);
        Assert.False(result.Success);
        Assert.Equal("FORBIDDEN", result.Error?.Code);
    }
[Fact]
    public async Task GetBusinessAppointmentsAsync_ScopesToOwnerBusiness_AppliesFiltersAndPaging()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var otherOwner = BookingTestBase.CreateOwner("o2@test.com");
        var otherBusiness = BookingTestBase.CreateBusiness(otherOwner.Id, "Other");
        var otherCustomer = BookingTestBase.CreateCustomer("oc2@test.com");
        var otherStaff = BookingTestBase.CreateStaff(otherBusiness.Id, "os2@test.com");
        var staff2 = BookingTestBase.CreateStaff(env.Business.Id, "staff2@test.com");

        var a1 = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1), "confirmed");
        var a2 = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, staff2.Id, Ten.AddHours(2), Ten.AddHours(3));
        var aOther = BookingTestBase.CreateAppointment(otherBusiness.Id, otherCustomer.Id, otherStaff.Id, Ten.AddHours(4), Ten.AddHours(5));

        await BookingTestBase.SeedAsync(context,
            otherOwner, otherBusiness, otherCustomer, otherStaff, staff2, a1, a2, aOther,
            BookingTestBase.CreateResource(a1.Id, env.S1.Id, env.S1.Name, 60, 500m, 0),
            BookingTestBase.CreateResource(a2.Id, env.S2.Id, env.S2.Name, 30, 300m, 0));

        var all = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, null, null, null, null, null, null, 1, 20);
        Assert.True(all.Success, all.Error?.Message);
        Assert.Equal(2, all.Data!.TotalCount);
        Assert.DoesNotContain(all.Data.Items, x => x.Id == aOther.Id);

        var confirmed = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, "confirmed", null, null, null, null, null, 1, 20);
        Assert.Single(confirmed.Data!.Items);
        Assert.Equal(a1.Id, confirmed.Data.Items[0].Id);

        var staffFiltered = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, null, null, null, env.Staff.Id, null, null, 1, 20);
        Assert.Single(staffFiltered.Data!.Items);
        Assert.Equal(a1.Id, staffFiltered.Data.Items[0].Id);

        var custFiltered = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, null, null, null, null, env.Customer.Id, null, 1, 20);
        Assert.Equal(2, custFiltered.Data!.TotalCount);

        var svcFiltered = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, null, null, null, null, null, env.S2.Id, 1, 20);
        Assert.Single(svcFiltered.Data!.Items);
        Assert.Equal(a2.Id, svcFiltered.Data.Items[0].Id);

        var paged = await env.Service.GetBusinessAppointmentsAsync(env.Owner.Id, null, null, null, null, null, null, 2, 1);
        Assert.Equal(1, paged.Data!.Items.Count);
        Assert.Equal(2, paged.Data.TotalCount);
    }

    [Fact]
    public async Task GetStaffAppointmentsAsync_ReturnsOnlyThatStaffsRows()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var staff2 = BookingTestBase.CreateStaff(env.Business.Id, "staff2@test.com");
        var a1 = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1), "confirmed");
        var a2 = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, staff2.Id, Ten.AddHours(2), Ten.AddHours(3));
        await BookingTestBase.SeedAsync(context, staff2, a1, a2,
            BookingTestBase.CreateResource(a1.Id, env.S1.Id, env.S1.Name, 60, 500m, 0),
            BookingTestBase.CreateResource(a2.Id, env.S2.Id, env.S2.Name, 30, 300m, 0));

        var result = await env.Service.GetStaffAppointmentsAsync(env.Staff.Id, null, null, null);
        Assert.True(result.Success, result.Error?.Message);
        Assert.Single(result.Data!);
        Assert.Equal(a1.Id, result.Data![0].Id);

        var filtered = await env.Service.GetStaffAppointmentsAsync(env.Staff.Id, "booked", null, null);
        Assert.Empty(filtered.Data!);
    }
[Fact]
    public async Task StatusTransitions_ValidTransitions_UpdateStatusAndAppendHistory()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        // booked → confirmed (Business)
        var booked = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1));
        await BookingTestBase.SeedAsync(context, booked);

        var confirmed = await env.Service.ConfirmAsync(env.Owner.Id, "Business", booked.Id);
        Assert.True(confirmed.Success, confirmed.Error?.Message);
        Assert.Equal("confirmed", confirmed.Data!.Status);
        var c1 = await context.AppointmentStatusHistory.FirstAsync(h => h.AppointmentId == booked.Id && h.Status == "confirmed");
        Assert.Equal(env.Owner.Id, c1.ChangedByUserId);

        // confirmed → completed (Business)
        var completed = await env.Service.CompleteAsync(env.Owner.Id, "Business", booked.Id);
        Assert.True(completed.Success, completed.Error?.Message);
        Assert.Equal("completed", completed.Data!.Status);

        // booked → cancelled (Customer)
        var toCancel = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(4), Ten.AddHours(5));
        await BookingTestBase.SeedAsync(context, toCancel);
        var cancelled = await env.Service.CancelAsync(env.Customer.Id, "Customer", toCancel.Id, new CancelAppointmentRequest());
        Assert.True(cancelled.Success, cancelled.Error?.Message);
        Assert.Equal("cancelled", cancelled.Data!.Status);

        // confirmed → no_show (Business)
        var noShow = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(6), Ten.AddHours(7), "confirmed");
        await BookingTestBase.SeedAsync(context, noShow);
        var nsResult = await env.Service.MarkNoShowAsync(env.Owner.Id, "Business", noShow.Id);
        Assert.True(nsResult.Success, nsResult.Error?.Message);
        Assert.Equal("no_show", nsResult.Data!.Status);
    }

    [Fact]
    public async Task StatusTransitions_IllegalTransitions_ReturnInvalidStatusTransition()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var completed = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1), "completed");
        var booked2completed = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(2), Ten.AddHours(3));
        var noShow = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(4), Ten.AddHours(5), "no_show");
        var confirmed = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(6), Ten.AddHours(7), "confirmed");
        await BookingTestBase.SeedAsync(context, completed, booked2completed, noShow, confirmed);

        // completed → cancelled (cancelled requires from 'booked')
        var r1 = await env.Service.CancelAsync(env.Owner.Id, "Business", completed.Id, new CancelAppointmentRequest());
        Assert.Equal("INVALID_STATUS_TRANSITION", r1.Error?.Code);

        // booked → completed (completed requires from 'confirmed')
        var r2 = await env.Service.CompleteAsync(env.Owner.Id, "Business", booked2completed.Id);
        Assert.Equal("INVALID_STATUS_TRANSITION", r2.Error?.Code);

        // no_show → confirmed (confirmed requires from 'booked')
        var r3 = await env.Service.ConfirmAsync(env.Owner.Id, "Business", noShow.Id);
        Assert.Equal("INVALID_STATUS_TRANSITION", r3.Error?.Code);

        // confirmed → confirmed (confirmed requires from 'booked')
        var r4 = await env.Service.ConfirmAsync(env.Owner.Id, "Business", confirmed.Id);
        Assert.Equal("INVALID_STATUS_TRANSITION", r4.Error?.Code);
    }

    [Fact]
    public async Task StatusTransitions_CustomerCannotConfirmCompleteOrNoShow_CanCancelOwn()
    {
        using var connection = BookingTestBase.CreateConnection();
        var env = await CreateEnvAsync(connection);
        using var context = env.Context;

        var booked = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten, Ten.AddHours(1));
        var toCancel = BookingTestBase.CreateAppointment(env.Business.Id, env.Customer.Id, env.Staff.Id, Ten.AddHours(2), Ten.AddHours(3));
        await BookingTestBase.SeedAsync(context, booked, toCancel);

        var confirm = await env.Service.ConfirmAsync(env.Customer.Id, "Customer", booked.Id);
        Assert.Equal("FORBIDDEN", confirm.Error?.Code);

        await env.Service.ConfirmAsync(env.Owner.Id, "Business", booked.Id);

        var complete = await env.Service.CompleteAsync(env.Customer.Id, "Customer", booked.Id);
        Assert.Equal("FORBIDDEN", complete.Error?.Code);
        var noShow = await env.Service.MarkNoShowAsync(env.Customer.Id, "Customer", booked.Id);
        Assert.Equal("FORBIDDEN", noShow.Error?.Code);

        var cancel = await env.Service.CancelAsync(env.Customer.Id, "Customer", toCancel.Id, new CancelAppointmentRequest());
        Assert.True(cancel.Success, cancel.Error?.Message);
        Assert.Equal("cancelled", cancel.Data!.Status);
    }
}