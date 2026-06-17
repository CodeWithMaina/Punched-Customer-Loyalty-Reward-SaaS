using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class AdminService : IAdminService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminService> _logger;

    public AdminService(IUnitOfWork unitOfWork, ApplicationDbContext context, ILogger<AdminService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    // ═════════════════════════════════════════════════════════
    //  DASHBOARD OVERVIEW
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminDashboardResponse>> GetDashboardAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var weekAgo = now.AddDays(-7);

            var totalCustomers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer);
            var totalBusinesses = await _context.Businesses.CountAsync();
            var totalStaff = await _context.Users.CountAsync(u => u.Role == UserRole.Staff);
            var totalStamps = await _context.Stamps.CountAsync();
            var totalRedemptions = await _context.Redemptions.CountAsync();
            var totalCards = await _context.LoyaltyCards.CountAsync();
            var totalReferrals = await _context.Referrals.CountAsync();

            var newCustomersToday = await _context.Users.CountAsync(u => u.Role == UserRole.Customer && u.CreatedAt >= todayStart);
            var newBusinessesToday = await _context.Businesses.CountAsync(b => b.CreatedAt >= todayStart);
            var stampsToday = await _context.Stamps.CountAsync(s => s.CreatedAt >= todayStart);
            var redemptionsToday = await _context.Redemptions.CountAsync(r => r.CreatedAt >= todayStart);

            var newCustomers7d = await _context.Users.CountAsync(u => u.Role == UserRole.Customer && u.CreatedAt >= weekAgo);
            var newBusinesses7d = await _context.Businesses.CountAsync(b => b.CreatedAt >= weekAgo);
            var stamps7d = await _context.Stamps.CountAsync(s => s.CreatedAt >= weekAgo);
            var redemptions7d = await _context.Redemptions.CountAsync(r => r.CreatedAt >= weekAgo);

            return ApiResponse<AdminDashboardResponse>.Ok(new AdminDashboardResponse
            {
                TotalCustomers = totalCustomers,
                TotalBusinesses = totalBusinesses,
                TotalStaff = totalStaff,
                TotalStamps = totalStamps,
                TotalRedemptions = totalRedemptions,
                TotalCards = totalCards,
                TotalReferrals = totalReferrals,
                NewCustomersToday = newCustomersToday,
                NewBusinessesToday = newBusinessesToday,
                StampsToday = stampsToday,
                RedemptionsToday = redemptionsToday,
                NewCustomers7d = newCustomers7d,
                NewBusinesses7d = newBusinesses7d,
                Stamps7d = stamps7d,
                Redemptions7d = redemptions7d,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading admin dashboard");
            return ApiResponse<AdminDashboardResponse>.Fail("DASHBOARD_FAILED", "Failed to load admin dashboard.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  GROWTH DATA (Time-series)
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminGrowthResponse>> GetGrowthDataAsync(string period)
    {
        try
        {
            var days = period switch { "7d" => 7, "90d" => 90, _ => 30 };
            var since = DateTime.UtcNow.AddDays(-days).Date;

            var customerGrowth = await _context.Users
                .Where(u => u.Role == UserRole.Customer && u.CreatedAt >= since)
                .GroupBy(u => u.CreatedAt.Date)
                .Select(g => new GrowthDataPoint { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .OrderBy(g => g.Date)
                .ToListAsync();

            var businessGrowth = await _context.Businesses
                .Where(b => b.CreatedAt >= since)
                .GroupBy(b => b.CreatedAt.Date)
                .Select(g => new GrowthDataPoint { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .OrderBy(g => g.Date)
                .ToListAsync();

            var stampGrowth = await _context.Stamps
                .Where(s => s.CreatedAt >= since)
                .GroupBy(s => s.CreatedAt.Date)
                .Select(g => new GrowthDataPoint { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .OrderBy(g => g.Date)
                .ToListAsync();

            var redemptionGrowth = await _context.Redemptions
                .Where(r => r.CreatedAt >= since)
                .GroupBy(r => r.CreatedAt.Date)
                .Select(g => new GrowthDataPoint { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .OrderBy(g => g.Date)
                .ToListAsync();

            return ApiResponse<AdminGrowthResponse>.Ok(new AdminGrowthResponse
            {
                Period = period,
                Customers = customerGrowth,
                Businesses = businessGrowth,
                Stamps = stampGrowth,
                Redemptions = redemptionGrowth,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading admin growth data");
            return ApiResponse<AdminGrowthResponse>.Fail("GROWTH_FAILED", "Failed to load growth data.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  BUSINESS ANALYTICS
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminBusinessAnalyticsResponse>> GetBusinessAnalyticsAsync()
    {
        try
        {
            var categoryBreakdown = await _context.Businesses
                .GroupBy(b => b.Category)
                .Select(g => new CategoryBreakdown
                {
                    Category = g.Key,
                    Count = g.Count(),
                    TotalStamps = g.SelectMany(b => b.LoyaltyCards).Sum(c => c.LifetimeStamps),
                    TotalRedemptions = g.SelectMany(b => b.LoyaltyCards).Sum(c => c.TotalRedemptions),
                    TotalCustomers = g.SelectMany(b => b.LoyaltyCards).Select(c => c.CustomerId).Distinct().Count(),
                })
                .OrderByDescending(c => c.Count)
                .ToListAsync();

            var topBusinesses = await _context.Businesses
                .Include(b => b.Owner)
                .Select(b => new AdminBusinessSummary
                {
                    Id = b.Id,
                    Name = b.Name,
                    Category = b.Category,
                    Location = b.Location,
                    OwnerName = b.Owner != null ? b.Owner.FullName : "Unknown",
                    OwnerEmail = b.Owner != null ? b.Owner.Email : "",
                    TotalCustomers = b.LoyaltyCards.Select(c => c.CustomerId).Distinct().Count(),
                    TotalStamps = b.LoyaltyCards.Sum(c => c.LifetimeStamps),
                    TotalRedemptions = b.LoyaltyCards.Sum(c => c.TotalRedemptions),
                    TotalStaff = _context.Users.Count(u => u.Role == UserRole.Staff && u.StaffBusinessId == b.Id),
                    ProgramCount = b.LoyaltyPrograms.Count(),
                    CreatedAt = b.CreatedAt,
                })
                .OrderByDescending(b => b.TotalStamps)
                .Take(10)
                .ToListAsync();

            var recentBusinesses = await _context.Businesses
                .Include(b => b.Owner)
                .OrderByDescending(b => b.CreatedAt)
                .Take(10)
                .Select(b => new AdminBusinessSummary
                {
                    Id = b.Id,
                    Name = b.Name,
                    Category = b.Category,
                    Location = b.Location,
                    OwnerName = b.Owner != null ? b.Owner.FullName : "Unknown",
                    OwnerEmail = b.Owner != null ? b.Owner.Email : "",
                    TotalCustomers = b.LoyaltyCards.Select(c => c.CustomerId).Distinct().Count(),
                    TotalStamps = b.LoyaltyCards.Sum(c => c.LifetimeStamps),
                    TotalRedemptions = b.LoyaltyCards.Sum(c => c.TotalRedemptions),
                    TotalStaff = _context.Users.Count(u => u.Role == UserRole.Staff && u.StaffBusinessId == b.Id),
                    ProgramCount = b.LoyaltyPrograms.Count(),
                    CreatedAt = b.CreatedAt,
                })
                .ToListAsync();

            return ApiResponse<AdminBusinessAnalyticsResponse>.Ok(new AdminBusinessAnalyticsResponse
            {
                CategoryBreakdown = categoryBreakdown,
                TopBusinesses = topBusinesses,
                RecentBusinesses = recentBusinesses,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading admin business analytics");
            return ApiResponse<AdminBusinessAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load business analytics.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  CUSTOMER ANALYTICS
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminCustomerAnalyticsResponse>> GetCustomerAnalyticsAsync()
    {
        try
        {
            var customers = _context.Users.Where(u => u.Role == UserRole.Customer);

            var genderBreakdown = await customers
                .GroupBy(u => u.Gender ?? "Not specified")
                .Select(g => new DemographicItem { Label = g.Key, Count = g.Count() })
                .OrderByDescending(d => d.Count)
                .ToListAsync();

            // Age breakdown
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var customersWithDob = await customers
                .Where(u => u.DateOfBirth != null)
                .Select(u => u.DateOfBirth!.Value)
                .ToListAsync();

            var ageGroups = customersWithDob
                .Select(dob => today.Year - dob.Year - (today.DayOfYear < dob.DayOfYear ? 1 : 0))
                .GroupBy(age => age switch
                {
                    < 18 => "Under 18",
                    < 25 => "18-24",
                    < 35 => "25-34",
                    < 45 => "35-44",
                    < 55 => "45-54",
                    _ => "55+"
                })
                .Select(g => new DemographicItem { Label = g.Key, Count = g.Count() })
                .OrderBy(d => d.Label)
                .ToList();

            // Top customers by lifetime stamps
            var topCustomers = await _context.Users
                .Where(u => u.Role == UserRole.Customer)
                .Select(u => new AdminCustomerSummary
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    Gender = u.Gender,
                    TotalCards = u.LoyaltyCards.Count(),
                    LifetimeStamps = u.LoyaltyCards.Sum(c => c.LifetimeStamps),
                    TotalRedemptions = u.Redemptions.Count(),
                    CreatedAt = u.CreatedAt,
                })
                .OrderByDescending(c => c.LifetimeStamps)
                .Take(10)
                .ToListAsync();

            // Engagement breakdown (based on stamps in last 30d)
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var allCustomerIds = await customers.Select(u => u.Id).ToListAsync();
            var recentStampCounts = await _context.Stamps
                .Where(s => s.CreatedAt >= thirtyDaysAgo)
                .GroupBy(s => s.Card.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToListAsync();

            var stampLookup = recentStampCounts.ToDictionary(x => x.CustomerId, x => x.Count);
            var highlyActive = 0;
            var active = 0;
            var occasional = 0;
            var dormant = 0;

            foreach (var cId in allCustomerIds)
            {
                var count = stampLookup.GetValueOrDefault(cId, 0);
                if (count >= 10) highlyActive++;
                else if (count >= 5) active++;
                else if (count >= 1) occasional++;
                else dormant++;
            }

            return ApiResponse<AdminCustomerAnalyticsResponse>.Ok(new AdminCustomerAnalyticsResponse
            {
                GenderBreakdown = genderBreakdown,
                AgeBreakdown = ageGroups,
                TopCustomers = topCustomers,
                EngagementBreakdown = new EngagementBreakdown
                {
                    HighlyActive = highlyActive,
                    Active = active,
                    Occasional = occasional,
                    Dormant = dormant,
                },
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading admin customer analytics");
            return ApiResponse<AdminCustomerAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load customer analytics.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  STAFF ANALYTICS
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminStaffAnalyticsResponse>> GetStaffAnalyticsAsync()
    {
        try
        {
            var totalStaff = await _context.Users.CountAsync(u => u.Role == UserRole.Staff);
            var linkedStaff = await _context.Users.CountAsync(u => u.Role == UserRole.Staff && u.StaffBusinessId != null);

            var topStaff = await _context.Users
                .Where(u => u.Role == UserRole.Staff)
                .Select(u => new AdminStaffSummary
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    BusinessName = u.StaffBusinessId != null
                        ? _context.Businesses.Where(b => b.Id == u.StaffBusinessId).Select(b => b.Name).FirstOrDefault()
                        : null,
                    TotalStampsIssued = _context.Stamps.Count(s => s.AwardedByUserId == u.Id),
                    CustomersServed = _context.Stamps.Where(s => s.AwardedByUserId == u.Id).Select(s => s.Card.CustomerId).Distinct().Count(),
                    CreatedAt = u.CreatedAt,
                })
                .OrderByDescending(s => s.TotalStampsIssued)
                .Take(10)
                .ToListAsync();

            return ApiResponse<AdminStaffAnalyticsResponse>.Ok(new AdminStaffAnalyticsResponse
            {
                TotalStaff = totalStaff,
                LinkedStaff = linkedStaff,
                UnlinkedStaff = totalStaff - linkedStaff,
                TopStaff = topStaff,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading admin staff analytics");
            return ApiResponse<AdminStaffAnalyticsResponse>.Fail("ANALYTICS_FAILED", "Failed to load staff analytics.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  SMART INSIGHTS
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<AdminInsightsResponse>> GetInsightsAsync()
    {
        try
        {
            var insights = new List<SmartInsight>();
            var now = DateTime.UtcNow;
            var weekAgo = now.AddDays(-7);
            var twoWeeksAgo = now.AddDays(-14);

            // 1. Best-performing business niche
            var topCategory = await _context.Businesses
                .GroupBy(b => b.Category)
                .Select(g => new { Category = g.Key, Stamps = g.SelectMany(b => b.LoyaltyCards).Sum(c => c.LifetimeStamps) })
                .OrderByDescending(g => g.Stamps)
                .FirstOrDefaultAsync();

            if (topCategory != null)
            {
                insights.Add(new SmartInsight
                {
                    Type = "top_niche",
                    Title = "Top Business Niche",
                    Description = $"{topCategory.Category} businesses generate the most stamp activity across the platform.",
                    Metric = $"{topCategory.Stamps} total stamps",
                    Trend = "positive",
                });
            }

            // 2. Customer growth trend
            var thisWeekCustomers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer && u.CreatedAt >= weekAgo);
            var lastWeekCustomers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer && u.CreatedAt >= twoWeeksAgo && u.CreatedAt < weekAgo);
            var growthPct = lastWeekCustomers > 0 ? ((thisWeekCustomers - lastWeekCustomers) * 100.0 / lastWeekCustomers) : 0;

            insights.Add(new SmartInsight
            {
                Type = "customer_growth",
                Title = "Customer Growth",
                Description = thisWeekCustomers > lastWeekCustomers
                    ? $"Customer sign-ups are up {growthPct:F0}% compared to last week."
                    : thisWeekCustomers < lastWeekCustomers
                        ? $"Customer sign-ups declined by {Math.Abs(growthPct):F0}% this week."
                        : "Customer sign-ups are steady compared to last week.",
                Metric = $"{thisWeekCustomers} new this week",
                Trend = thisWeekCustomers >= lastWeekCustomers ? "positive" : "negative",
            });

            // 3. Stamp velocity
            var stampsThisWeek = await _context.Stamps.CountAsync(s => s.CreatedAt >= weekAgo);
            var stampsLastWeek = await _context.Stamps.CountAsync(s => s.CreatedAt >= twoWeeksAgo && s.CreatedAt < weekAgo);

            insights.Add(new SmartInsight
            {
                Type = "stamp_velocity",
                Title = "Stamp Activity",
                Description = stampsThisWeek > stampsLastWeek
                    ? "Stamp activity is increasing — customers are engaging more."
                    : stampsThisWeek < stampsLastWeek
                        ? "Stamp activity is declining. Consider engagement campaigns."
                        : "Stamp activity is stable this week.",
                Metric = $"{stampsThisWeek} stamps this week",
                Trend = stampsThisWeek >= stampsLastWeek ? "positive" : "negative",
            });

            // 4. High-value customers (top 5% by lifetime stamps)
            var totalCustomers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer);
            var highValueThreshold = Math.Max(1, (int)(totalCustomers * 0.05));
            var highValueCount = await _context.LoyaltyCards
                .GroupBy(c => c.CustomerId)
                .Select(g => g.Sum(c => c.LifetimeStamps))
                .Where(total => total >= 10)
                .CountAsync();

            insights.Add(new SmartInsight
            {
                Type = "high_value_customers",
                Title = "High-Value Customers",
                Description = $"{highValueCount} customers have 10+ lifetime stamps, making them your power users.",
                Metric = $"{highValueCount} power users",
                Trend = "positive",
            });

            // 5. Underperforming segments
            var dormantBusinesses = await _context.Businesses
                .Where(b => !_context.Stamps.Any(s => s.Card.BusinessId == b.Id && s.CreatedAt >= weekAgo))
                .CountAsync();

            if (dormantBusinesses > 0)
            {
                insights.Add(new SmartInsight
                {
                    Type = "dormant_businesses",
                    Title = "Inactive Businesses",
                    Description = $"{dormantBusinesses} businesses have had no stamp activity in the past 7 days.",
                    Metric = $"{dormantBusinesses} inactive",
                    Trend = "negative",
                });
            }

            // 6. Redemption rate
            var totalStamps = await _context.Stamps.CountAsync();
            var totalRedemptions = await _context.Redemptions.CountAsync();
            var redemptionRate = totalStamps > 0 ? (totalRedemptions * 100.0 / totalStamps) : 0;

            insights.Add(new SmartInsight
            {
                Type = "redemption_rate",
                Title = "Reward Redemption Rate",
                Description = $"Overall reward redemption rate is {redemptionRate:F1}% (redemptions per stamp).",
                Metric = $"{redemptionRate:F1}%",
                Trend = redemptionRate > 5 ? "positive" : "neutral",
            });

            return ApiResponse<AdminInsightsResponse>.Ok(new AdminInsightsResponse { Insights = insights });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating admin insights");
            return ApiResponse<AdminInsightsResponse>.Fail("INSIGHTS_FAILED", "Failed to generate insights.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  USER MANAGEMENT
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<PaginatedResponse<AdminUserResponse>>> GetUsersAsync(
        string? role, string? search, int page, int pageSize)
    {
        try
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
                query = query.Where(u => u.Role == parsedRole);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Fetch verification status
            var emails = items.Select(u => u.Email).ToList();
            var authRecords = await _context.UserAuths
                .Where(a => emails.Contains(a.Email))
                .Select(a => new { a.Email, a.IsVerified })
                .ToListAsync();
            var verifiedLookup = authRecords.ToDictionary(a => a.Email, a => a.IsVerified);

            var result = items.Select(u => new AdminUserResponse
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                AvatarUrl = u.AvatarUrl,
                DateOfBirth = u.DateOfBirth,
                Gender = u.Gender,
                Role = u.Role,
                IsVerified = verifiedLookup.GetValueOrDefault(u.Email, false),
                CreatedAt = u.CreatedAt,
            }).ToList();

            return ApiResponse<PaginatedResponse<AdminUserResponse>>.Ok(new PaginatedResponse<AdminUserResponse>
            {
                Items = result,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing users for admin");
            return ApiResponse<PaginatedResponse<AdminUserResponse>>.Fail("LIST_FAILED", "Failed to list users.");
        }
    }

    public async Task<ApiResponse<AdminUserResponse>> GetUserByIdAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return ApiResponse<AdminUserResponse>.Fail("NOT_FOUND", "User not found.");

            var auth = await _context.UserAuths.FirstOrDefaultAsync(a => a.Email == user.Email);

            return ApiResponse<AdminUserResponse>.Ok(new AdminUserResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                AvatarUrl = user.AvatarUrl,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                Role = user.Role,
                IsVerified = auth?.IsVerified ?? false,
                CreatedAt = user.CreatedAt,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user {UserId} for admin", userId);
            return ApiResponse<AdminUserResponse>.Fail("FETCH_FAILED", "Failed to fetch user.");
        }
    }

    public async Task<ApiResponse<AdminUserResponse>> UpdateUserAsync(Guid userId, AdminUpdateUserRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return ApiResponse<AdminUserResponse>.Fail("NOT_FOUND", "User not found.");

            if (request.FullName != null) user.FullName = request.FullName.Trim();
            if (request.Role.HasValue) user.Role = request.Role.Value;
            if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber.Trim();
            if (request.Gender != null) user.Gender = request.Gender.Trim();
            if (request.DateOfBirth.HasValue) user.DateOfBirth = request.DateOfBirth.Value;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync();

            return await GetUserByIdAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId} for admin", userId);
            return ApiResponse<AdminUserResponse>.Fail("UPDATE_FAILED", "Failed to update user.");
        }
    }

    public async Task<ApiResponse<MessageResponse>> DeleteUserAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "User not found.");

            if (user.Role == UserRole.Admin)
                return ApiResponse<MessageResponse>.Fail("FORBIDDEN", "Cannot delete an admin user.");

            // Remove user auth
            var auth = await _context.UserAuths.FirstOrDefaultAsync(a => a.Email == user.Email);
            if (auth != null) _unitOfWork.UserAuths.Delete(auth);

            // Remove refresh tokens
            if (auth != null)
            {
                var tokens = await _context.RefreshTokens.Where(t => t.UserAuthId == auth.Id).ToListAsync();
                foreach (var t in tokens) _unitOfWork.RefreshTokens.Delete(t);
            }

            _unitOfWork.Users.Delete(user);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "User deleted." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", userId);
            return ApiResponse<MessageResponse>.Fail("DELETE_FAILED", "Failed to delete user.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  BUSINESS MANAGEMENT
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<PaginatedResponse<AdminBusinessSummary>>> GetBusinessesAsync(
        string? category, string? search, int page, int pageSize)
    {
        try
        {
            var query = _context.Businesses.Include(b => b.Owner).AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(b => b.Category.ToLower() == category.ToLower());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(b => b.Name.ToLower().Contains(s) || b.Location.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new AdminBusinessSummary
                {
                    Id = b.Id,
                    Name = b.Name,
                    Category = b.Category,
                    Location = b.Location,
                    OwnerName = b.Owner != null ? b.Owner.FullName : "Unknown",
                    OwnerEmail = b.Owner != null ? b.Owner.Email : "",
                    TotalCustomers = b.LoyaltyCards.Select(c => c.CustomerId).Distinct().Count(),
                    TotalStamps = b.LoyaltyCards.Sum(c => c.LifetimeStamps),
                    TotalRedemptions = b.LoyaltyCards.Sum(c => c.TotalRedemptions),
                    TotalStaff = _context.Users.Count(u => u.Role == UserRole.Staff && u.StaffBusinessId == b.Id),
                    ProgramCount = b.LoyaltyPrograms.Count(),
                    CreatedAt = b.CreatedAt,
                })
                .ToListAsync();

            return ApiResponse<PaginatedResponse<AdminBusinessSummary>>.Ok(new PaginatedResponse<AdminBusinessSummary>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing businesses for admin");
            return ApiResponse<PaginatedResponse<AdminBusinessSummary>>.Fail("LIST_FAILED", "Failed to list businesses.");
        }
    }

    public async Task<ApiResponse<AdminBusinessSummary>> GetBusinessDetailAsync(Guid businessId)
    {
        try
        {
            var b = await _context.Businesses
                .Include(b => b.Owner)
                .FirstOrDefaultAsync(b => b.Id == businessId);

            if (b == null)
                return ApiResponse<AdminBusinessSummary>.Fail("NOT_FOUND", "Business not found.");

            var summary = new AdminBusinessSummary
            {
                Id = b.Id,
                Name = b.Name,
                Category = b.Category,
                Location = b.Location,
                OwnerName = b.Owner?.FullName ?? "Unknown",
                OwnerEmail = b.Owner?.Email ?? "",
                TotalCustomers = await _context.LoyaltyCards.Where(c => c.BusinessId == b.Id).Select(c => c.CustomerId).Distinct().CountAsync(),
                TotalStamps = await _context.LoyaltyCards.Where(c => c.BusinessId == b.Id).SumAsync(c => c.LifetimeStamps),
                TotalRedemptions = await _context.Redemptions.CountAsync(r => r.BusinessId == b.Id),
                TotalStaff = await _context.Users.CountAsync(u => u.Role == UserRole.Staff && u.StaffBusinessId == b.Id),
                ProgramCount = await _context.LoyaltyPrograms.CountAsync(p => p.BusinessId == b.Id),
                CreatedAt = b.CreatedAt,
            };

            return ApiResponse<AdminBusinessSummary>.Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching business {BusinessId} for admin", businessId);
            return ApiResponse<AdminBusinessSummary>.Fail("FETCH_FAILED", "Failed to fetch business details.");
        }
    }

    public async Task<ApiResponse<MessageResponse>> DeleteBusinessAsync(Guid businessId)
    {
        try
        {
            var business = await _context.Businesses.FindAsync(businessId);
            if (business == null)
                return ApiResponse<MessageResponse>.Fail("NOT_FOUND", "Business not found.");

            _unitOfWork.Businesses.Delete(business);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Business deleted." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting business {BusinessId}", businessId);
            return ApiResponse<MessageResponse>.Fail("DELETE_FAILED", "Failed to delete business.");
        }
    }

    // ═════════════════════════════════════════════════════════
    //  REDEMPTION MANAGEMENT
    // ═════════════════════════════════════════════════════════

    public async Task<ApiResponse<PaginatedResponse<RedemptionResponse>>> GetRedemptionsAsync(
        string? search, int page, int pageSize)
    {
        try
        {
            var query = _context.Redemptions.Include(r => r.Business).Include(r => r.Card).ThenInclude(c => c.Program).AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(r => r.Business.Name.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new RedemptionResponse
                {
                    Id = r.Id,
                    CardId = r.CardId,
                    BusinessName = r.Business.Name,
                    RewardValue = r.RewardValue,
                    RewardDescription = r.Card.Program.RewardDescription,
                    Status = r.Status,
                    RedeemedAt = r.RedeemedAt,
                })
                .ToListAsync();

            return ApiResponse<PaginatedResponse<RedemptionResponse>>.Ok(new PaginatedResponse<RedemptionResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing redemptions for admin");
            return ApiResponse<PaginatedResponse<RedemptionResponse>>.Fail("LIST_FAILED", "Failed to list redemptions.");
        }
    }
}
