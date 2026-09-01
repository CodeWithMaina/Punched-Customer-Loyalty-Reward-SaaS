using FluentValidation;
using PunchedApi.Application.DTOs;

namespace PunchedApi.Application.Validators;

/// <summary>Validates the multi-stamp award request (stampCount bounds).</summary>
public class AwardStampRequestValidator : AbstractValidator<AwardStampRequest>
{
    public AwardStampRequestValidator()
    {
        RuleFor(r => r.Token).NotEmpty().MaximumLength(512);
        RuleFor(r => r.BusinessId).NotEmpty();
        RuleFor(r => r.StampCount)
            .InclusiveBetween(1, 100)
            .When(r => r.StampCount.HasValue)
            .WithMessage("stampCount must be between 1 and 100.");
    }
}

/// <summary>Validates stamp adjustments: non-zero delta, bounded note.</summary>
public class StampAdjustmentRequestValidator : AbstractValidator<StampAdjustmentRequest>
{
    public StampAdjustmentRequestValidator()
    {
        RuleFor(r => r.CardId).NotEmpty();
        RuleFor(r => r.Delta).NotEqual(0).WithMessage("delta must not be zero.");
        RuleFor(r => r.Delta).InclusiveBetween(-1000, 1000);
        RuleFor(r => r.Reason).IsInEnum();
        RuleFor(r => r.Note).MaximumLength(500);
    }
}

/// <summary>Validates manual phone lookup payloads.</summary>
public class ManualLookupRequestValidator : AbstractValidator<ManualLookupRequest>
{
    public ManualLookupRequestValidator()
    {
        RuleFor(r => r.Phone)
            .NotEmpty()
            .Matches(@"^\+?[0-9]{9,15}$")
            .WithMessage("phone must be a valid E.164-ish phone number (e.g. +254712345678).");
        RuleFor(r => r.BusinessId).NotEmpty();
    }
}

/// <summary>Validates enroll-and-stamp payloads.</summary>
public class EnrollAndStampRequestValidator : AbstractValidator<EnrollAndStampRequest>
{
    public EnrollAndStampRequestValidator()
    {
        RuleFor(r => r.Token).NotEmpty().MaximumLength(512);
        RuleFor(r => r.BusinessId).NotEmpty();
        RuleFor(r => r.Stamps)
            .InclusiveBetween(1, 100)
            .When(r => r.Stamps.HasValue)
            .WithMessage("stamps must be between 1 and 100.");
    }
}

/// <summary>Validates the 6-char fulfilment code presented at the counter.</summary>
public class FulfillRedemptionRequestValidator : AbstractValidator<FulfillRedemptionRequest>
{
    private static readonly string UnambiguousAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public FulfillRedemptionRequestValidator()
    {
        RuleFor(r => r.CardId).NotEmpty();
        RuleFor(r => r.Code)
            .NotEmpty()
            .Length(6)
            .Must(c => c.All(ch => UnambiguousAlphabet.Contains(char.ToUpperInvariant(ch))))
            .WithMessage("code must be 6 characters from the unambiguous alphabet.");
        RuleFor(r => r.BusinessId).NotEmpty();
    }
}

/// <summary>Validates redemption cancellation notes.</summary>
public class CancelRedemptionRequestValidator : AbstractValidator<CancelRedemptionRequest>
{
    public CancelRedemptionRequestValidator()
    {
        RuleFor(r => r.Note).MaximumLength(500);
    }
}
