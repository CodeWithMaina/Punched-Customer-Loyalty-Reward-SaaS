using FluentValidation;
using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Validators;

/// <summary>
/// Validates RegisterRequest: email format, password strength, fullName length.
/// Password: min 8 chars, 1 uppercase, 1 number, 1 special character.
/// </summary>
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.")
            .Matches("[!@#$%^&*(),.?\":{}|<>]").WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MinimumLength(1).WithMessage("Full name must be at least 1 character.")
            .MaximumLength(100).WithMessage("Full name must not exceed 100 characters.");
    }
}

/// <summary>
/// Validates VerifyEmailRequest: email format and 6-digit code.
/// </summary>
public class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Verification code is required.")
            .Length(6).WithMessage("Verification code must be exactly 6 digits.")
            .Matches("^[0-9]{6}$").WithMessage("Verification code must contain only digits.");
    }
}

/// <summary>
/// Validates LoginRequest: email format and non-empty password.
/// </summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}

/// <summary>
/// Validates RefreshTokenRequest: non-empty token.
/// </summary>
public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token is required.");
    }
}

/// <summary>
/// Validates RequestEmailRequest: valid email format.
/// </summary>
public class RequestEmailRequestValidator : AbstractValidator<RequestEmailRequest>
{
    public RequestEmailRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");
    }
}

/// <summary>
/// Validates ForgotPasswordRequest: valid email format.
/// </summary>
public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");
    }
}

/// <summary>
/// Validates ResetPasswordRequest: email, 6-digit code, and strong password.
/// </summary>
public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Reset code is required.")
            .Length(6).WithMessage("Code must be exactly 6 digits.")
            .Matches("^[0-9]{6}$").WithMessage("Code must contain only digits.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.")
            .Matches("[!@#$%^&*(),.?\":{}|<>]").WithMessage("Password must contain at least one special character.");
    }
}

/// <summary>
/// Validates ChangePasswordRequest: current + strong new password.
/// </summary>
public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.")
            .Matches("[!@#$%^&*(),.?\":{}|<>]").WithMessage("Password must contain at least one special character.");
    }
}

/// <summary>
/// Validates ClaimRewardRequest: non-empty card ID.
/// </summary>
public class ClaimRewardRequestValidator : AbstractValidator<ClaimRewardRequest>
{
    public ClaimRewardRequestValidator()
    {
        RuleFor(x => x.CardId)
            .NotEmpty().WithMessage("Card ID is required.");
    }
}

/// <summary>
/// Validates CreateBusinessRequest.
/// </summary>
public class CreateBusinessRequestValidator : AbstractValidator<CreateBusinessRequest>
{
    public CreateBusinessRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Business name is required.")
            .MaximumLength(100).WithMessage("Business name must not exceed 100 characters.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Category is required.")
            .MaximumLength(50).WithMessage("Category must not exceed 50 characters.");

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Location is required.")
            .MaximumLength(100).WithMessage("Location must not exceed 100 characters.");

        RuleFor(x => x.MpesaNumber)
            .NotEmpty().WithMessage("M-Pesa number is required.")
            .MaximumLength(20).WithMessage("M-Pesa number must not exceed 20 characters.");
    }
}

/// <summary>
/// Validates UpsertLoyaltyProgramRequest.
/// </summary>
public class UpsertLoyaltyProgramRequestValidator : AbstractValidator<UpsertLoyaltyProgramRequest>
{
    public UpsertLoyaltyProgramRequestValidator()
    {
        RuleFor(x => x.StampsRequired)
            .GreaterThanOrEqualTo(1).WithMessage("At least 1 stamp is required.")
            .LessThanOrEqualTo(100).WithMessage("Cannot exceed 100 stamps.");

        RuleFor(x => x.RewardValue)
            .GreaterThan(0).WithMessage("Reward value must be greater than 0.");

        RuleFor(x => x.RewardDescription)
            .NotEmpty().WithMessage("Reward description is required.")
            .MaximumLength(200).WithMessage("Reward description must not exceed 200 characters.");
    }
}
