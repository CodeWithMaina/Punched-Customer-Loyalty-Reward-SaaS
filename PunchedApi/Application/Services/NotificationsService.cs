using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class NotificationsService : INotificationsService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationsService> _logger;

    public NotificationsService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        ILogger<NotificationsService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    public async Task CreateGoalReachedAsync(Guid userId, Guid? businessId, int stampsCount)
    {
        await _unitOfWork.Notifications.AddAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BusinessId = businessId,
            Type = "GoalReached",
            StampsCount = stampsCount,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task CreateRewardReadyAsync(Guid userId, Guid? businessId)
    {
        await _unitOfWork.Notifications.AddAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BusinessId = businessId,
            Type = "RewardReady",
            StampsCount = 1,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task MarkReadAsync(Guid userId, Guid? notificationId = null)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);
        if (notificationId.HasValue)
            query = query.Where(n => n.Id == notificationId.Value);

        var toUpdate = await query.Where(n => !n.IsRead).ToListAsync();
        foreach (var n in toUpdate)
        {
            n.IsRead = true;
        }

        if (toUpdate.Count > 0)
            await _unitOfWork.SaveChangesAsync();
    }

    public async Task<List<NotificationDto>> GetAsync(Guid userId, bool unreadOnly, int limit = 50)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == userId)
            .AsNoTracking();

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                BusinessId = n.BusinessId,
                StampsCount = n.StampsCount,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();
    }
}