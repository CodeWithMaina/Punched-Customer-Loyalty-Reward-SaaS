using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Pure slot engine for the booking system. Computes bookable windows by combining
/// working shifts × staff-service assignment × busy-time subtraction on a 15-minute grid.
/// Concrete, AddScoped helper (no interface) injected into <see cref="AppointmentService"/>.
/// </summary>
public class AppointmentAvailabilityService
{
    private const int GridStepMinutes = 15;

    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentAvailabilityService> _logger;

    public AppointmentAvailabilityService(
        ApplicationDbContext context,
        ILogger<AppointmentAvailabilityService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Computes all bookable slots for the given business/services across [startDate, endDate].
    /// </summary>
    public async Task<ApiResponse<List<AvailabilitySlotResponse>>> GetAvailableSlotsAsync(
        Guid businessId,
        Guid[] serviceIds,
        Guid? staffUserId,
        DateOnly startDate,
        DateOnly endDate)
    {
        if (serviceIds == null || serviceIds.Length == 0)
            return ApiResponse<List<AvailabilitySlotResponse>>.Fail("VALIDATION_ERROR", "At least one service is required.");

        // 1. Validate business exists & is active (soft-deleted excluded by global filter).
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.Id == businessId);
        if (business == null)
            return ApiResponse<List<AvailabilitySlotResponse>>.Fail("NOT_FOUND", "Business not found.");

        // 2. Validate services belong to the business and are active.
        var distinctRequested = serviceIds.Distinct().ToArray();
        var services = await _context.ServiceCatalogItems
            .Where(s => distinctRequested.Contains(s.Id) && s.BusinessId == businessId && s.IsActive)
            .ToListAsync();
        if (services.Count != distinctRequested.Length)
            return ApiResponse<List<AvailabilitySlotResponse>>.Fail("SERVICE_NOT_FOUND", "One or more services were not found in this business.");

        var totalMinutes = services.Sum(s => s.DurationMinutes);

        // 3. Candidate staff set.
        var candidates = new List<User>();
        if (staffUserId.HasValue)
        {
            var staff = await _context.Users.FirstOrDefaultAsync(u => u.Id == staffUserId.Value && u.StaffBusinessId == businessId);
            if (staff == null)
                return ApiResponse<List<AvailabilitySlotResponse>>.Fail("STAFF_NOT_FOUND", "Staff member not found in this business.");
            candidates.Add(staff);
        }
        else
        {
            var assignmentRows = await _context.StaffServiceAssignments
                .Where(a => a.BusinessId == businessId && distinctRequested.Contains(a.ServiceCatalogItemId))
                .Select(a => new { a.StaffUserId, a.ServiceCatalogItemId })
                .ToListAsync();

            var staffIds = assignmentRows
                .GroupBy(a => a.StaffUserId)
                .Where(g => g.Select(x => x.ServiceCatalogItemId).Distinct().Count() == distinctRequested.Length)
                .Select(g => g.Key)
                .ToList();

            if (staffIds.Count == 0)
                return ApiResponse<List<AvailabilitySlotResponse>>.Ok(new List<AvailabilitySlotResponse>());

            candidates = await _context.Users
                .Where(u => staffIds.Contains(u.Id) && u.StaffBusinessId == businessId)
                .ToListAsync();
        }

        // Preload busy appointments for each candidate across the requested window.
        var fromUtc = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toUtc = endDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var result = new List<AvailabilitySlotResponse>();

        foreach (var staff in candidates)
        {
            var busy = await _context.Appointments
                .Where(a => a.BusinessId == businessId && a.StaffUserId == staff.Id && a.ScheduledAt >= fromUtc && a.ScheduledAt < toUtc)
                .Select(a => new { a.ScheduledAt, a.EndAt })
                .ToListAsync();

            var shifts = await _context.StaffShifts
                .Where(s => s.StaffUserId == staff.Id && s.Date >= startDate && s.Date <= endDate)
                .ToListAsync();

            var workingWindows = shifts.Where(s => s.IsWorking).ToList();
            if (workingWindows.Count == 0)
                continue;

            var dayUtc = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                var dayStartUtc = dayUtc.AddDays(date.DayNumber - startDate.DayNumber);

                foreach (var window in workingWindows.Where(w => w.Date == date))
                {
                    for (var minute = window.StartHour * 60; minute + totalMinutes <= window.EndHour * 60; minute += GridStepMinutes)
                    {
                        var startAtUtc = dayStartUtc.AddMinutes(minute);
                        var endAtUtc = startAtUtc.AddMinutes(totalMinutes);

                        var overlaps = busy.Any(b => b.ScheduledAt < endAtUtc && b.EndAt > startAtUtc);
                        if (overlaps)
                            continue;

                        result.Add(new AvailabilitySlotResponse
                        {
                            StartAtUtc = startAtUtc,
                            EndAtUtc = endAtUtc,
                            StaffUserId = staff.Id,
                            StaffName = staff.FullName,
                            ServiceIds = distinctRequested
                        });
                    }
                }
            }
        }

        result = result.OrderBy(r => r.StartAtUtc).ThenBy(r => r.StaffUserId).ToList();
        return ApiResponse<List<AvailabilitySlotResponse>>.Ok(result);
    }
}