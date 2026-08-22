"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, X } from "lucide-react";
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

  const fullName = watch("fullName", "");
  const email = watch("email", "");
  const phoneNumber = watch("phoneNumber", "");

  const onSubmit = (data: RegisterBusinessFormData) => {
    registerBusiness(data);
  };

  const STEPS = ["Account", "Details", "Finish"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Progress indicator */}
      <nav aria-label="Onboarding progress" className="flex items-center w-full">
        {STEPS.map((label, i) => (
          <div key={label} className="contents">
            {i > 0 && <div className="flex-grow h-px bg-[var(--border)] mx-3" aria-hidden />}
            <div className="flex flex-col items-center gap-2">
              <div
                aria-current={i === 0 ? "step" : undefined}
                className={`w-9 h-9 flex items-center justify-center text-[12px] tracking-[0.15em] font-bold border ${
                  i === 0
                    ? "bg-[var(--text-primary)] text-[var(--background)] border-[var(--text-primary)]"
                    : "bg-transparent text-[var(--text-tertiary)] border-[var(--border)]"
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {i + 1}
              </div>
              <span
                className={`text-[12px] tracking-[0.15em] uppercase font-bold whitespace-nowrap ${
                  i === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </nav>

      {/* Header */}
      <header className="border-b border-[var(--border)] pb-6">
        <h1
          className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Create Identity
        </h1>
        <p className="font-mono text-sm text-[var(--text-tertiary)] mt-2 max-w-md" style={{ fontFamily: "'Space Mono', monospace" }}>
          Register your business to manage loyalty rewards, staff, and analytics.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div
          className="border border-accent/40 bg-[var(--accent-light)] text-accent-text font-mono text-sm px-4 py-3 animate-scale-in"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {error}
        </div>
      )}

      {/* ── Owner account ─────────────────────────────────── */}
      <section className="relative border border-[var(--border)] p-5 flex flex-col gap-5">
        <span
          aria-hidden
          className="absolute -top-2.5 left-4 bg-[var(--background)] px-2 text-[10px] tracking-[0.2em] uppercase font-bold text-[var(--text-tertiary)]"
        >
          Owner Account
        </span>

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
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-1 p-4 border border-[var(--border)] bg-[var(--background)] animate-fade-in">
            {requirements.map((req) => (
              <div
                key={req.label}
                className="flex items-center gap-2 font-mono text-xs"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
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
      </section>

      {/* ── Business information ──────────────────────────── */}
      <section className="relative border border-[var(--border)] p-5 flex flex-col gap-5">
        <span
          aria-hidden
          className="absolute -top-2.5 left-4 bg-[var(--background)] px-2 text-[10px] tracking-[0.2em] uppercase font-bold text-[var(--text-tertiary)]"
        >
          Business Info
        </span>

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
        <label
          htmlFor="biz-description"
          className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)] mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Description (optional)
        </label>
        <textarea
          id="biz-description"
          rows={3}
          placeholder="Tell customers what makes your business special..."
          className={`w-full py-3 px-1 bg-transparent border-0 border-b rounded-none font-mono text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)] transition-all duration-200 ${
            errors.businessDescription ? "border-accent" : "border-[var(--border)]"
          }`}
          style={{ fontFamily: "'Space Mono', monospace", minHeight: "5rem" }}
          {...register("businessDescription")}
        />
        {errors.businessDescription && (
          <p className="mt-1.5 font-mono text-xs text-accent">
            {errors.businessDescription.message}
          </p>
        )}
      </div>
      </section>

      {/* ── Review archive ────────────────────────────────── */}
      <section className="border border-[var(--border)] flex flex-col">
        <div className="flex justify-between items-center border-b border-[var(--border)] px-5 py-4">
          <h2
            className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Review
          </h2>
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold px-2 py-1 bg-[var(--surface-container-high, var(--surface-raised))] text-[var(--text-secondary)]">
            Confidential
          </span>
        </div>
        <ul className="px-5 font-mono text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
          {[
            { label: "Full Name", value: fullName },
            { label: "Email", value: email },
            { label: "Phone", value: phoneNumber },
          ].map(({ label, value }) => (
            <li
              key={label}
              className="py-3 border-b border-[var(--border-light)] last:border-b-0 flex justify-between gap-4"
            >
              <span className="text-[var(--text-tertiary)]">{label}</span>
              <span className="text-[var(--text-primary)] truncate">{value || "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={!isValid}
        className="rounded-none uppercase tracking-widest font-bold border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] hover:bg-transparent hover:text-[var(--text-primary)] shadow-none hover:shadow-none"
      >
        Create Business Account
      </Button>

      {/* Terms note */}
      <p className="text-center font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        Registration sends a verification code to your email. By continuing you agree to our Terms &amp; Privacy Policy.
      </p>

      {/* Link to login */}
      <p className="text-center pt-4 border-t border-[var(--border)] font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand font-semibold underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}