import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
//  Zod Validation Schemas for the Stamping Ecosystem (Phases 1-3)
//  Mirrors the backend FluentValidation rules in StampingValidators.cs
// ═══════════════════════════════════════════════════════════════

/** Phone format: +2547XXXXXXXX (Kenyan E.164) or a 7-15 digit international number. */
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number, e.g. +254712345678");

/** Manual fallback lookup */
export const manualLookupSchema = z.object({
  phone: phoneSchema,
  businessId: z.string().uuid("Invalid business"),
});

/** Stamp adjustment — delta must be a non-zero integer, note capped at 500 chars. */
export const stampAdjustmentSchema = z.object({
  cardId: z.string().uuid("Invalid card"),
  delta: z
    .number({ invalid_type_error: "Delta must be a number" })
    .int("Delta must be a whole number")
    .refine((v) => v !== 0, "Delta must not be zero"),
  reason: z.enum(["VoidMistake", "ManualCorrection", "Goodwill", "SystemFix"], {
    required_error: "Select a reason",
  }),
  note: z.string().max(500, "Note must not exceed 500 characters").optional(),
});

/** Award / enroll-and-stamp stamp count. */
export const stampCountSchema = z
  .number({ invalid_type_error: "Stamp count must be a number" })
  .int("Stamp count must be a whole number")
  .min(1, "Award at least 1 stamp")
  .max(10, "Stamp count is too high");

export const enrollAndStampSchema = z.object({
  token: z.string().min(1, "Scan a QR code first"),
  businessId: z.string().uuid("Invalid business"),
  stamps: stampCountSchema.optional(),
});

/** 6-char fulfilment code, unambiguous alphabet. */
export const fulfilmentCodeSchema = z
  .string()
  .min(1, "Enter the fulfilment code")
  .length(6, "The code is exactly 6 characters")
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, "Codes use letters A-Z (no I/O) and digits 2-9");

export const cancelRedemptionSchema = z.object({
  note: z.string().max(500, "Note must not exceed 500 characters").optional(),
});

export type ManualLookupInput = z.infer<typeof manualLookupSchema>;
export type StampAdjustmentInput = z.infer<typeof stampAdjustmentSchema>;
export type EnrollAndStampInput = z.infer<typeof enrollAndStampSchema>;
export type FulfilmentCodeInput = z.infer<typeof fulfilmentCodeSchema>;