using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Mappings;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Repositories;

namespace PunchedApi.Tests;

/// <summary>
/// Tests for atomic business-owner onboarding (AuthService.RegisterBusinessAsync).
/// Verifies that registering a business creates the UserAuth + Business-role User + Business
/// together, never lets a public signup mint a Business/Staff role, and blocks duplicates.
/// </summary>
public class BusinessRegistrationTests
{
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

    private static IMapper CreateMapper()
        => new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();

    private static AuthService CreateAuthService(
        ApplicationDbContext context,
        Mock<IEmailService>? emailMock = null)
    {
        emailMock ??= new Mock<IEmailService>();
        emailMock.Setup(e => e.SendVerificationCodeAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        return new AuthService(
            new UnitOfWork(context),
            CreateJwtService(),
            emailMock.Object,
            CreateMapper(),
            TestHelpers.CreateLogger<AuthService>(),
            new SubscriptionProvisioningService(context, TestHelpers.CreateLogger<SubscriptionProvisioningService>()));
    }

    private static RegisterBusinessRequest ValidRequest() => new()
    {
        FullName = "Jane Chege",
        Email = "owner@example.com",
        Password = "P@ssw0rd!12",
        PhoneNumber = "+254700000000",
        BusinessName = "Chege's Java Hut",
        BusinessCategory = "Cafe",
        BusinessLocation = "Nairobi",
        BusinessPhone = "+254700000001",
        BusinessEmail = "cafe@example.com",
        BusinessMpesaNumber = "123456",
        BusinessDescription = "Specialty coffee and pastries."
    };
    [Fact]
    public async Task RegisterBusiness_CreatesOwnerAuthUserAndBusiness_Atomically()
    {
        using var context = CreateContext("BizReg_Create_01");
        var service = CreateAuthService(context);

        var result = await service.RegisterBusinessAsync(ValidRequest());

        Assert.True(result.Success, result.Error?.Message);
        Assert.NotNull(result.Data);
        Assert.NotNull(result.Data.Business);
        Assert.Equal("Chege's Java Hut", result.Data.Business.Name);

        var userAuth = await context.UserAuths.FirstOrDefaultAsync(a => a.Email == "owner@example.com");
        Assert.NotNull(userAuth);
        Assert.False(userAuth.IsVerified); // verification code was issued, not auto-verified

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "owner@example.com");
        Assert.NotNull(user);
        Assert.Equal(UserRole.Business, user.Role);

        var business = await context.Businesses.FirstOrDefaultAsync(b => b.Name == "Chege's Java Hut");
        Assert.NotNull(business);
        Assert.Equal(user!.Id, business.OwnerId);
        Assert.Equal("cafe@example.com", business.Email);
        Assert.Equal("123456", business.MpesaNumber);
    }

    [Fact]
    public async Task RegisterBusiness_DuplicateEmail_ReturnsEmailAlreadyRegistered_AndCreatesNothing()
    {
        using var context = CreateContext("BizReg_DupEmail_01");
        await context.UserAuths.AddAsync(new UserAuth
        {
            Id = Guid.NewGuid(), Email = "owner@example.com", PasswordHash = "hash", IsVerified = true, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        var service = CreateAuthService(context);

        var result = await service.RegisterBusinessAsync(ValidRequest());

        Assert.False(result.Success);
        Assert.Equal("EMAIL_ALREADY_REGISTERED", result.Error?.Code);
        Assert.Empty(context.Businesses);
        Assert.Single(context.UserAuths); // no second account created
    }

    [Fact]
    public async Task RegisterBusiness_DuplicateBusinessName_ReturnsNameTaken()
    {
        using var context = CreateContext("BizReg_DupName_01");
        await context.Businesses.AddAsync(new Business
        {
            Id = Guid.NewGuid(), Name = "Chege's Java Hut", Category = "Cafe", Location = "Nairobi",
            MpesaNumber = "999999", OwnerId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        var service = CreateAuthService(context);

        var result = await service.RegisterBusinessAsync(ValidRequest());

        Assert.False(result.Success);
        Assert.Equal("BUSINESS_NAME_TAKEN", result.Error?.Code);
        Assert.Empty(context.UserAuths); // registration aborted before creating the owner account
    }

    [Fact]
    public async Task RegisterBusiness_ForcesBusinessRole_RegardlessOfRequest()
    {
        using var context = CreateContext("BizReg_RoleForce_01");
        var service = CreateAuthService(context);

        var result = await service.RegisterBusinessAsync(ValidRequest());

        Assert.True(result.Success, result.Error?.Message);
        var user = await context.Users.FirstAsync(u => u.Email == "owner@example.com");
        Assert.Equal(UserRole.Business, user.Role);
    }

    [Fact]
    public async Task RegisterBusiness_SendsVerificationCodeToOwner()
    {
        using var context = CreateContext("BizReg_Email_01");
        var emailMock = new Mock<IEmailService>();
        emailMock.Setup(e => e.SendVerificationCodeAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);
        var service = CreateAuthService(context, emailMock);

        var result = await service.RegisterBusinessAsync(ValidRequest());

        Assert.True(result.Success, result.Error?.Message);
        emailMock.Verify(e => e.SendVerificationCodeAsync("owner@example.com", It.IsAny<string>()), Times.Once());
    }
}
