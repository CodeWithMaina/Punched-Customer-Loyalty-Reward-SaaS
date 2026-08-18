using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Services;
using PunchedApi.Application.Settings;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;

namespace PunchedApi.Tests;

/// <summary>
/// Tests for the invitation-only staff onboarding lifecycle (InvitationService):
/// create / resend / revoke / validate / accept.
/// Verifies tenant isolation, duplicate guards, token handling, and atomic staff creation.
/// </summary>
public class InvitationServiceTests
{
    private const string TestToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    private static ApplicationDbContext CreateContext(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationDbContext(options);
    }

    private static JwtTokenService CreateJwtService()
        => new(Options.Create(new JwtSettings
        {
            Secret = "this-is-a-test-secret-that-is-at-least-32-characters-long",
            Issuer = "PunchedApi-Test",
            Audience = "PunchedApi-Tests",
            AccessTokenExpiryMinutes = 60,
            RefreshTokenExpiryDays = 30
        }));

    private static PublicAppSettings CreatePublicAppSettings() => new()
    {
        BaseUrl = "http://localhost:3000",
        InvitationExpiryDays = 7
    };

    private static User CreateOwner(string email = "owner@test.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        FullName = "Test Owner",
        Role = UserRole.Business,
        CreatedAt = DateTime.UtcNow
    };

