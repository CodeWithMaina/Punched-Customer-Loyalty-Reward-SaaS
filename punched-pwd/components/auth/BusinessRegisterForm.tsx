"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, X, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  registerBusinessSchema,
  type RegisterBusinessFormData,
} from "@/lib/validations/onboarding";

// ═══════════════════════════════════════════════════════════════
//  Business Register Form — owner + business onboarding
//  POST /auth/register-business (atomically creates UserAuth + owner + business)
// ═══════════════════════════════════════════════════════════════

export function BusinessRegisterForm() {
  const { registerBusiness, isLoading, error } = useOnboarding();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterBusinessFormData>({
    resolver: zodResolver(registerBusinessSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phoneNumber: "",
      businessName: "",
      businessCategory: "",
      businessLocation: "",
      businessPhone: "",
      businessEmail: "",
      businessMpesaNumber: "",
      businessDescription: "",
      logoUrl: "",
    },
  });

  const password = watch("password", "");

  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 number", met: /[0-9]/.test(password) },
    { label: "1 special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const onSubmit = (data: RegisterBusinessFormData) => {
    registerBusiness(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center">
          <Store className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Register your business
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage loyalty rewards, staff, and analytics
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-light text-danger text-sm font-medium px-4 py-3 rounded-2xl animate-scale-in">
          {error}
        </div>
      )}

      {/* ── Owner account ─────────────────────────────────── */}
      <div className="pt-1">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Owner account
        </h3>
      </div>

      <Input
        label="Full name"
        type="text"
        placeholder="Peter Chege"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Phone number (optional)"
        type="tel"
        placeholder="+254700000000"
        autoComplete="tel"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        showPasswordToggle
        error={errors.password?.message}
        {...register("password")}
      />

      {password.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-1.5 text-xs">
              {req.met ? (
                <Check className="h-3.5 w-3.5 text-ok flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
              )}
              <span
                className={req.met ? "text-ok-text" : "text-[var(--text-tertiary)]"}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
{/* ── Business ─────────────────────────────────────── */}
      <div className="pt-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Business information
        </h3>
      </div>

      <Input
        label="Business name"
        type="text"
        placeholder="Chege's Java Hut"
        error={errors.businessName?.message}
        {...register("businessName")}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Category"
          type="text"
          placeholder="Café, salon, gym..."
          error={errors.businessCategory?.message}
          {...register("businessCategory")}
        />

        <Input
          label="Location"
          type="text"
          placeholder="Nairobi"
          error={errors.businessLocation?.message}
          {...register("businessLocation")}
        />
      </div>

      <Input
        label="M-Pesa number (payouts)"
        type="text"
        placeholder="123456"
        error={errors.businessMpesaNumber?.message}
        {...register("businessMpesaNumber")}
      />

      <Input
        label="Business phone (optional)"
        type="tel"
        placeholder="+254700000001"
        error={errors.businessPhone?.message}
        {...register("businessPhone")}
      />

      <Input
        label="Business email (optional)"
        type="email"
        placeholder="cafe@example.com"
        error={errors.businessEmail?.message}
        {...register("businessEmail")}
      />

      <Input
        label="Logo URL (optional)"
        type="url"
        placeholder="https://..."
        error={errors.logoUrl?.message}
        {...register("logoUrl")}
      />

      {/* Description */}
      <div className="w-full">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          Description (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Tell customers what makes your business special..."
          className={`w-full px-4 py-3 bg-[var(--surface)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)] transition-all duration-200 outline-none ${
            errors.businessDescription
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-[var(--border)]"
          }`}
          style={{ minHeight: "5rem" }}
          {...register("businessDescription")}
        />
        {errors.businessDescription && (
          <p className="mt-1.5 text-xs text-danger font-medium">
            {errors.businessDescription.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={!isValid}
      >
        Create Business Account
      </Button>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Registration sends a verification code to your email.
      </p>

      {/* Link to login */}
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand font-semibold hover:text-brand-hover"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}