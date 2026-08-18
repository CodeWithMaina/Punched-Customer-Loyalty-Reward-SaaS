using FluentValidation;
using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Validators;

/// <summary>
/// Validates CreateServiceRequest: required name, positive duration, non-negative price.
/// </summary>
public class CreateServiceRequestValidator : AbstractValidator<CreateServiceRequest>
{
    public CreateServiceRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Service name is required.")
            .MaximumLength(120).WithMessage("Service name must not exceed 120 characters.");

        RuleFor(x => x.DurationMinutes)
            .GreaterThan(0).WithMessage("Duration must be greater than 0.");

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Price must be greater than or equal to 0.");
    }
}

/// <summary>
/// Validates UpdateServiceRequest. Each rule applies only when the field is provided.
/// </summary>
public class UpdateServiceRequestValidator : AbstractValidator<UpdateServiceRequest>
{
    public UpdateServiceRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Service name is required.")
            .MaximumLength(120).WithMessage("Service name must not exceed 120 characters.")
            .When(x => x.Name != null);

        RuleFor(x => x.DurationMinutes)
            .GreaterThan(0).WithMessage("Duration must be greater than 0.")
            .When(x => x.DurationMinutes.HasValue);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Price must be greater than or equal to 0.")
            .When(x => x.Price.HasValue);
    }
}
