import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
//  Zod Validation — Business registration + Staff invitation accept
//  Mirrors the backend FluentValidation rules (OnboardingValidators).
// ═══════════════════════════════════════════════════════════════

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    "Password must contain at least one special character"
  );

const optionalText = (message: string, max: number) =>
  z
    .string()
    .max(max, message)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

/** Owner + business registration (POST /auth/register-business). */
export const registerBusinessSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must not exceed 255 characters"),
  password: passwordRule,
  phoneNumber: optionalText("Phone number must not exceed 20 characters", 20),
  businessName: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name must not exceed 100 characters"),
  businessCategory: z
    .string()
    .min(1, "Business category is required")
    .max(50, "Business category must not exceed 50 characters"),
  businessLocation: z
    .string()
    .min(1, "Business location is required")
    .max(100, "Business location must not exceed 100 characters"),
  businessPhone: optionalText("Business phone must not exceed 20 characters", 20),
  businessEmail: optionalText("Invalid business email format", 255).refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Invalid business email format"
  ),
  businessMpesaNumber: z
    .string()
    .min(1, "Business M-Pesa number is required")
    .max(20, "Business M-Pesa number must not exceed 20 characters"),
  businessDescription: optionalText(
    "Business description must not exceed 500 characters",
    500
  ),
  logoUrl: optionalText("Logo URL is invalid", 500),
});

/** Staff invitation accept (POST /invitations/{token}/accept). */
export const acceptInvitationSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
  password: passwordRule,
  emailConfirmation: z
    .string()
    .min(1, "Please confirm the invited email address")
    .email("Invalid email format"),
});

export type RegisterBusinessFormData = z.infer<typeof registerBusinessSchema>;
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;