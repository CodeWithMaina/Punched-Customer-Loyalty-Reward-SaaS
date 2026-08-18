using FluentValidation;
using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Validators;

/// <summary>
/// Validates AvailabilityQueryRequest: at least one service, valid date range.
/// </summary>
public class AvailabilityQueryRequestValidator : AbstractValidator<AvailabilityQueryRequest>
{
    public AvailabilityQueryRequestValidator()
    {
        RuleFor(x => x.ServiceIds)
            .NotEmpty().WithMessage("At least one service is required.");

        RuleForEach(x => x.ServiceIds)
            .NotEmpty().WithMessage("Service id must not be empty.");

        RuleFor(x => x.StartDate)
            .LessThanOrEqualTo(x => x.EndDate)
            .WithMessage("Start date must not be after end date.")
            .WithErrorCode("START_DATE_AFTER_END_DATE");
    }
}

/// <summary>
/// Validates CreateAppointmentRequest (customer self-service booking).
/// </summary>
public class CreateAppointmentRequestValidator : AbstractValidator<CreateAppointmentRequest>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(x => x.BusinessId)
            .NotEmpty().WithMessage("Business is required.");

        RuleFor(x => x.ServiceIds)
            .NotEmpty().WithMessage("At least one service is required.");

        RuleForEach(x => x.ServiceIds)
            .NotEmpty().WithMessage("Service id must not be empty.");

        RuleFor(x => x.ScheduledAt)
            .GreaterThan(DateTime.UtcNow.AddMinutes(1))
            .WithMessage("Appointment must be scheduled in the future.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

/// <summary>
/// Validates CreateAppointmentOnBehalfRequest (Business/Staff book-on-behalf).
/// </summary>
public class CreateAppointmentOnBehalfRequestValidator : AbstractValidator<CreateAppointmentOnBehalfRequest>
{
    public CreateAppointmentOnBehalfRequestValidator()
    {
        RuleFor(x => x.BusinessId)
            .NotEmpty().WithMessage("Business is required.");

        RuleFor(x => x.ServiceIds)
            .NotEmpty().WithMessage("At least one service is required.");

        RuleForEach(x => x.ServiceIds)
            .NotEmpty().WithMessage("Service id must not be empty.");

        RuleFor(x => x.ScheduledAt)
            .GreaterThan(DateTime.UtcNow.AddMinutes(1))
            .WithMessage("Appointment must be scheduled in the future.");

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer is required.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

/// <summary>
/// Validates RescheduleAppointmentRequest.
/// </summary>
public class RescheduleAppointmentRequestValidator : AbstractValidator<RescheduleAppointmentRequest>
{
    public RescheduleAppointmentRequestValidator()
    {
        RuleFor(x => x.ScheduledAt)
            .GreaterThan(DateTime.UtcNow.AddMinutes(1))
            .WithMessage("Appointment must be scheduled in the future.");

        RuleFor(x => x.ServiceIds)
            .NotEmpty().WithMessage("Service list must not be empty.")
            .When(x => x.ServiceIds != null);

        RuleForEach(x => x.ServiceIds)
            .NotEmpty().WithMessage("Service id must not be empty.")
            .When(x => x.ServiceIds != null);

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

/// <summary>
/// Validates CancelAppointmentRequest (optional note only).
/// </summary>
public class CancelAppointmentRequestValidator : AbstractValidator<CancelAppointmentRequest>
{
    public CancelAppointmentRequestValidator()
    {
        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}
