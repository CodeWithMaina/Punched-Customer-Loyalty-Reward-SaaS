using FluentValidation;
using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Validators;

/// <summary>
/// Validates RegisterBusinessRequest: strong account fields + required business information.
/// </summary>
public class RegisterBusinessRequestValidator : AbstractValidator<RegisterBusinessRequest>
{
    public RegisterBusinessRequestValidator()
    {
        // ── Account ─────────────────────────────────────────
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(100).WithMessage("Full name must not exceed 100 characters.");

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

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Phone number must not exceed 20 characters.");

        // ── Business ────────────────────────────────────────
        RuleFor(x => x.BusinessName)
            .NotEmpty().WithMessage("Business name is required.")
            .MaximumLength(100).WithMessage("Business name must not exceed 100 characters.");

        RuleFor(x => x.BusinessCategory)
            .NotEmpty().WithMessage("Business category is required.")
            .MaximumLength(50).WithMessage("Business category must not exceed 50 characters.");

        RuleFor(x => x.BusinessLocation)
            .NotEmpty().WithMessage("Business location is required.")
            .MaximumLength(100).WithMessage("Business location must not exceed 100 characters.");

        RuleFor(x => x.BusinessPhone)
            .MaximumLength(20).WithMessage("Business phone must not exceed 20 characters.");

        RuleFor(x => x.BusinessEmail)
            .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.BusinessEmail))
            .WithMessage("Invalid business email format.")
            .MaximumLength(255).WithMessage("Business email must not exceed 255 characters.");

        RuleFor(x => x.BusinessMpesaNumber)
            .NotEmpty().WithMessage("Business M-Pesa number is required.")
            .MaximumLength(20).WithMessage("Business M-Pesa number must not exceed 20 characters.");

        RuleFor(x => x.BusinessDescription)
            .MaximumLength(500).WithMessage("Business description must not exceed 500 characters.");
    }
}

/// <summary>
/// Validates CreateStaffInvitationRequest — a valid, non-empty email address.
/// </summary>
public class CreateStaffInvitationRequestValidator : AbstractValidator<CreateStaffInvitationRequest>
{
    public CreateStaffInvitationRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters.");
    }
}

/// <summary>
/// Validates AcceptStaffInvitationRequest — staff account creation via invitation.
/// The email confirmation matches the invitation's invited email; that equality is
/// enforced in the service against the stored (server-side) invitation record.
/// </summary>
public class AcceptStaffInvitationRequestValidator : AbstractValidator<AcceptStaffInvitationRequest>
{
    public AcceptStaffInvitationRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(100).WithMessage("Full name must not exceed 100 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.")
            .Matches("[!@#$%^&*(),.?\\\":{}|<>]").WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.EmailConfirmation)
            .NotEmpty().WithMessage("Please confirm the invited email address.")
            .EmailAddress().WithMessage("Invalid email format.")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters.");
    }
}