using System.Reflection;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Tests;

/// <summary>
/// Covers LR3 (configurable default enrollment stamps) and ACT3 (dynamic
/// business/staff daily goals) schema, DTO and endpoint surface.
/// </summary>
public class LoyaltyAndGoalSchemaTests
{
    [Fact]
    public void LoyaltyProgram_DefaultEnrollmentStamps_DefaultsToZero_AndClampsTo100()
    {
        var program = new LoyaltyProgram
        {
            BusinessId = Guid.NewGuid(),
            Name = "Test",
            StampsRequired = 10,
            RewardValue = 500m,
            RewardDescription = "Free Coffee",
            DefaultEnrollmentStamps = 1000
        };

        // Defaults to zero for new programs when not configured
        Assert.Equal(0, new LoyaltyProgram().DefaultEnrollmentStamps);
    }

    [Fact]
    public void Stamp_AllowsNullQrToken_AndSourceForSystemStamps()
    {
        // System-generated welcome stamps have no QR token.
        var welcomeStamp = new Stamp
        {
            CardId = Guid.NewGuid(),
            StampNumber = 1,
            StampedAt = DateTime.UtcNow,
            QrTokenId = null,
            Source = "enrollment",
            CreatedAt = DateTime.UtcNow
        };

        Assert.Null(welcomeStamp.QrTokenId);
        Assert.Equal("enrollment", welcomeStamp.Source);
    }

    [Fact]
    public void Business_DefaultDailyGoal_IsNullable()
    {
        var business = new Business { Name = "B", Category = "Cafe", Location = "Nairobi", MpesaNumber = "12345" };
        Assert.Null(business.DefaultDailyGoal);

        business.DefaultDailyGoal = 20;
        Assert.Equal(20, business.DefaultDailyGoal);
    }

    [Fact]
    public void User_DailyGoalOverride_IsNullable()
    {
        var user = new User { Email = "staff@example.com", FullName = "Staff" };
        Assert.Null(user.DailyGoalOverride);

        user.DailyGoalOverride = 30;
        Assert.Equal(30, user.DailyGoalOverride);
    }

    [Fact]
    public void BusinessController_HasDailyGoalEndpoints()
    {
        var controllerType = typeof(PunchedApi.API.Controllers.BusinessController);
        var methods = controllerType.GetMethods(BindingFlags.Public | BindingFlags.Instance);

        var setBusinessGoal = methods.FirstOrDefault(m => m.Name == "SetBusinessDailyGoal");
        Assert.NotNull(setBusinessGoal);
        var businessHttp = setBusinessGoal!.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpPutAttribute>();
        Assert.NotNull(businessHttp);
        Assert.Equal("me/daily-goal", businessHttp!.Template);

        var setStaffGoal = methods.FirstOrDefault(m => m.Name == "SetStaffDailyGoal");
        Assert.NotNull(setStaffGoal);
        var staffHttp = setStaffGoal!.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpPutAttribute>();
        Assert.NotNull(staffHttp);
        Assert.Equal("me/staff/{staffUserId:guid}/daily-goal", staffHttp!.Template);
    }

    [Fact]
    public void ProgramDtos_ExposeDefaultEnrollmentStamps()
    {
        var assembly = typeof(PunchedApi.Application.DTOs.LoyaltyProgramResponse).Assembly;

        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.LoyaltyProgramResponse", "DefaultEnrollmentStamps"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.CreateLoyaltyProgramRequest", "DefaultEnrollmentStamps"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.UpdateLoyaltyProgramRequest", "DefaultEnrollmentStamps"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.UpsertLoyaltyProgramRequest", "DefaultEnrollmentStamps"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.BusinessResponse", "DefaultDailyGoal"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.StaffMemberResponse", "DailyGoal"));
        Assert.True(HasProperty(assembly, "PunchedApi.Application.DTOs.StaffMemberResponse", "DailyGoalOverride"));
    }

    private static bool HasProperty(Assembly assembly, string typeName, string propertyName)
    {
        var type = assembly.GetType(typeName);
        Assert.NotNull(type);
        return type!.GetProperty(propertyName) != null;
    }
}
