using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using PunchedApi.Application.Analytics;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public partial class BusinessService : IBusinessService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IInsightService _insightService;
    private readonly IBusinessScopeResolver _businessScopeResolver;
    private readonly ILogger<BusinessService> _logger;

    public BusinessService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        IInsightService insightService,
        IBusinessScopeResolver businessScopeResolver,
        ILogger<BusinessService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _insightService = insightService;
        _businessScopeResolver = businessScopeResolver;
        _logger = logger;
    }

    public async Task<ApiResponse<BusinessResponse>> CreateBusinessAsync(Guid ownerId, CreateBusinessRequest request)
    {
        try
        {
            var existing = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (existing != null)
                return ApiResponse<BusinessResponse>.Fail("BUSINESS_EXISTS", "You already have a registered business.");

            var business = new Business
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Category = request.Category.Trim(),
                Location = request.Location.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                Email = request.Email?.Trim().ToLowerInvariant(),
                Description = request.Description?.Trim(),
                LogoUrl = request.LogoUrl?.Trim(),
                MpesaNumber = request.MpesaNumber.Trim(),
                OwnerId = ownerId,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Businesses.AddAsync(business);
            await _unitOfWork.SaveChangesAsync();
            _businessScopeResolver.InvalidateOwner(ownerId);

            return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating business for owner {OwnerId}", ownerId);
            return ApiResponse<BusinessResponse>.Fail("CREATE_FAILED", "Failed to create business.");
        }
    }

    public async Task<ApiResponse<BusinessResponse>> GetMyBusinessAsync(Guid ownerId)
    {
        var business = await _context.Businesses
            .AsNoTracking()
            .Include(b => b.LoyaltyPrograms)
            .Include(b => b.ReferralProgram)
            .FirstOrDefaultAsync(b => b.OwnerId == ownerId);

        if (business == null)
            return ApiResponse<BusinessResponse>.Fail("NOT_FOUND", "No business found for this account.");

        return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
    }

    public async Task<ApiResponse<BusinessResponse>> UpdateMyBusinessAsync(Guid ownerId, UpdateBusinessRequest request)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<BusinessResponse>.Fail("NOT_FOUND", "No business found for this account.");

        if (request.Name != null) business.Name = request.Name.Trim();
        if (request.Category != null) business.Category = request.Category.Trim();
        if (request.Location != null) business.Location = request.Location.Trim();
        if (request.PhoneNumber != null) business.PhoneNumber = request.PhoneNumber.Trim();
        if (request.Email != null) business.Email = request.Email.Trim().ToLowerInvariant();
        if (request.Description != null) business.Description = request.Description.Trim();
        if (request.LogoUrl != null) business.LogoUrl = request.LogoUrl.Trim();
        if (request.MpesaNumber != null) business.MpesaNumber = request.MpesaNumber.Trim();

        _unitOfWork.Businesses.Update(business);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
    }

    public async Task<ApiResponse<BusinessResponse>> GetBusinessByIdAsync(Guid businessId)
    {
        var business = await _context.Businesses
            .AsNoTracking()
            .Include(b => b.LoyaltyPrograms)
            .Include(b => b.ReferralProgram)
            .FirstOrDefaultAsync(b => b.Id == businessId);

        if (business == null)
            return ApiResponse<BusinessResponse>.Fail("NOT_FOUND", "Business not found.");

        return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
    }

    public async Task<ApiResponse<List<BusinessResponse>>> ListBusinessesAsync(string? category, string? search, int page, int pageSize)
    {
        var query = _context.Businesses
            .AsNoTracking()
            .Include(b => b.LoyaltyPrograms).Include(b => b.ReferralProgram).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(b => EF.Functions.ILike(b.Category, category));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(b => EF.Functions.ILike(b.Name, pattern) || EF.Functions.ILike(b.Category, pattern) || (b.Location != null && EF.Functions.ILike(b.Location, pattern)));
        }

        var businesses = await query
            .OrderBy(b => b.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = businesses.Select(b => MapToResponse(b)).ToList();
        return ApiResponse<List<BusinessResponse>>.Ok(result);
    }

    public async Task<ApiResponse<PaginatedResponse<BusinessCustomerResponse>>> GetBusinessCustomersAsync(
        Guid ownerId,
        string? search,
        string? status,
        DateOnly? enrolledFrom,
        DateOnly? enrolledTo,
        string sortBy,
        string sortDirection,
        int page,
        int pageSize)
    {
        var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(ownerId);
        if (businessId == null)
            return ApiResponse<PaginatedResponse<BusinessCustomerResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var query = _context.LoyaltyCards
            .Where(c => c.BusinessId == businessId.Value)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.Customer.FullName, pattern) ||
                EF.Functions.ILike(c.Customer.Email, pattern) ||
                (c.Customer.PhoneNumber != null && EF.Functions.ILike(c.Customer.PhoneNumber, pattern)));
        }

        if (status?.ToLowerInvariant() == "active")
        {
            var activeSince = DateTime.UtcNow.AddDays(-7);
            query = query.Where(c => c.LastStampAt >= activeSince);
        }
        else if (status?.ToLowerInvariant() == "ready")
        {
            query = query.Where(c => c.TotalStamps >= c.Program.StampsRequired);
        }

        if (enrolledFrom.HasValue)
        {
            var from = enrolledFrom.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(c => c.EnrolledAt >= from);
        }

        if (enrolledTo.HasValue)
        {
            var toExclusive = enrolledTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(c => c.EnrolledAt < toExclusive);
        }

        var descending = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLowerInvariant() switch
        {
            "stamps" => descending ? query.OrderByDescending(c => c.TotalStamps).ThenBy(c => c.Customer.FullName) : query.OrderBy(c => c.TotalStamps).ThenBy(c => c.Customer.FullName),
            "name" => descending ? query.OrderByDescending(c => c.Customer.FullName) : query.OrderBy(c => c.Customer.FullName),
            _ => descending ? query.OrderByDescending(c => c.LastStampAt ?? c.EnrolledAt) : query.OrderBy(c => c.LastStampAt ?? c.EnrolledAt)
        };

        var totalCount = await query.CountAsync();
        var cards = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new BusinessCustomerResponse
            {
                UserId = c.CustomerId,
                FullName = c.Customer.FullName,
                Email = c.Customer.Email,
                PhoneNumber = c.Customer.PhoneNumber,
                DateOfBirth = c.Customer.DateOfBirth,
                Gender = c.Customer.Gender,
                AvatarUrl = c.Customer.AvatarUrl,
                CardId = c.Id,
                TotalStamps = c.TotalStamps,
                LifetimeStamps = c.LifetimeStamps,
                TotalRedemptions = c.TotalRedemptions,
                EnrolledAt = c.EnrolledAt,
                LastStampAt = c.LastStampAt,
                StampsRequired = c.Program.StampsRequired
            })
            .ToListAsync();

        return ApiResponse<PaginatedResponse<BusinessCustomerResponse>>.Ok(new PaginatedResponse<BusinessCustomerResponse>
        {
            Items = cards,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<BusinessCustomerResponse>> GetSingleCustomerAsync(Guid ownerId, Guid customerId)
    {
        var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(ownerId);
        if (businessId == null)
            return ApiResponse<BusinessCustomerResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var card = await _context.LoyaltyCards
            .Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.BusinessId == businessId && c.CustomerId == customerId);

        if (card == null)
            return ApiResponse<BusinessCustomerResponse>.Fail("NOT_FOUND", "Customer not enrolled in this business.");

        var stampsRequired = await _context.LoyaltyPrograms
            .Where(p => p.BusinessId == businessId.Value && p.IsActive)
            .Select(p => (int?)p.StampsRequired)
            .FirstOrDefaultAsync();

        return ApiResponse<BusinessCustomerResponse>.Ok(new BusinessCustomerResponse
        {
            UserId = card.CustomerId,
            FullName = card.Customer.FullName,
            Email = card.Customer.Email,
            PhoneNumber = card.Customer.PhoneNumber,
            DateOfBirth = card.Customer.DateOfBirth,
            Gender = card.Customer.Gender,
            AvatarUrl = card.Customer.AvatarUrl,
            CardId = card.Id,
            TotalStamps = card.TotalStamps,
            LifetimeStamps = card.LifetimeStamps,
            TotalRedemptions = card.TotalRedemptions,
            EnrolledAt = card.EnrolledAt,
            LastStampAt = card.LastStampAt,
            StampsRequired = stampsRequired
        });
    }

    private static string EscapeLike(string input) =>
        input.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    /// <summary>
    /// Customer management overview for the owner: summary counts, engagement
    /// snapshot (top customers / soon-to-reward / recently active).
    /// </summary>
    public async Task<ApiResponse<CustomerOverviewResponse>> GetCustomerOverviewAsync(Guid ownerId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<CustomerOverviewResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var now = DateTime.UtcNow;
        var weekAgo = now.AddDays(-7);
        var riskCutoff = now.AddDays(-21);

        var stampsRequired = await _context.LoyaltyPrograms
            .Where(p => p.BusinessId == business.Id && p.IsActive)
            .Select(p => (int?)p.StampsRequired)
            .FirstOrDefaultAsync();

        // Single aggregate query over the business's loyalty cards — no N+1.
        var customers = await _context.LoyaltyCards
            .Where(c => c.BusinessId == business.Id)
            .AsNoTracking()
            .Select(c => new BusinessCustomerResponse
            {
                UserId = c.CustomerId,
                FullName = c.Customer.FullName,
                Email = c.Customer.Email,
                PhoneNumber = c.Customer.PhoneNumber,
                DateOfBirth = c.Customer.DateOfBirth,
                Gender = c.Customer.Gender,
                AvatarUrl = c.Customer.AvatarUrl,
                CardId = c.Id,
                TotalStamps = c.TotalStamps,
                LifetimeStamps = c.LifetimeStamps,
                TotalRedemptions = c.TotalRedemptions,
                EnrolledAt = c.EnrolledAt,
                LastStampAt = c.LastStampAt,
                StampsRequired = stampsRequired
            })
            .ToListAsync();

        var stampsThisWeek = await _context.Stamps
            .CountAsync(s => s.Card.BusinessId == business.Id && s.StampedAt >= weekAgo);

        var threshold = stampsRequired ?? 0;

        return ApiResponse<CustomerOverviewResponse>.Ok(new CustomerOverviewResponse
        {
            TotalCustomers = customers.Count,
            Active7d = customers.Count(c => c.LastStampAt.HasValue && c.LastStampAt.Value >= weekAgo),
            RewardReady = threshold > 0 ? customers.Count(c => c.TotalStamps >= threshold) : 0,
            NewThisWeek = customers.Count(c => c.EnrolledAt >= weekAgo),
            AtRisk = customers.Count(c => !c.LastStampAt.HasValue || c.LastStampAt.Value < riskCutoff),
            StampsThisWeek = stampsThisWeek,
            TopCustomers = customers
                .OrderByDescending(c => c.LifetimeStamps)
                .ThenByDescending(c => c.TotalStamps)
                .Take(5)
                .ToList(),
            SoonToReward = threshold > 0
                ? customers
                    .Where(c => c.TotalStamps < threshold && c.TotalStamps >= Math.Max(threshold - 3, 1))
                    .OrderByDescending(c => c.TotalStamps)
                    .Take(5)
                    .ToList()
                : [],
            RecentlyActive = customers
                .Where(c => c.LastStampAt.HasValue)
                .OrderByDescending(c => c.LastStampAt)
                .Take(5)
                .ToList(),
        });
    }

    /// <summary>
    /// Paginated stamp + redemption activity feed for a single customer.
    /// Totals are computed DB-side; each source yields at most page*pageSize rows.
    /// </summary>
    public async Task<ApiResponse<CustomerActivityFeedResponse>> GetCustomerActivityAsync(
        Guid ownerId, Guid customerId, int page = 1, int pageSize = 10)
    {
        var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(ownerId);
        if (businessId == null)
            return ApiResponse<CustomerActivityFeedResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var card = await _context.LoyaltyCards
            .Include(c => c.Customer)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.BusinessId == businessId && c.CustomerId == customerId);

        if (card == null)
            return ApiResponse<CustomerActivityFeedResponse>.Fail("NOT_FOUND", "Customer not enrolled in this business.");

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var fetchBound = page * pageSize;

        var stampTotal = await _context.Stamps.CountAsync(s => s.CardId == card.Id);
        var redemptionTotal = await _context.Redemptions.CountAsync(r => r.CardId == card.Id);

        var stamps = await _context.Stamps
            .Where(s => s.CardId == card.Id)
            .OrderByDescending(s => s.StampedAt)
            .Take(fetchBound)
            .Select(s => new CustomerActivityItem
            {
                ActivityId = s.Id,
                ActivityType = "stamp",
                StampNumber = s.StampNumber,
                StaffName = s.AwardedByUserId != null
                    ? _context.Users.Where(u => u.Id == s.AwardedByUserId).Select(u => u.FullName).FirstOrDefault()
                    : null,
                Timestamp = s.StampedAt
            })
            .ToListAsync();

        var redemptions = await _context.Redemptions
            .Where(r => r.CardId == card.Id)
            .OrderByDescending(r => r.RedeemedAt)
            .Take(fetchBound)
            .Select(r => new CustomerActivityItem
            {
                ActivityId = r.Id,
                ActivityType = "redemption",
                StaffName = r.PerformedByUserId != null
                    ? _context.Users.Where(u => u.Id == r.PerformedByUserId).Select(u => u.FullName).FirstOrDefault()
                    : null,
                RewardValue = r.RewardValue,
                Timestamp = r.RedeemedAt
            })
            .ToListAsync();

        var items = stamps.Concat(redemptions)
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var total = stampTotal + redemptionTotal;

        return ApiResponse<CustomerActivityFeedResponse>.Ok(new CustomerActivityFeedResponse
        {
            CustomerId = customerId,
            CustomerName = card.Customer.FullName,
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize),
        });
    }

    private static BusinessResponse MapToResponse(Business b) => new()
    {
        Id = b.Id,
        Name = b.Name,
        Category = b.Category,
        Location = b.Location,
        PhoneNumber = b.PhoneNumber,
        Email = b.Email,
        Description = b.Description,
        LogoUrl = b.LogoUrl,
        OwnerId = b.OwnerId,
        DefaultDailyGoal = b.DefaultDailyGoal,
        CreatedAt = b.CreatedAt,
        LoyaltyPrograms = b.LoyaltyPrograms.Select(p => new LoyaltyProgramResponse
        {
            Id = p.Id,
            BusinessId = p.BusinessId,
            Name = p.Name,
            IsActive = p.IsActive,
            StampsRequired = p.StampsRequired,
            RewardValue = p.RewardValue,
            RewardDescription = p.RewardDescription,
            RewardExpirationHours = p.RewardExpirationHours,
            DefaultEnrollmentStamps = p.DefaultEnrollmentStamps,
            CreatedAt = p.CreatedAt
        }).ToList(),
        // Legacy: first active program for backward compat
        LoyaltyProgram = b.LoyaltyPrograms.FirstOrDefault(p => p.IsActive) is LoyaltyProgram ap ? new LoyaltyProgramResponse
        {
            Id = ap.Id,
            BusinessId = ap.BusinessId,
            Name = ap.Name,
            IsActive = ap.IsActive,
            StampsRequired = ap.StampsRequired,
            RewardValue = ap.RewardValue,
            RewardDescription = ap.RewardDescription,
            RewardExpirationHours = ap.RewardExpirationHours,
            DefaultEnrollmentStamps = ap.DefaultEnrollmentStamps,
            CreatedAt = ap.CreatedAt
        } : null,
        HasReferralProgram = b.ReferralProgram != null && b.ReferralProgram.IsActive
    };

    public async Task<ApiResponse<BusinessDashboardResponse>> GetDashboardAsync(Guid ownerId)
    {
        try
        {
            var business = await _context.Businesses
                .Include(b => b.LoyaltyPrograms)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.OwnerId == ownerId);

            if (business == null)
                return ApiResponse<BusinessDashboardResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var businessId = business.Id;
            var todayUtc = DateTime.UtcNow.Date;
            var activeProgram = business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);

            // Combined conditional aggregates — fewer DB round trips (5 counts → 3 queries)
            var cardStats = await _context.LoyaltyCards
                .Where(c => c.BusinessId == businessId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    ActiveCards = g.Count(),
                    RewardReadyCards = activeProgram == null ? 0 : g.Count(c => c.TotalStamps >= activeProgram.StampsRequired)
                })
                .SingleOrDefaultAsync();

            var stampStats = await _context.Stamps
                .Where(s => s.Card.BusinessId == businessId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalStamps = g.Count(),
                    StampsToday = g.Count(s => s.StampedAt >= todayUtc)
                })
                .SingleOrDefaultAsync();

            var totalRedemptions = await _context.Redemptions.CountAsync(r => r.BusinessId == businessId);

            // ── Staff mini cards ("Your team") — today's scan stamps, effective goal, on-shift ──
            var staffUsers = await _context.Users
                .Where(u => u.StaffBusinessId == businessId)
                .AsNoTracking()
                .ToListAsync();

            var today = DateOnly.FromDateTime(todayUtc);
            var stampsTodayByStaff = await _context.Stamps
                .Where(s => s.Card.BusinessId == businessId
                    && s.AwardedByUserId != null
                    && s.Source != StampSource.Enrollment
                    && s.StampedAt >= todayUtc)
                .GroupBy(s => s.AwardedByUserId!.Value)
                .Select(g => new { StaffUserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.StaffUserId, x => x.Count);

            var onShiftStaff = (await _context.StaffShifts
                .Where(s => s.BusinessId == businessId && s.Date == today && s.IsWorking)
                .Select(s => s.StaffUserId)
                .ToListAsync())
                .ToHashSet();

            var defaultGoal = business.DefaultDailyGoal;
            var staffMini = staffUsers.Select(u => new StaffMiniDto
            {
                UserId = u.Id,
                FullName = u.FullName,
                AvatarUrl = u.AvatarUrl,
                StampsToday = stampsTodayByStaff.GetValueOrDefault(u.Id, 0),
                DailyGoal = u.DailyGoalOverride ?? defaultGoal ?? 0,
                IsOnShift = onShiftStaff.Contains(u.Id)
            }).ToList();

            return ApiResponse<BusinessDashboardResponse>.Ok(new BusinessDashboardResponse
            {
                BusinessId = business.Id,
                BusinessName = business.Name,
                ActiveCards = cardStats?.ActiveCards ?? 0,
                TotalStampsIssued = stampStats?.TotalStamps ?? 0,
                StampsToday = stampStats?.StampsToday ?? 0,
                TotalRedemptions = totalRedemptions,
                RewardReadyCards = cardStats?.RewardReadyCards ?? 0,
                StaffMini = staffMini
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard for owner {OwnerId}", ownerId);
            return ApiResponse<BusinessDashboardResponse>.Fail("DASHBOARD_FAILED", "Failed to load dashboard.");
        }
    }

    public async Task<ApiResponse<StaffBusinessResponse>> GetStaffBusinessAsync(Guid staffUserId)
    {
        try
        {
            var user = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Id == staffUserId);
            if (user == null || user.StaffBusinessId == null)
                return ApiResponse<StaffBusinessResponse>.Fail("NOT_LINKED", "You are not linked to any business. Ask a business owner to add you.");

            var business = await _unitOfWork.Businesses.GetByIdAsync(user.StaffBusinessId.Value);
            if (business == null)
                return ApiResponse<StaffBusinessResponse>.Fail("NOT_FOUND", "Linked business not found.");

            return ApiResponse<StaffBusinessResponse>.Ok(new StaffBusinessResponse
            {
                BusinessId = business.Id,
                BusinessName = business.Name
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff business for user {UserId}", staffUserId);
            return ApiResponse<StaffBusinessResponse>.Fail("FETCH_FAILED", "Failed to load business info.");
        }
    }

    public async Task<ApiResponse<StaffAnalyticsResponse>> GetStaffAnalyticsAsync(Guid staffUserId)
    {
        try
        {
            var user = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Id == staffUserId);
            if (user == null || user.StaffBusinessId == null)
                return ApiResponse<StaffAnalyticsResponse>.Fail("NOT_LINKED", "You are not linked to any business.");

            var business = await _context.Businesses
                .AsNoTracking()
                .Include(b => b.LoyaltyPrograms)
                .FirstOrDefaultAsync(b => b.Id == user.StaffBusinessId.Value);

            if (business == null)
                return ApiResponse<StaffAnalyticsResponse>.Fail("NOT_FOUND", "Linked business not found.");

            var todayUtc = DateTime.UtcNow.Date;
            var weekStart = todayUtc.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var businessId = business.Id;

            // Single conditional aggregate replaces five separate stamp COUNT queries.
            // All queries scoped to this specific staff member's awarded stamps.
            var stats = await _context.Stamps
                .Where(s => s.AwardedByUserId == staffUserId && s.Card.BusinessId == businessId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalStamps = g.Count(),
                    StampsToday = g.Count(s => s.StampedAt >= todayUtc),
                    StampsThisWeek = g.Count(s => s.StampedAt >= weekStart),
                    StampsThisMonth = g.Count(s => s.StampedAt >= monthStart),
                    TotalCustomers = g.Select(s => s.Card.CustomerId).Distinct().Count()
                })
                .SingleOrDefaultAsync();

            var stampsToday = stats?.StampsToday ?? 0;
            var stampsThisWeek = stats?.StampsThisWeek ?? 0;
            var stampsThisMonth = stats?.StampsThisMonth ?? 0;
            var totalStamps = stats?.TotalStamps ?? 0;
            var totalCustomers = stats?.TotalCustomers ?? 0;

            var activeProgram = business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);
            // Reward-ready count: customers whose cards were stamped by this staff and are now reward-ready
            var rewardReadyCount = activeProgram == null ? 0 :
                await _context.Stamps
                    .Where(s => s.AwardedByUserId == staffUserId && s.Card.BusinessId == businessId)
                    .Select(s => s.CardId)
                    .Distinct()
                    .Join(_context.LoyaltyCards.Where(c => c.TotalStamps >= activeProgram.StampsRequired),
                          cardId => cardId,
                          card => card.Id,
                          (_, __) => 1)
                    .CountAsync();

            var recentStamps = await _context.Stamps
                .Include(s => s.Card)
                    .ThenInclude(c => c.Customer)
                .Where(s => s.AwardedByUserId == staffUserId)
                .Where(s => s.Card.BusinessId == businessId)
                .OrderByDescending(s => s.StampedAt)
                .Take(20)
                .Select(s => new StaffActivityItem
                {
                    ActivityId = s.Id,
                    ActivityType = "stamp",
                    CustomerId = s.Card.CustomerId,
                    CustomerName = s.Card.Customer.FullName,
                    StampNumber = s.StampNumber,
                    Status = "completed",
                    StampedAt = s.StampedAt
                })
                .ToListAsync();

            return ApiResponse<StaffAnalyticsResponse>.Ok(new StaffAnalyticsResponse
            {
                BusinessId = business.Id,
                BusinessName = business.Name,
                StaffName = user.FullName,
                StampsToday = stampsToday,
                StampsThisWeek = stampsThisWeek,
                StampsThisMonth = stampsThisMonth,
                TotalStamps = totalStamps,
                TotalCustomers = totalCustomers,
                RewardReadyCount = rewardReadyCount,
                DailyGoal = user.DailyGoalOverride ?? business.DefaultDailyGoal,
                RecentActivity = recentStamps
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff analytics for user {UserId}", staffUserId);
            return ApiResponse<StaffAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load analytics.");
        }
    }

    public async Task<ApiResponse<StaffListResponse>> GetMyStaffAsync(
        Guid ownerId,
        string? search = null,
        string? status = null,
        string? activity = null,
        string? goalStatus = null,
        string sortBy = "name",
        string sortDirection = "asc",
        int page = 1,
        int pageSize = 20)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<StaffListResponse>.Fail("NOT_FOUND", "No business found for this account.");

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Users
            .Where(u => u.StaffBusinessId == business.Id && !u.IsDeleted)
            .AsNoTracking();

        // DB-level search across name and email.
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.FullName, pattern) ||
                EF.Functions.ILike(u.Email, pattern));
        }

        // Single projection with correlated aggregates — composed into one SQL
        // statement together with filtering, sorting and paging below.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = today.AddDays(-6);
        var projected = query.Select(u => new StaffMemberResponse
        {
            UserId = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            AvatarUrl = u.AvatarUrl,
            DailyGoalOverride = u.DailyGoalOverride,
            DailyGoal = u.DailyGoalOverride ?? business.DefaultDailyGoal,
            StampsIssued = _context.Stamps.Count(s => s.AwardedByUserId == u.Id && s.Card.BusinessId == business.Id),
            StampsToday = _context.StaffDailyAnalytics
                .Where(a => a.StaffUserId == u.Id && a.BusinessId == business.Id && a.Date == today)
                .Sum(a => (int?)a.Stamps) ?? 0,
            StampsLast7d = _context.StaffDailyAnalytics
                .Where(a => a.StaffUserId == u.Id && a.BusinessId == business.Id && a.Date >= weekStart)
                .Sum(a => (int?)a.Stamps) ?? 0,
            LastActivityAt = _context.Stamps
                .Where(s => s.AwardedByUserId == u.Id && s.Card.BusinessId == business.Id)
                .Max(s => (DateTime?)s.StampedAt),
        });

        return await ProjectStaffListAsync(projected, status, activity, goalStatus, sortBy, sortDirection, page, pageSize);
    }

    private async Task<ApiResponse<StaffListResponse>> ProjectStaffListAsync(
        IQueryable<StaffMemberResponse> projected,
        string? status, string? activity, string? goalStatus,
        string sortBy, string sortDirection, int page, int pageSize)
    {
        // Status / activity / goal filters operate on computed values (still DB-side).
        var normalizedStatus = status?.Trim().ToLowerInvariant();
        if (normalizedStatus == "active")
            projected = projected.Where(s => s.StampsLast7d > 0);
        else if (normalizedStatus == "inactive")
            projected = projected.Where(s => s.StampsLast7d == 0);

        // `activity` is an alias kept for API compatibility: today | week | idle.
        var normalizedActivity = activity?.Trim().ToLowerInvariant();
        if (normalizedActivity == "today")
            projected = projected.Where(s => s.StampsToday > 0);
        else if (normalizedActivity is "week" or "active")
            projected = projected.Where(s => s.StampsLast7d > 0);
        else if (normalizedActivity == "idle")
            projected = projected.Where(s => s.StampsLast7d == 0);

        var normalizedGoal = goalStatus?.Trim().ToLowerInvariant();
        if (normalizedGoal == "met")
            projected = projected.Where(s => s.DailyGoal != null && s.StampsToday >= s.DailyGoal);
        else if (normalizedGoal == "behind")
            projected = projected.Where(s => s.DailyGoal != null && s.StampsToday < s.DailyGoal);
        else if (normalizedGoal == "none")
            projected = projected.Where(s => s.DailyGoal == null);

        // Server-side sorting.
        var descending = sortDirection?.Trim().ToLowerInvariant() == "desc";
        projected = (sortBy?.Trim().ToLowerInvariant(), descending) switch
        {
            ("name", true) => projected.OrderByDescending(s => s.FullName),
            ("stamps", true) => projected.OrderByDescending(s => s.StampsIssued),
            ("stamps", false) => projected.OrderBy(s => s.StampsIssued),
            ("recent", false) => projected.OrderBy(s => s.LastActivityAt ?? DateTime.MinValue),
            ("recent", true) => projected.OrderByDescending(s => s.LastActivityAt ?? DateTime.MinValue),
            ("goal", true) => projected.OrderByDescending(s => s.DailyGoal == null ? 0m : Math.Min(1m * s.StampsToday / s.DailyGoal.Value, 2m)),
            ("goal", false) => projected.OrderBy(s => s.DailyGoal == null ? 0m : Math.Min(1m * s.StampsToday / s.DailyGoal.Value, 2m)),
            ("added", true) => projected.OrderByDescending(s => s.UserId),
            _ => descending ? projected.OrderByDescending(s => s.FullName) : projected.OrderBy(s => s.FullName),
        };

        var total = await projected.CountAsync();

        var items = await projected
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return ApiResponse<StaffListResponse>.Ok(new StaffListResponse
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize),
        });
    }

    public async Task<ApiResponse<StaffOverviewResponse>> GetStaffOverviewAsync(Guid ownerId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<StaffOverviewResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = today.AddDays(-6);

        // Single aggregate query over the business's staff — no N+1.
        var staff = await _context.Users
            .Where(u => u.StaffBusinessId == business.Id && !u.IsDeleted)
            .AsNoTracking()
            .Select(u => new StaffMemberResponse
            {
                UserId = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                AvatarUrl = u.AvatarUrl,
                DailyGoalOverride = u.DailyGoalOverride,
                DailyGoal = u.DailyGoalOverride ?? business.DefaultDailyGoal,
                StampsIssued = _context.Stamps.Count(s => s.AwardedByUserId == u.Id && s.Card.BusinessId == business.Id),
                StampsToday = _context.StaffDailyAnalytics
                    .Where(a => a.StaffUserId == u.Id && a.BusinessId == business.Id && a.Date == today)
                    .Sum(a => (int?)a.Stamps) ?? 0,
                StampsLast7d = _context.StaffDailyAnalytics
                    .Where(a => a.StaffUserId == u.Id && a.BusinessId == business.Id && a.Date >= weekStart)
                    .Sum(a => (int?)a.Stamps) ?? 0,
                LastActivityAt = _context.Stamps
                    .Where(s => s.AwardedByUserId == u.Id && s.Card.BusinessId == business.Id)
                    .Max(s => (DateTime?)s.StampedAt),
            })
            .ToListAsync();

        var pendingInvitations = await _context.StaffInvitations
            .CountAsync(i => i.BusinessId == business.Id && i.Status == InvitationStatus.Pending);

        return ApiResponse<StaffOverviewResponse>.Ok(new StaffOverviewResponse
        {
            TotalStaff = staff.Count,
            ActiveStaff7d = staff.Count(s => s.StampsLast7d > 0),
            InactiveStaff = staff.Count(s => s.StampsLast7d == 0),
            PendingInvitations = pendingInvitations,
            StampsToday = staff.Sum(s => s.StampsToday),
            StampsThisWeek = staff.Sum(s => s.StampsLast7d),
            GoalsMetToday = staff.Count(s => s.DailyGoal.HasValue && s.StampsToday >= s.DailyGoal.Value),
            StaffWithGoals = staff.Count(s => s.DailyGoal.HasValue),
            TopPerformers = staff
                .Where(s => s.StampsLast7d > 0)
                .OrderByDescending(s => s.StampsLast7d)
                .ThenByDescending(s => s.StampsToday)
                .Take(5)
                .ToList(),
            NeedsAttention = staff
                .Where(s => s.DailyGoal.HasValue && s.LastActivityAt != null && s.StampsToday < s.DailyGoal.Value)
                .OrderBy(s => s.StampsToday)
                .Take(5)
                .ToList(),
            RecentlyActive = staff
                .Where(s => s.LastActivityAt != null)
                .OrderByDescending(s => s.LastActivityAt)
                .Take(5)
                .ToList(),
        });
    }

    public async Task<ApiResponse<BusinessResponse>> SetBusinessDailyGoalAsync(Guid ownerId, int? dailyGoal)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<BusinessResponse>.Fail("NOT_FOUND", "No business found for this account.");

        business.DefaultDailyGoal = dailyGoal.HasValue ? Math.Clamp(dailyGoal.Value, 1, 1000) : null;
        _unitOfWork.Businesses.Update(business);
        await _unitOfWork.SaveChangesAsync();
        return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
    }

    public async Task<ApiResponse<StaffMemberResponse>> SetStaffDailyGoalAsync(Guid ownerId, Guid staffUserId, int? dailyGoal)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<StaffMemberResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var staffUser = await _unitOfWork.Users.FirstOrDefaultAsync(
            u => u.Id == staffUserId && u.StaffBusinessId == business.Id);
        if (staffUser == null)
            return ApiResponse<StaffMemberResponse>.Fail("NOT_FOUND", "Staff member not found in your business.");

        staffUser.DailyGoalOverride = dailyGoal.HasValue ? Math.Clamp(dailyGoal.Value, 1, 1000) : null;
        _unitOfWork.Users.Update(staffUser);
        await _unitOfWork.SaveChangesAsync();

        var stampsIssued = await _context.Stamps.CountAsync(s => s.AwardedByUserId == staffUser.Id && s.Card.BusinessId == business.Id);
        return ApiResponse<StaffMemberResponse>.Ok(new StaffMemberResponse
        {
            UserId = staffUser.Id,
            FullName = staffUser.FullName,
            Email = staffUser.Email,
            AvatarUrl = staffUser.AvatarUrl,
            StampsIssued = stampsIssued,
            DailyGoalOverride = staffUser.DailyGoalOverride,
            DailyGoal = staffUser.DailyGoalOverride ?? business.DefaultDailyGoal
        });
    }

    public async Task<ApiResponse<MessageResponse>> LinkStaffToBusinessAsync(Guid ownerId, Guid staffUserId)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var staffUser = await _unitOfWork.Users.GetByIdAsync(staffUserId);
            if (staffUser == null)
                return ApiResponse<MessageResponse>.Fail("STAFF_NOT_FOUND", "Staff user not found.");

            if (staffUser.Role != Domain.Entities.UserRole.Staff)
                return ApiResponse<MessageResponse>.Fail("NOT_STAFF", "User is not a staff member.");

            staffUser.StaffBusinessId = business.Id;
            _unitOfWork.Users.Update(staffUser);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Staff {StaffId} linked to business {BusinessId}", staffUserId, business.Id);

            return ApiResponse<MessageResponse>.Ok(new MessageResponse
            {
                Message = $"{staffUser.FullName} has been linked to {business.Name}."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error linking staff {StaffId} to business for owner {OwnerId}", staffUserId, ownerId);
            return ApiResponse<MessageResponse>.Fail("LINK_FAILED", "Failed to link staff member.");
        }
    }

    public async Task<ApiResponse<StaffMemberAnalyticsResponse>> GetStaffMemberAnalyticsAsync(
        Guid ownerId, Guid staffUserId, string period)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<StaffMemberAnalyticsResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var staffUser = await _unitOfWork.Users.FirstOrDefaultAsync(
                u => u.Id == staffUserId && u.StaffBusinessId == business.Id);
            if (staffUser == null)
                return ApiResponse<StaffMemberAnalyticsResponse>.Fail("NOT_FOUND", "Staff member not found in your business.");

            var now = DateTime.UtcNow;
            var periodStart = period switch
            {
                "today" => now.Date,
                "7d"    => now.AddDays(-7),
                "30d"   => now.AddDays(-30),
                _       => DateTime.MinValue  // "all"
            };

            var baseQuery = _context.Stamps
                .Where(s => s.AwardedByUserId == staffUserId && s.Card.BusinessId == business.Id);

            var periodQuery = baseQuery.Where(s => s.StampedAt >= periodStart);

            var stampsIssued     = await periodQuery.CountAsync();
            var customersServed  = await periodQuery.Select(s => s.Card.CustomerId).Distinct().CountAsync();
            var totalStampsAllTime     = await baseQuery.CountAsync();
            var totalCustomersAllTime  = await baseQuery.Select(s => s.Card.CustomerId).Distinct().CountAsync();

            var recentActivity = await _context.Stamps
                .Include(s => s.Card).ThenInclude(c => c.Customer)
                .Where(s => s.AwardedByUserId == staffUserId && s.Card.BusinessId == business.Id)
                .OrderByDescending(s => s.StampedAt)
                .Take(20)
                .Select(s => new StaffActivityItem
                {
                    ActivityId = s.Id,
                    ActivityType = "stamp",
                    CustomerId = s.Card.CustomerId,
                    CustomerName = s.Card.Customer.FullName,
                    StampNumber  = s.StampNumber,
                    Status = "completed",
                    StampedAt    = s.StampedAt,
                })
                .ToListAsync();

            return ApiResponse<StaffMemberAnalyticsResponse>.Ok(new StaffMemberAnalyticsResponse
            {
                StaffId              = staffUserId,
                FullName             = staffUser.FullName,
                Email                = staffUser.Email,
                AvatarUrl            = staffUser.AvatarUrl,
                Period               = period,
                StampsIssued         = stampsIssued,
                CustomersServed      = customersServed,
                TotalStampsAllTime   = totalStampsAllTime,
                TotalCustomersAllTime = totalCustomersAllTime,
                DailyGoal            = staffUser.DailyGoalOverride ?? business.DefaultDailyGoal,
                DailyGoalOverride    = staffUser.DailyGoalOverride,
                RecentActivity       = recentActivity,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff member analytics for {StaffId}", staffUserId);
            return ApiResponse<StaffMemberAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load staff analytics.");
        }
    }

    public async Task<ApiResponse<StaffActivityFeedResponse>> GetStaffActivityForOwnerAsync(
        Guid ownerId,
        Guid staffUserId,
        StaffActivityFilterRequest request)
    {
        try
        {
            var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(ownerId);
            if (businessId == null)
                return ApiResponse<StaffActivityFeedResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var staffUser = await _unitOfWork.Users.FirstOrDefaultAsync(
                u => u.Id == staffUserId && u.StaffBusinessId == businessId);
            if (staffUser == null)
                return ApiResponse<StaffActivityFeedResponse>.Fail("NOT_FOUND", "Staff member not found in your business.");

            return await BuildStaffActivityFeedAsync(businessId.Value, staffUser, request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting owner-view staff activity for staff {StaffUserId}", staffUserId);
            return ApiResponse<StaffActivityFeedResponse>.Fail("ACTIVITY_FAILED", "Failed to load staff activity.");
        }
    }

    public async Task<ApiResponse<StaffActivityFeedResponse>> GetMyStaffActivityAsync(
        Guid staffUserId,
        StaffActivityFilterRequest request)
    {
        try
        {
            var staffUser = await _unitOfWork.Users.FirstOrDefaultAsync(
                u => u.Id == staffUserId && u.Role == UserRole.Staff);

            if (staffUser == null || staffUser.StaffBusinessId == null)
                return ApiResponse<StaffActivityFeedResponse>.Fail("NOT_LINKED", "You are not linked to any business.");

            return await BuildStaffActivityFeedAsync(staffUser.StaffBusinessId.Value, staffUser, request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting self staff activity for user {StaffUserId}", staffUserId);
            return ApiResponse<StaffActivityFeedResponse>.Fail("ACTIVITY_FAILED", "Failed to load your activity.");
        }
    }

    private async Task<ApiResponse<StaffActivityFeedResponse>> BuildStaffActivityFeedAsync(
        Guid businessId,
        User staffUser,
        StaffActivityFilterRequest request)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var activityType = request.ActivityType?.Trim().ToLowerInvariant();
        var includeStamps = string.IsNullOrWhiteSpace(activityType) || activityType == "all" || activityType == "stamp" || activityType == "scan";
        var includeRedemptions = string.IsNullOrWhiteSpace(activityType) || activityType == "all" || activityType == "redemption";
        var normalizedStatus = request.Status?.Trim().ToLowerInvariant();

        var stampQuery = _context.Stamps
            .Include(s => s.Card)
                .ThenInclude(c => c.Customer)
            .Where(s => s.AwardedByUserId == staffUser.Id && s.Card.BusinessId == businessId)
            .AsQueryable();

        var redemptionQuery = _context.Redemptions
            .Include(r => r.Card)
                .ThenInclude(c => c.Customer)
            .Where(r => r.PerformedByUserId == staffUser.Id && r.BusinessId == businessId)
            .AsQueryable();

        if (request.CustomerId.HasValue)
        {
            stampQuery = stampQuery.Where(s => s.Card.CustomerId == request.CustomerId.Value);
            redemptionQuery = redemptionQuery.Where(r => r.Card.CustomerId == request.CustomerId.Value);
        }

        if (request.From.HasValue)
        {
            stampQuery = stampQuery.Where(s => s.StampedAt >= request.From.Value);
            redemptionQuery = redemptionQuery.Where(r => r.RedeemedAt >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            stampQuery = stampQuery.Where(s => s.StampedAt <= request.To.Value);
            redemptionQuery = redemptionQuery.Where(r => r.RedeemedAt <= request.To.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedStatus))
        {
            redemptionQuery = redemptionQuery.Where(r => r.Status.ToLower() == normalizedStatus);
            if (normalizedStatus != "completed")
            {
                includeStamps = false;
            }
        }

        var activity = new List<StaffActivityItem>();

        // Totals are computed DB-side (COUNT / DISTINCT aggregates) — never by
        // materialising the whole history.
        var stampTotal = includeStamps ? await stampQuery.CountAsync() : 0;
        var redemptionTotal = includeRedemptions ? await redemptionQuery.CountAsync() : 0;

        int? stampCustomers = null;
        if (includeStamps)
            stampCustomers = await stampQuery.Select(s => s.Card.CustomerId).Distinct().CountAsync();
        int? redemptionCustomers = null;
        if (includeRedemptions)
            redemptionCustomers = await redemptionQuery.Select(r => r.Card.CustomerId).Distinct().CountAsync();

        // Bounded fetch: each source only yields up to page*pageSize newest rows;
        // the merged page slice is taken in memory from that bounded set.
        var fetchBound = page * pageSize;

        if (includeStamps)
        {
            var stamps = await stampQuery
                .OrderByDescending(s => s.StampedAt)
                .Take(fetchBound)
                .Select(s => new StaffActivityItem
                {
                    ActivityId = s.Id,
                    ActivityType = "stamp",
                    CustomerId = s.Card.CustomerId,
                    CustomerName = s.Card.Customer.FullName,
                    StampNumber = s.StampNumber,
                    Status = "completed",
                    StampedAt = s.StampedAt
                })
                .ToListAsync();

            activity.AddRange(stamps);
        }

        if (includeRedemptions)
        {
            var redemptions = await redemptionQuery
                .OrderByDescending(r => r.RedeemedAt)
                .Take(fetchBound)
                .Select(r => new StaffActivityItem
                {
                    ActivityId = r.Id,
                    ActivityType = "redemption",
                    CustomerId = r.Card.CustomerId,
                    CustomerName = r.Card.Customer.FullName,
                    StampNumber = 0,
                    Status = r.Status,
                    RewardValue = r.RewardValue,
                    StampedAt = r.RedeemedAt
                })
                .ToListAsync();

            activity.AddRange(redemptions);
        }

        var ordered = activity.OrderByDescending(a => a.StampedAt).ToList();
        var total = stampTotal + redemptionTotal;
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var customersServed = Math.Max(stampCustomers ?? 0, redemptionCustomers ?? 0);

        var summary = new StaffActivitySummaryResponse
        {
            TotalScans = stampTotal,
            TotalStamps = stampTotal,
            TotalRedemptions = redemptionTotal,
            CustomersServed = customersServed,
            TotalActivities = total
        };

        return ApiResponse<StaffActivityFeedResponse>.Ok(new StaffActivityFeedResponse
        {
            Staff = new StaffIdentityResponse
            {
                Id = staffUser.Id,
                Name = staffUser.FullName,
                Email = staffUser.Email
            },
            Summary = summary,
            Activity = paged,
            Page = page,
            PageSize = pageSize,
            Total = total
        });
    }

    public async Task<ApiResponse<CustomerPeriodStatsResponse>> GetCustomerPeriodStatsAsync(
        Guid ownerId, Guid customerId, string period)
    {
        try
        {
            var businessId = await _businessScopeResolver.GetOwnedBusinessIdAsync(ownerId);
            if (businessId == null)
                return ApiResponse<CustomerPeriodStatsResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var card = await _context.LoyaltyCards
                .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.BusinessId == businessId);
            if (card == null)
                return ApiResponse<CustomerPeriodStatsResponse>.Fail("NOT_FOUND", "Customer not enrolled in this business.");

            var now = DateTime.UtcNow;
            var periodStart = period switch
            {
                "today" => now.Date,
                "7d"    => now.AddDays(-7),
                "30d"   => now.AddDays(-30),
                _       => DateTime.MinValue  // "all"
            };

            var stampsInPeriod = await _context.Stamps
                .CountAsync(s => s.CardId == card.Id && s.StampedAt >= periodStart);

            var lastVisitInPeriod = await _context.Stamps
                .Where(s => s.CardId == card.Id && s.StampedAt >= periodStart)
                .OrderByDescending(s => s.StampedAt)
                .Select(s => (DateTime?)s.StampedAt)
                .FirstOrDefaultAsync();

            return ApiResponse<CustomerPeriodStatsResponse>.Ok(new CustomerPeriodStatsResponse
            {
                Period            = period,
                StampsInPeriod    = stampsInPeriod,
                VisitsInPeriod    = stampsInPeriod,   // each stamp = 1 QR scan visit
                LastVisitInPeriod = lastVisitInPeriod,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting customer period stats for {CustomerId}", customerId);
            return ApiResponse<CustomerPeriodStatsResponse>.Fail("STATS_FAILED", "Failed to load customer stats.");
        }
    }

    public async Task<ApiResponse<BusinessAnalyticsResponse>> GetBusinessAnalyticsAsync(Guid ownerId, string period)
    {
        try
        {
            var business = await _context.Businesses
                .Include(b => b.LoyaltyPrograms)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.OwnerId == ownerId);

            if (business == null)
                return ApiResponse<BusinessAnalyticsResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var businessId = business.Id;
            var now = DateTime.UtcNow;
            var periodStart = period switch
            {
                "7d" => now.AddDays(-7),
                "30d" => now.AddDays(-30),
                "90d" => now.AddDays(-90),
                _ => now.AddDays(-30)
            };

            // Base queries (no materialization — these stay as IQueryable)
            var stampsQuery = _context.Stamps
                .Where(s => s.Card.BusinessId == businessId && s.StampedAt >= periodStart);
            var redemptionsQuery = _context.Redemptions
                .Where(r => r.BusinessId == businessId && r.RedeemedAt >= periodStart);

            // ── Sequential queries — DbContext is NOT thread-safe ──

            // 1. Hourly activity — aggregated in SQL
            var stampsByHour = await stampsQuery
                .GroupBy(s => s.StampedAt.Hour)
                .Select(g => new { Hour = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Hour, x => x.Count);

            var redemptionsByHour = await redemptionsQuery
                .GroupBy(r => r.RedeemedAt.Hour)
                .Select(g => new { Hour = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Hour, x => x.Count);

            // 2. Weekly heatmap — aggregated in SQL
            var heatmapRaw = await stampsQuery
                .Select(s => new { DayOfWeek = (int)s.StampedAt.DayOfWeek, s.StampedAt.Hour })
                .GroupBy(s => new { s.DayOfWeek, s.Hour })
                .Select(g => new { g.Key.DayOfWeek, g.Key.Hour, Count = g.Count() })
                .ToListAsync();

            // 3. Customer demographics — project only needed columns
            var customerDemographics = await _context.LoyaltyCards
                .Where(c => c.BusinessId == businessId)
                .Select(c => new { c.Customer.Id, c.Customer.Gender, c.Customer.DateOfBirth })
                .Distinct()
                .ToListAsync();

            // 4. Engagement trends — daily stamp/redemption/enrollment counts in SQL
            var dailyStamps = await stampsQuery
                .GroupBy(s => s.StampedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Date, x => x.Count);

            var dailyRedemptions = await redemptionsQuery
                .GroupBy(r => r.RedeemedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Date, x => x.Count);

            var dailyEnrollments = await _context.LoyaltyCards
                .Where(c => c.BusinessId == businessId && c.EnrolledAt >= periodStart)
                .GroupBy(c => c.EnrolledAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Date, x => x.Count);

            // 5. Card summary data for funnel, growth, retention, top customers
            var cardSummaries = await _context.LoyaltyCards
                .Where(c => c.BusinessId == businessId)
                .Select(c => new
                {
                    c.Id, c.CustomerId, c.ProgramId, c.TotalStamps, c.LifetimeStamps,
                    c.TotalRedemptions, c.LastStampAt, c.EnrolledAt,
                    CustomerName = c.Customer.FullName
                })
                .AsNoTracking()
                .ToListAsync();

            // 6. Staff performance — aggregated in SQL
            var staffStampStats = await stampsQuery
                .Where(s => s.AwardedByUserId != null)
                .GroupBy(s => s.AwardedByUserId!.Value)
                .Select(g => new
                {
                    StaffId = g.Key,
                    StampsIssued = g.Count(),
                    CustomersServed = g.Select(s => s.CardId).Distinct().Count()
                })
                .ToListAsync();

            var staffUsers = await _context.Users
                .Where(u => u.StaffBusinessId == businessId || u.Id == ownerId)
                .Select(u => new { u.Id, u.FullName })
                .AsNoTracking()
                .ToDictionaryAsync(u => u.Id, u => u.FullName);

            // ── Assemble results from pre-aggregated data ──

            // 1. Hourly activity
            var hourlyActivity = Enumerable.Range(0, 24).Select(h => new HourlyActivityPoint
            {
                Hour = h,
                Stamps = stampsByHour.GetValueOrDefault(h, 0),
                Redemptions = redemptionsByHour.GetValueOrDefault(h, 0)
            }).ToList();

            // 2. Weekly heatmap
            var heatmapLookup = heatmapRaw.ToDictionary(
                x => (Day: ((x.DayOfWeek + 6) % 7), x.Hour), x => x.Count);
            var heatmap = new List<HeatmapCell>();
            for (int d = 0; d < 7; d++)
                for (int h = 0; h < 24; h++)
                    heatmap.Add(new HeatmapCell
                    {
                        Day = d,
                        Hour = h,
                        Value = heatmapLookup.GetValueOrDefault((d, h), 0)
                    });

            // 3. Customer demographics
            var genderBreakdown = customerDemographics
                .GroupBy(c => string.IsNullOrWhiteSpace(c.Gender) ? "Unknown" : c.Gender)
                .Select(g => new DemographicSlice { Label = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .ToList();

            var today = DateOnly.FromDateTime(now);
            var ageBreakdown = customerDemographics
                .Select(c =>
                {
                    if (c.DateOfBirth == null) return "Unknown";
                    var age = today.Year - c.DateOfBirth.Value.Year;
                    if (today < c.DateOfBirth.Value.AddYears(age)) age--;
                    return age switch
                    {
                        < 18 => "Under 18",
                        < 25 => "18-24",
                        < 35 => "25-34",
                        < 45 => "35-44",
                        < 55 => "45-54",
                        _ => "55+"
                    };
                })
                .GroupBy(a => a)
                .Select(g => new DemographicSlice { Label = g.Key, Count = g.Count() })
                .OrderBy(g => g.Label)
                .ToList();

            // 4. Engagement trends
            var days = (int)(now - periodStart).TotalDays;
            var engagementTrends = Enumerable.Range(0, days + 1).Select(i =>
            {
                var date = periodStart.AddDays(i).Date;
                return new EngagementTrendPoint
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    Stamps = dailyStamps.GetValueOrDefault(date, 0),
                    Redemptions = dailyRedemptions.GetValueOrDefault(date, 0),
                    Enrollments = dailyEnrollments.GetValueOrDefault(date, 0)
                };
            }).ToList();

            // 5. Customer growth (cumulative)
            var prePeriodCount = cardSummaries.Count(c => c.EnrolledAt < periodStart);
            var growthData = new List<GrowthPoint>();
            var running = prePeriodCount;
            for (int i = 0; i <= days; i++)
            {
                var date = periodStart.AddDays(i).Date;
                var newCount = dailyEnrollments.GetValueOrDefault(date, 0);
                running += newCount;
                growthData.Add(new GrowthPoint { Date = date.ToString("yyyy-MM-dd"), Total = running, NewCount = newCount });
            }

            // 7. Retention summary
            var thirtyDaysAgo = now.AddDays(-30);
            var returningCustomers = cardSummaries.Count(c => c.LastStampAt != null && c.LastStampAt >= thirtyDaysAgo && c.EnrolledAt < thirtyDaysAgo);
            var newCustomers = cardSummaries.Count(c => c.EnrolledAt >= thirtyDaysAgo);
            var dormantCustomers = cardSummaries.Count(c => c.LastStampAt == null || c.LastStampAt < thirtyDaysAgo);
            var totalActive = returningCustomers + newCustomers;
            var retention = new RetentionSummary
            {
                NewCustomers = newCustomers,
                ReturningCustomers = returningCustomers,
                DormantCustomers = dormantCustomers,
                RetentionRate = cardSummaries.Count > 0 ? Math.Round((double)totalActive / cardSummaries.Count * 100, 1) : 0
            };

            // 8. Staff performance
            var staffPerformance = staffStampStats
                .Where(ss => staffUsers.ContainsKey(ss.StaffId))
                .Select(ss => new StaffPerformanceItem
                {
                    StaffId = ss.StaffId,
                    Name = staffUsers.GetValueOrDefault(ss.StaffId, "Unknown"),
                    StampsIssued = ss.StampsIssued,
                    CustomersServed = ss.CustomersServed
                })
                .OrderByDescending(s => s.StampsIssued)
                .ToList();

            // 9. Funnel data
            var activeProgram = business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);
            var funnelCompleted = activeProgram != null
                ? cardSummaries.Count(c => c.LifetimeStamps >= activeProgram.StampsRequired) : 0;
            var funnel = new FunnelData
            {
                TotalCustomers = cardSummaries.Count,
                StampedAtLeastOnce = cardSummaries.Count(c => c.LifetimeStamps > 0),
                CompletedCard = funnelCompleted,
                Redeemed = cardSummaries.Count(c => c.TotalRedemptions > 0),
                RepeatRedeemer = cardSummaries.Count(c => c.TotalRedemptions > 1),
                CompletionRate = cardSummaries.Count > 0 ? Math.Round((double)funnelCompleted / cardSummaries.Count * 100, 1) : 0
            };

            // 10. Top customers
            var topCustomers = cardSummaries
                .OrderByDescending(c => c.LifetimeStamps)
                .Take(10)
                .Select(c => new TopCustomerItem
                {
                    CustomerId = c.CustomerId,
                    Name = c.CustomerName,
                    LifetimeStamps = c.LifetimeStamps,
                    TotalRedemptions = c.TotalRedemptions,
                    LastVisit = c.LastStampAt
                })
                .ToList();

            // 11. Extended analytics (overview, revenue, traffic, program/staff detail, recommendations)
            var cardInsights = cardSummaries.Select(c => new CardInsight
            {
                ProgramId = c.ProgramId,
                TotalStamps = c.TotalStamps,
                LifetimeStamps = c.LifetimeStamps,
                TotalRedemptions = c.TotalRedemptions,
                LastStampAt = c.LastStampAt,
                EnrolledAt = c.EnrolledAt
            }).ToList();
            var staffPeriodStats = staffStampStats.ToDictionary(
                x => x.StaffId, x => (StampsIssued: x.StampsIssued, CustomersServed: x.CustomersServed));
            var totalPeriodStamps = stampsByHour.Values.Sum();
            var redemptionCount = redemptionsByHour.Values.Sum();
            var extended = await BuildExtendedAnalyticsAsync(
                businessId, now, periodStart, activeProgram, business.LoyaltyPrograms.ToList(),
                totalPeriodStamps, stampsByHour, dailyStamps, redemptionCount, cardInsights, staffUsers, staffPeriodStats);

            return ApiResponse<BusinessAnalyticsResponse>.Ok(new BusinessAnalyticsResponse
            {
                HourlyActivity = hourlyActivity,
                WeeklyHeatmap = heatmap,
                GenderBreakdown = genderBreakdown,
                AgeBreakdown = ageBreakdown,
                EngagementTrends = engagementTrends,
                ProgramPerformance = extended.ProgramPerformance,
                CustomerGrowth = growthData,
                Retention = retention,
                StaffPerformance = extended.StaffPerformance,
                Funnel = funnel,
                TopCustomers = topCustomers,
                Period = period,
                Overview = extended.Overview,
                Revenue = extended.Revenue,
                Traffic = extended.Traffic,
                Recommendations = extended.Recommendations
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting business analytics for owner {OwnerId}", ownerId);
            return ApiResponse<BusinessAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load analytics.");
        }
    }

    public async Task<ApiResponse<List<InsightResponse>>> GetBusinessInsightsAsync(Guid ownerId, bool includeDismissed = false)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<InsightResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var insights = await _insightService.GetBusinessInsightsAsync(business.Id, includeDismissed);
        var dto = insights.Select(i => new InsightResponse
        {
            Id = i.Id,
            Audience = i.Audience,
            Category = i.Category,
            Metric = i.Metric,
            Severity = i.Severity,
            Confidence = i.Confidence,
            Title = i.Title,
            Message = i.Message,
            Recommendation = i.Recommendation,
            DataJson = i.DataJson,
            GeneratedAt = i.GeneratedAt,
            ExpiresAt = i.ExpiresAt,
            Dismissed = i.Dismissed
        }).ToList();

        return ApiResponse<List<InsightResponse>>.Ok(dto);
    }

    public async Task<ApiResponse<MessageResponse>> DismissBusinessInsightAsync(Guid ownerId, Guid actorUserId, Guid insightId)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var dismissed = await _insightService.DismissInsightAsync(insightId, actorUserId, business.Id);
        if (!dismissed)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "Insight not found for this business.");

        return ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Insight dismissed." });
    }

    public async Task<ApiResponse<List<CustomerSegmentResponse>>> GetBusinessCustomerSegmentsAsync(Guid ownerId, string? segment = null)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<CustomerSegmentResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var query = _context.CustomerSegments.Where(x => x.BusinessId == business.Id);
        if (!string.IsNullOrWhiteSpace(segment))
        {
            var s = segment.Trim().ToLowerInvariant();
            query = query.Where(x => x.Segment == s);
        }

        var rows = await query
            .OrderByDescending(x => x.Score)
            .ToListAsync();

        return ApiResponse<List<CustomerSegmentResponse>>.Ok(rows.Select(x => new CustomerSegmentResponse
        {
            CustomerId = x.CustomerId,
            Segment = x.Segment,
            Score = x.Score,
            ComputedAt = x.ComputedAt,
            LastStampAt = x.LastStampAt
        }).ToList());
    }

    public async Task<ApiResponse<NotificationAnalyticsResponse>> GetNotificationAnalyticsAsync(Guid ownerId, int days = 30)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<NotificationAnalyticsResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var periodDays = Math.Clamp(days, 1, 365);
        var since = DateTime.UtcNow.AddDays(-periodDays);

        var q = _context.NotificationLogs.Where(n => n.BusinessId == business.Id && n.SentAt >= since);

        var total = await q.CountAsync();
        var sent = await q.CountAsync(n => n.Status == "sent");
        var failed = await q.CountAsync(n => n.Status == "failed");
        var delivered = await q.CountAsync(n => n.Status == "delivered");
        var opened = await q.CountAsync(n => n.Status == "opened");

        return ApiResponse<NotificationAnalyticsResponse>.Ok(new NotificationAnalyticsResponse
        {
            PeriodDays = periodDays,
            Total = total,
            Sent = sent,
            Failed = failed,
            Delivered = delivered,
            Opened = opened
        });
    }

    public async Task<ApiResponse<List<StaffUtilizationResponse>>> GetStaffUtilizationAsync(Guid ownerId, DateOnly? from = null, DateOnly? to = null)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<StaffUtilizationResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var fromDate = from ?? DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var shifts = await _context.StaffShifts
            .Where(s => s.BusinessId == business.Id && s.Date >= fromDate && s.Date <= toDate)
            .ToListAsync();

        var staffIds = shifts.Select(s => s.StaffUserId).Distinct().ToList();
        if (staffIds.Count == 0)
            return ApiResponse<List<StaffUtilizationResponse>>.Ok(new List<StaffUtilizationResponse>());

        var startUtc = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endUtc = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var stampCounts = await _context.Stamps
            .Where(s => s.Card.BusinessId == business.Id && s.AwardedByUserId != null && staffIds.Contains(s.AwardedByUserId.Value)
                && s.StampedAt >= startUtc && s.StampedAt < endUtc)
            .GroupBy(s => s.AwardedByUserId!.Value)
            .Select(g => new { StaffId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.Count);

        var names = await _context.Users
            .Where(u => staffIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var result = shifts
            .GroupBy(s => s.StaffUserId)
            .Select(g =>
            {
                var workingHours = g.Where(x => x.IsWorking).Sum(x => Math.Max(0, x.EndHour - x.StartHour));
                var stamps = stampCounts.GetValueOrDefault(g.Key, 0);
                return new StaffUtilizationResponse
                {
                    StaffUserId = g.Key,
                    StaffName = names.GetValueOrDefault(g.Key, "Unknown"),
                    BusinessId = business.Id,
                    WorkingHours = workingHours,
                    Stamps = stamps,
                    StampsPerHour = workingHours > 0 ? Math.Round((double)stamps / workingHours, 2) : 0
                };
            })
            .OrderByDescending(x => x.StampsPerHour)
            .ToList();

        return ApiResponse<List<StaffUtilizationResponse>>.Ok(result);
    }

    public async Task<ApiResponse<List<StaffShiftResponse>>> GetStaffShiftsAsync(Guid ownerId, Guid staffUserId, DateOnly? from = null, DateOnly? to = null)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<StaffShiftResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var staff = await _context.Users.FirstOrDefaultAsync(u => u.Id == staffUserId && u.StaffBusinessId == business.Id);
        if (staff == null)
            return ApiResponse<List<StaffShiftResponse>>.Fail("NOT_FOUND", "Staff member not found in your business.");

        var fromDate = from ?? DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(30));

        var rows = await _context.StaffShifts
            .Where(s => s.BusinessId == business.Id && s.StaffUserId == staffUserId && s.Date >= fromDate && s.Date <= toDate)
            .OrderBy(s => s.Date)
            .ToListAsync();

        return ApiResponse<List<StaffShiftResponse>>.Ok(rows.Select(s => new StaffShiftResponse
        {
            StaffUserId = s.StaffUserId,
            BusinessId = s.BusinessId,
            Date = s.Date,
            StartHour = s.StartHour,
            EndHour = s.EndHour,
            IsWorking = s.IsWorking
        }).ToList());
    }

    public async Task<ApiResponse<MessageResponse>> UpsertStaffShiftAsync(Guid ownerId, Guid staffUserId, UpsertStaffShiftRequest request)
    {
        var business = await _context.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var staff = await _context.Users.FirstOrDefaultAsync(u => u.Id == staffUserId && u.StaffBusinessId == business.Id);
        if (staff == null)
            return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "Staff member not found in your business.");

        if (request.StartHour < 0 || request.StartHour > 23 || request.EndHour < 0 || request.EndHour > 23)
            return ApiResponse<MessageResponse>.Fail("VALIDATION_ERROR", "startHour and endHour must be in range 0-23.");

        var row = await _context.StaffShifts.FirstOrDefaultAsync(s =>
            s.BusinessId == business.Id &&
            s.StaffUserId == staffUserId &&
            s.Date == request.Date);

        if (row == null)
        {
            row = new StaffShift
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                StaffUserId = staffUserId,
                Date = request.Date,
                StartHour = request.StartHour,
                EndHour = request.EndHour,
                IsWorking = request.IsWorking,
                CreatedAt = DateTime.UtcNow
            };
            await _context.StaffShifts.AddAsync(row);
        }
        else
        {
            row.StartHour = request.StartHour;
            row.EndHour = request.EndHour;
            row.IsWorking = request.IsWorking;
        }

        await _context.SaveChangesAsync();
        return ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Staff shift saved." });
    }

    public async Task<bool> CanAccessBusinessAsync(Guid userId, Guid businessId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return false;

        // Business owner → own business
        if (user.Role == UserRole.Business)
        {
            return await _context.Businesses.AnyAsync(b => b.Id == businessId && b.OwnerId == userId);
        }

        // Staff → linked to the business
        if (user.Role == UserRole.Staff)
        {
            return user.StaffBusinessId == businessId;
        }

        return false;
    }
