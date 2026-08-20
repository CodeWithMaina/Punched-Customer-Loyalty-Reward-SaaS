import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
//  Booking validation schemas (RHF + Zod), mirroring lib/validations
//  conventions and backend.md §7 rules:
//   - scheduledAt must be in the future
//   - serviceIds requires at least one selected service
//   - note capped at 500 chars
// ═══════════════════════════════════════════════════════════════

const FUTURE_DATE_MESSAGE = "Time must be in the future";

/**
 * zod's ZodDate.min() expects a static Date, not a function, so the
 * "future date" rule is expressed with a refine() evaluated at parse
 * time (avoids baking in a module-load timestamp).
 */
const isFutureDate = (value: Date) => value > new Date();

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  serviceIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one service"),
  staffUserId: z.string().uuid().optional(),
  scheduledAt: z
    .coerce.date({ invalid_type_error: "Pick a valid time" })
    .refine(isFutureDate, FUTURE_DATE_MESSAGE),
  note: z.string().max(500).optional(),
});

export const rescheduleSchema = z.object({
  scheduledAt: z.coerce.date().refine(isFutureDate, FUTURE_DATE_MESSAGE),
  serviceIds: z.array(z.string().uuid()).optional(),
  staffUserId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
});

export const cancelSchema = z.object({
  note: z.string().max(500).optional(),
});

export type CreateAppointmentForm = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentForm = z.infer<typeof rescheduleSchema>;
export type CancelAppointmentForm = z.infer<typeof cancelSchema>;

// ═══════════════════════════════════════════════════════════════
// Service catalog form schema (mirrors frontend.md §8 / backend.md)
// name: 1–120 chars; durationMinutes: int 1–1440; price: >= 0
// ═══════════════════════════════════════════════════════════════
export const serviceCatalogSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  durationMinutes: z
    .number({ invalid_type_error: "Duration must be a number" })
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration cannot exceed 1440 minutes (24 hours)"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
});

export type ServiceCatalogForm = z.infer<typeof serviceCatalogSchema>;