    private static Business CreateBusiness(Guid ownerId, string name = "Test Business") => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Category = "cafe",
        Location = "Nairobi",
        MpesaNumber = "123456",
        OwnerId = ownerId,
        CreatedAt = DateTime.UtcNow.AddDays(-7)
    };

    private static StaffInvitation CreateInvitation(
        Guid businessId, Guid inviterId, string email,
        string token = TestToken, InvitationStatus status = default, DateTime? expiresAt = null) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = businessId,
        InvitingUserId = inviterId,
        InvitedEmail = email,
        TokenHash = HashToken(token),
        Status = status == default ? InvitationStatus.Pending : status,
        ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };

    private static string HashToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static InvitationService CreateService(
        ApplicationDbContext context, Mock<IEmailService>? emailMock = null, PublicAppSettings? settings = null)
    {
        emailMock ??= new Mock<IEmailService>();
        emailMock.Setup(e => e.SendStaffInvitationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .ReturnsAsync(true);
        return new InvitationService(
            new UnitOfWork(context),
            CreateJwtService(),
            emailMock.Object,
            Options.Create(settings ?? CreatePublicAppSettings()),
            TestHelpers.CreateLogger<InvitationService>());
    }

    private static AcceptStaffInvitationRequest ValidAcceptRequest() => new()
    {
        FullName = "Jane Staff",
        Password = "P@ssw0rd!12",
        EmailConfirmation = "staff@example.com"
    };
    [Fact]
    public async Task CreateInvitation_ForOwnedBusiness_PersistsPendingAndEmails()
    {
        using var context = CreateContext("Invite_Create_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.SaveChangesAsync();
        var emailMock = new Mock<IEmailService>();
        emailMock.Setup(e => e.SendStaffInvitationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .ReturnsAsync(true);
        var service = CreateService(context, emailMock);

        var result = await service.CreateStaffInvitationAsync(owner.Id, new CreateStaffInvitationRequest { Email = "STAFF@EXAMPLE.COM" });

        Assert.True(result.Success, result.Error?.Message);
        Assert.NotNull(result.Data);
        Assert.Equal(InvitationStatus.Pending, result.Data.Status);

        var persisted = await context.StaffInvitations.FirstOrDefaultAsync(i => i.BusinessId == business.Id);
        Assert.NotNull(persisted);
        Assert.Equal("staff@example.com", persisted.InvitedEmail);
        Assert.NotEmpty(persisted.TokenHash);

        emailMock.Verify(r => r.SendStaffInvitationAsync("staff@example.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once());
        var emailInvocation = emailMock.Invocations.Single(i => i.Method.Name == "SendStaffInvitationAsync");
        var acceptUrl = Assert.IsType<string>(emailInvocation.Arguments[2]);
        Assert.StartsWith("http://localhost:3000/invitations/accept?token=", acceptUrl);
        Assert.Single(context.StaffInvitations);
    }

    [Fact]
    public async Task CreateInvitation_DuplicatePending_ReturnsDuplicate()
    {
        using var context = CreateContext("Invite_Duplicate_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var first = await service.CreateStaffInvitationAsync(owner.Id, new CreateStaffInvitationRequest { Email = "staff@example.com" });
        Assert.True(first.Success, first.Error?.Message);

        var second = await service.CreateStaffInvitationAsync(owner.Id, new CreateStaffInvitationRequest { Email = "staff@example.com" });

        Assert.False(second.Success);
        Assert.Equal("DUPLICATE_INVITATION", second.Error?.Code);
        Assert.Single(context.StaffInvitations);
    }

    [Fact]
    public async Task CreateInvitation_OwnerWithoutBusiness_ReturnsNotFound()
    {
        using var context = CreateContext("Invite_NoBiz_01");
        var owner = CreateOwner();
        await context.Users.AddAsync(owner);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.CreateStaffInvitationAsync(owner.Id, new CreateStaffInvitationRequest { Email = "staff@example.com" });

        Assert.False(result.Success);
        Assert.Equal("NOT_FOUND", result.Error?.Code);
        Assert.Empty(context.StaffInvitations);
    }

    [Fact]
    public async Task Validate_ValidPendingToken_ReturnsValidWithBusinessName()
    {
        using var context = CreateContext("Invite_Validate_Valid_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.ValidateStaffInvitationAsync(TestToken);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.Valid);
        Assert.Equal(business.Name, result.Data.BusinessName);
        Assert.Equal("staff@example.com", result.Data.Email);
        Assert.Null(result.Data.ErrorCode);
    }

    [Fact]
    public async Task Validate_RevokedToken_ReturnsInvalidRevoked()
    {
        using var context = CreateContext("Invite_Validate_Revoked_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", status: InvitationStatus.Revoked);
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.ValidateStaffInvitationAsync(TestToken);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.False(result.Data.Valid);
        Assert.Equal("REVOKED", result.Data.ErrorCode);
    }

    [Fact]
    public async Task Validate_ExpiredPending_ReturnsInvalidExpired()
    {
        using var context = CreateContext("Invite_Validate_Expired_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", expiresAt: DateTime.UtcNow.AddDays(-1));
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.ValidateStaffInvitationAsync(TestToken);

        Assert.NotNull(result.Data);
        Assert.False(result.Data.Valid);
        Assert.Equal("EXPIRED", result.Data.ErrorCode);
    }
    [Fact]
    public async Task Accept_ValidToken_CreatesStaffAccountAndAuthenticates()
    {
        using var context = CreateContext("Invite_Accept_Valid_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, ValidAcceptRequest());

        Assert.True(result.Success, result.Error?.Message);
        Assert.NotNull(result.Data);
        Assert.NotEmpty(result.Data.AccessToken);
        Assert.NotEmpty(result.Data.RefreshToken);
        Assert.Equal(UserRole.Staff, result.Data.User.Role);
        Assert.Equal("staff@example.com", result.Data.User.Email);

        var userAuth = await context.UserAuths.FirstOrDefaultAsync(a => a.Email == "staff@example.com");
        Assert.NotNull(userAuth);
        Assert.True(userAuth.IsVerified);

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "staff@example.com");
        Assert.NotNull(user);
        Assert.Equal(UserRole.Staff, user.Role);
        Assert.Equal(business.Id, user.StaffBusinessId);

        var updated = await context.StaffInvitations.FirstAsync(i => i.Id == invitation.Id);
        Assert.Equal(InvitationStatus.Accepted, updated.Status);
        Assert.NotNull(updated.AcceptedAt);
        Assert.Single(context.RefreshTokens);
    }

    [Fact]
    public async Task Accept_EmailMismatch_ReturnsEmailMismatch()
    {
        using var context = CreateContext("Invite_Accept_Mismatch_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, new AcceptStaffInvitationRequest
        {
            FullName = "Jane Staff",
            Password = "P@ssw0rd!12",
            EmailConfirmation = "someone-else@example.com"
        });

        Assert.False(result.Success);
        Assert.Equal("EMAIL_MISMATCH", result.Error?.Code);
        Assert.Empty(context.UserAuths);
        Assert.Equal(InvitationStatus.Pending, invitation.Status);
    }

    [Fact]
    public async Task Accept_RevokedToken_ReturnsRevoked()
    {
        using var context = CreateContext("Invite_Accept_Revoked_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", status: InvitationStatus.Revoked);
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, ValidAcceptRequest());

        Assert.False(result.Success);
        Assert.Equal("REVOKED", result.Error?.Code);
        Assert.Empty(context.UserAuths);
    }

    [Fact]
    public async Task Accept_ExpiredToken_ReturnsExpired()
    {
        using var context = CreateContext("Invite_Accept_Expired_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", expiresAt: DateTime.UtcNow.AddDays(-1));
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, ValidAcceptRequest());

        Assert.False(result.Success);
        Assert.Equal("EXPIRED", result.Error?.Code);
        Assert.Empty(context.UserAuths);
    }

    [Fact]
    public async Task Accept_AlreadyUsedToken_ReturnsAlreadyUsed()
    {
        using var context = CreateContext("Invite_Accept_Used_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", status: InvitationStatus.Accepted);
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, ValidAcceptRequest());

        Assert.False(result.Success);
        Assert.Equal("ALREADY_USED", result.Error?.Code);
    }

    [Fact]
    public async Task Accept_WhenEmailAlreadyOwnedByAnotherAccount_ReturnsEmailInUse()
    {
        using var context = CreateContext("Invite_Accept_EmailInUse_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.UserAuths.AddAsync(new UserAuth
        {
            Id = Guid.NewGuid(), Email = "staff@example.com", PasswordHash = "hash", IsVerified = true, CreatedAt = DateTime.UtcNow
        });
        await context.Users.AddAsync(new User
        {
            Id = Guid.NewGuid(), Email = "staff@example.com", FullName = "Existing Customer", Role = UserRole.Customer, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.AcceptStaffInvitationAsync(TestToken, ValidAcceptRequest());

        Assert.False(result.Success);
        Assert.Equal("EMAIL_IN_USE", result.Error?.Code);
    }
    [Fact]
    public async Task Resend_PendingInvitation_RotatesTokenAndRefreshesExpiry()
    {
        using var context = CreateContext("Invite_Resend_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", expiresAt: DateTime.UtcNow.AddDays(1));
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var oldHash = invitation.TokenHash;
        var oldExpiry = invitation.ExpiresAt;
        var service = CreateService(context);

        var result = await service.ResendStaffInvitationAsync(owner.Id, invitation.Id);

        Assert.True(result.Success, result.Error?.Message);
        var updated = await context.StaffInvitations.FirstAsync(i => i.Id == invitation.Id);
        Assert.NotEqual(oldHash, updated.TokenHash);
        Assert.True(updated.ExpiresAt > oldExpiry);
        Assert.Equal(1, updated.ResendCount);
    }

    [Fact]
    public async Task Resend_CanOnlyResendOwnPendingInvitation()
    {
        using var context = CreateContext("Invite_Resend_OtherOwner_01");
        var owner = CreateOwner();
        var otherOwner = CreateOwner("other@test.com");
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddRangeAsync(owner, otherOwner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.ResendStaffInvitationAsync(otherOwner.Id, invitation.Id);

        Assert.False(result.Success);
        Assert.Equal("NOT_FOUND", result.Error?.Code);
    }

    [Fact]
    public async Task Revoke_PendingInvitation_MarksRevoked()
    {
        using var context = CreateContext("Invite_Revoke_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com");
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.RevokeStaffInvitationAsync(owner.Id, invitation.Id);

        Assert.True(result.Success);
        var updated = await context.StaffInvitations.FirstAsync(i => i.Id == invitation.Id);
        Assert.Equal(InvitationStatus.Revoked, updated.Status);
        Assert.NotNull(updated.RevokedAt);
    }

    [Fact]
    public async Task Revoke_AcceptedInvitation_ReturnsAlreadyAccepted()
    {
        using var context = CreateContext("Invite_Revoke_Accepted_01");
        var owner = CreateOwner();
        var business = CreateBusiness(owner.Id);
        var invitation = CreateInvitation(business.Id, owner.Id, "staff@example.com", status: InvitationStatus.Accepted, expiresAt: DateTime.UtcNow.AddDays(-1));
        await context.Users.AddAsync(owner);
        await context.Businesses.AddAsync(business);
        await context.StaffInvitations.AddAsync(invitation);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.RevokeStaffInvitationAsync(owner.Id, invitation.Id);

        Assert.False(result.Success);
        Assert.Equal("ALREADY_ACCEPTED", result.Error?.Code);
    }
}