/// <summary>
    /// Period-over-period comparison scoped strictly to the authenticated owner's business.
    /// The business is derived from <paramref name="ownerId"/> (JWT) — a client-supplied
    /// BusinessId is never trusted.
    /// </summary>
    public async Task<ApiResponse<BusinessAnalyticsComparisonResponse>> GetBusinessAnalyticsComparisonAsync(
        Guid ownerId, string period, string? prev, DateOnly? start, DateOnly? end)
    {
        try
        {
            var business = await _context.Businesses
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<BusinessAnalyticsComparisonResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var businessId = business.Id;
            period = (period ?? "30d").ToLowerInvariant();
            if (!PeriodAnalytics.SupportedPeriods.Contains(period))
                return ApiResponse<BusinessAnalyticsComparisonResponse>.Fail("INVALID_PERIOD", $"Unsupported period '{period}'.");

            var now = DateTime.UtcNow;
            DateTime curStart, curEnd, prevStart, prevEnd;
            try
            {
                (curStart, curEnd) = PeriodAnalytics.ResolveRange(period, now, start, end);
                (prevStart, prevEnd) = PeriodAnalytics.ResolvePrevious(period, now, start, end);
            }
            catch (ArgumentException ex)
            {
                return ApiResponse<BusinessAnalyticsComparisonResponse>.Fail("INVALID_PERIOD", ex.Message);
            }

            // ── Tenant-scoped aggregate queries (businessId derived from authenticated user) ──
            var stampsPrev = await _context.Stamps
                .CountAsync(s => s.Card.BusinessId == businessId && s.StampedAt >= prevStart && s.StampedAt < prevEnd);
            var stampsCur = await _context.Stamps
                .CountAsync(s => s.Card.BusinessId == businessId && s.StampedAt >= curStart && s.StampedAt < curEnd);

            var activePrev = await _context.LoyaltyCards
                .CountAsync(c => c.BusinessId == businessId && c.LastStampAt != null && c.LastStampAt >= prevStart && c.LastStampAt < prevEnd);
            var activeCur = await _context.LoyaltyCards
                .CountAsync(c => c.BusinessId == businessId && c.LastStampAt != null && c.LastStampAt >= curStart && c.LastStampAt < curEnd);

            var redemptionsPrev = await _context.Redemptions
                .CountAsync(r => r.BusinessId == businessId && r.RedeemedAt >= prevStart && r.RedeemedAt < prevEnd);
            var redemptionsCur = await _context.Redemptions
                .CountAsync(r => r.BusinessId == businessId && r.RedeemedAt >= curStart && r.RedeemedAt < curEnd);

            var enrollmentsPrev = await _context.LoyaltyCards
                .CountAsync(c => c.BusinessId == businessId && c.EnrolledAt >= prevStart && c.EnrolledAt < prevEnd);
            var enrollmentsCur = await _context.LoyaltyCards
                .CountAsync(c => c.BusinessId == businessId && c.EnrolledAt >= curStart && c.EnrolledAt < curEnd);

            // Reward payout — measured at RedeemedAt per the analytics contract.
            var payoutPrev = await _context.Redemptions
                .Where(r => r.BusinessId == businessId && r.RedeemedAt >= prevStart && r.RedeemedAt < prevEnd)
                .SumAsync(r => (decimal?)r.RewardValue) ?? 0m;
            var payoutCur = await _context.Redemptions
                .Where(r => r.BusinessId == businessId && r.RedeemedAt >= curStart && r.RedeemedAt < curEnd)
                .SumAsync(r => (decimal?)r.RewardValue) ?? 0m;

            var stamps = PeriodAnalytics.Compare("stamps", stampsPrev, stampsCur);
            var active = PeriodAnalytics.Compare("activeCustomers", activePrev, activeCur);
            var redemptions = PeriodAnalytics.Compare("redemptions", redemptionsPrev, redemptionsCur);
            var enrollments = PeriodAnalytics.Compare("newEnrollments", enrollmentsPrev, enrollmentsCur);
            var payout = PeriodAnalytics.Compare("rewardPayout", (double)payoutPrev, (double)payoutCur);

            return ApiResponse<BusinessAnalyticsComparisonResponse>.Ok(new BusinessAnalyticsComparisonResponse
            {
                Period = period,
                PreviousPeriod = string.IsNullOrWhiteSpace(prev) ? period : prev,
                Windows = new ComparisonWindowInfo
                {
                    PreviousStart = prevStart,
                    PreviousEnd = prevEnd,
                    CurrentStart = curStart,
                    CurrentEnd = curEnd
                },
                Metrics = new List<MetricComparisonResult> { stamps, active, redemptions, enrollments, payout },
                Summary = new BusinessComparisonSummary
                {
                    Stamps = stamps,
                    Customers = active,
                    PayoutKes = payout
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing analytics for owner {OwnerId}", ownerId);
            return ApiResponse<BusinessAnalyticsComparisonResponse>.Fail("ANALYTICS_FAILED", "Failed to compare analytics.");
        }
    }
}
