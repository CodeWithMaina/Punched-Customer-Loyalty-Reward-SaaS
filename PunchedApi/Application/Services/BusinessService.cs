using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class BusinessService : IBusinessService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BusinessService> _logger;

    public BusinessService(IUnitOfWork unitOfWork, ApplicationDbContext context, ILogger<BusinessService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
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
            .Include(b => b.LoyaltyPrograms)
            .Include(b => b.ReferralProgram)
            .FirstOrDefaultAsync(b => b.Id == businessId);

        if (business == null)
            return ApiResponse<BusinessResponse>.Fail("NOT_FOUND", "Business not found.");

        return ApiResponse<BusinessResponse>.Ok(MapToResponse(business));
    }

    public async Task<ApiResponse<List<BusinessResponse>>> ListBusinessesAsync(string? category, string? search, int page, int pageSize)
    {
        var query = _context.Businesses.Include(b => b.LoyaltyPrograms).Include(b => b.ReferralProgram).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(b => b.Category.ToLower() == category.ToLower());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(b => b.Name.ToLower().Contains(s) || b.Category.ToLower().Contains(s) || (b.Location != null && b.Location.ToLower().Contains(s)));
        }

        var businesses = await query
            .OrderBy(b => b.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = businesses.Select(b => MapToResponse(b)).ToList();
        return ApiResponse<List<BusinessResponse>>.Ok(result);
    }

    public async Task<ApiResponse<List<BusinessCustomerResponse>>> GetBusinessCustomersAsync(Guid ownerId, string? search)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<BusinessCustomerResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var query = _context.LoyaltyCards
            .Include(c => c.Customer)
            .Where(c => c.BusinessId == business.Id)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(c =>
                c.Customer.FullName.ToLower().Contains(searchLower) ||
                c.Customer.Email.ToLower().Contains(searchLower));
        }

        var cards = await query.OrderByDescending(c => c.LastStampAt ?? c.EnrolledAt).ToListAsync();

        var result = cards.Select(c => new BusinessCustomerResponse
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
            LastStampAt = c.LastStampAt
        }).ToList();

        return ApiResponse<List<BusinessCustomerResponse>>.Ok(result);
    }

    public async Task<ApiResponse<BusinessCustomerResponse>> GetSingleCustomerAsync(Guid ownerId, Guid customerId)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<BusinessCustomerResponse>.Fail("NOT_FOUND", "No business found for this account.");

        var card = await _context.LoyaltyCards
            .Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.BusinessId == business.Id && c.CustomerId == customerId);

        if (card == null)
            return ApiResponse<BusinessCustomerResponse>.Fail("NOT_FOUND", "Customer not enrolled in this business.");

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
            LastStampAt = card.LastStampAt
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

            // Sequential queries — DbContext is not thread-safe
            var activeCards = await _context.LoyaltyCards.CountAsync(c => c.BusinessId == businessId);
            var totalStamps = await _context.Stamps.CountAsync(s => s.Card.BusinessId == businessId);
            var stampsToday = await _context.Stamps.CountAsync(s => s.Card.BusinessId == businessId && s.StampedAt >= todayUtc);
            var totalRedemptions = await _context.Redemptions.CountAsync(r => r.BusinessId == businessId);
            var rewardReadyCards = activeProgram == null ? 0
                : await _context.LoyaltyCards.CountAsync(c => c.BusinessId == businessId && c.TotalStamps >= activeProgram.StampsRequired);

            return ApiResponse<BusinessDashboardResponse>.Ok(new BusinessDashboardResponse
            {
                BusinessId = business.Id,
                BusinessName = business.Name,
                ActiveCards = activeCards,
                TotalStampsIssued = totalStamps,
                StampsToday = stampsToday,
                TotalRedemptions = totalRedemptions,
                RewardReadyCards = rewardReadyCards
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
                .Include(b => b.LoyaltyPrograms)
                .FirstOrDefaultAsync(b => b.Id == user.StaffBusinessId.Value);

            if (business == null)
                return ApiResponse<StaffAnalyticsResponse>.Fail("NOT_FOUND", "Linked business not found.");

            var todayUtc = DateTime.UtcNow.Date;
            var weekStart = todayUtc.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var businessId = business.Id;

            // All queries scoped to this specific staff member's awarded stamps
            var stampsToday = await _context.Stamps
                .CountAsync(s => s.AwardedByUserId == staffUserId && s.StampedAt >= todayUtc);

            var stampsThisWeek = await _context.Stamps
                .CountAsync(s => s.AwardedByUserId == staffUserId && s.StampedAt >= weekStart);

            var stampsThisMonth = await _context.Stamps
                .CountAsync(s => s.AwardedByUserId == staffUserId && s.StampedAt >= monthStart);

            var totalStamps = await _context.Stamps
                .CountAsync(s => s.AwardedByUserId == staffUserId);

            // Unique customers this staff member has stamped
            var totalCustomers = await _context.Stamps
                .Where(s => s.AwardedByUserId == staffUserId)
                .Select(s => s.Card.CustomerId)
                .Distinct()
                .CountAsync();

            var activeProgram = business.LoyaltyPrograms.FirstOrDefault(p => p.IsActive);
            // Reward-ready count: customers whose cards were stamped by this staff and are now reward-ready
            var rewardReadyCount = activeProgram == null ? 0 :
                await _context.Stamps
                    .Where(s => s.AwardedByUserId == staffUserId)
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
                .OrderByDescending(s => s.StampedAt)
                .Take(20)
                .Select(s => new StaffActivityItem
                {
                    CustomerName = s.Card.Customer.FullName,
                    StampNumber = s.StampNumber,
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
                RecentActivity = recentStamps
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff analytics for user {UserId}", staffUserId);
            return ApiResponse<StaffAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load analytics.");
        }
    }

    public async Task<ApiResponse<List<StaffMemberResponse>>> GetMyStaffAsync(Guid ownerId, string? search = null, string sort = "alpha")
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
        if (business == null)
            return ApiResponse<List<StaffMemberResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        var query = _context.Users
            .Where(u => u.StaffBusinessId == business.Id)
            .AsNoTracking();

        // DB-level search
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s));
        }

        // Project with stamp count (DB-level aggregation)
        var projected = query.Select(u => new StaffMemberResponse
        {
            UserId = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            AvatarUrl = u.AvatarUrl,
            StampsIssued = _context.Stamps.Count(s => s.AwardedByUserId == u.Id),
        });

        // DB-level sort
        projected = sort switch
        {
            "stamps" => projected.OrderByDescending(s => s.StampsIssued),
            "recent" => projected.OrderByDescending(s => s.UserId), // newest linked first (GUID v7 / creation order)
            _ => projected.OrderBy(s => s.FullName),
        };

        var result = await projected.ToListAsync();
        return ApiResponse<List<StaffMemberResponse>>.Ok(result);
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
                    CustomerName = s.Card.Customer.FullName,
                    StampNumber  = s.StampNumber,
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
                RecentActivity       = recentActivity,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff member analytics for {StaffId}", staffUserId);
            return ApiResponse<StaffMemberAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load staff analytics.");
        }
    }

    public async Task<ApiResponse<CustomerPeriodStatsResponse>> GetCustomerPeriodStatsAsync(
        Guid ownerId, Guid customerId, string period)
    {
        try
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerId);
            if (business == null)
                return ApiResponse<CustomerPeriodStatsResponse>.Fail("NOT_FOUND", "No business found for this account.");

            var card = await _context.LoyaltyCards
                .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.BusinessId == business.Id);
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

            // 6. Program redemption counts — single batch query
            var programIds = business.LoyaltyPrograms.Select(p => p.Id).ToList();
            var programRedemptionCounts = await _context.Redemptions
                .Where(r => r.BusinessId == businessId && programIds.Contains(r.Card.ProgramId))
                .GroupBy(r => r.Card.ProgramId)
                .Select(g => new { ProgramId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ProgramId, x => x.Count);

            // 7. Staff performance — aggregated in SQL
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

            // 5. Program performance (batch — no N+1)
            var programPerformance = business.LoyaltyPrograms.Select(prog =>
            {
                var progCards = cardSummaries.Where(c => c.ProgramId == prog.Id).ToList();
                var completed = progCards.Count(c => c.LifetimeStamps >= prog.StampsRequired);
                return new ProgramPerformanceItem
                {
                    ProgramId = prog.Id,
                    ProgramName = prog.Name,
                    TotalRedemptions = programRedemptionCounts.GetValueOrDefault(prog.Id, 0),
                    ActiveCards = progCards.Count,
                    CompletionRate = progCards.Count > 0 ? Math.Round((double)completed / progCards.Count * 100, 1) : 0
                };
            }).ToList();

            // 6. Customer growth (cumulative)
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
            var funnel = new FunnelData
            {
                TotalCustomers = cardSummaries.Count,
                StampedAtLeastOnce = cardSummaries.Count(c => c.LifetimeStamps > 0),
                CompletedCard = activeProgram != null
                    ? cardSummaries.Count(c => c.LifetimeStamps >= activeProgram.StampsRequired) : 0,
                Redeemed = cardSummaries.Count(c => c.TotalRedemptions > 0)
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

            return ApiResponse<BusinessAnalyticsResponse>.Ok(new BusinessAnalyticsResponse
            {
                HourlyActivity = hourlyActivity,
                WeeklyHeatmap = heatmap,
                GenderBreakdown = genderBreakdown,
                AgeBreakdown = ageBreakdown,
                EngagementTrends = engagementTrends,
                ProgramPerformance = programPerformance,
                CustomerGrowth = growthData,
                Retention = retention,
                StaffPerformance = staffPerformance,
                Funnel = funnel,
                TopCustomers = topCustomers
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting business analytics for owner {OwnerId}", ownerId);
            return ApiResponse<BusinessAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load analytics.");
        }
    }
}
