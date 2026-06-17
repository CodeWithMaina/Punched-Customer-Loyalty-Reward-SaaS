import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
//  Zod Validation Schemas for Auth Forms
//  Matches password/email rules from 04_API_ENDPOINTS.md
// ═══════════════════════════════════════════════════════════════

/** Register form validation schema */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must not exceed 255 characters"),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character"
    ),
  role: z.enum(["Customer", "Business", "Staff"], {
    required_error: "Please select an account type",
  }),
});

/** Login form validation schema */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/** Verify email form validation schema */
export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^[0-9]{6}$/, "Code must contain only digits"),
});

/** Request verification code schema */
export const requestEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
});

// ── Inferred types ──────────────────────────────────────────
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
export type RequestEmailFormData = z.infer<typeof requestEmailSchema>;
