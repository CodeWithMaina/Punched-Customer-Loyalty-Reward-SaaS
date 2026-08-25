"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  registerBusinessSchema,
  type RegisterBusinessFormData,
} from "@/lib/validations/onboarding";

// ═══════════════════════════════════════════════════════════════
//  Business Register Form — staged onboarding journey.
//  POST /auth/register-business is still ONE atomic request; the
//  wizard only paces data entry across stages (draft lives in RHF).
//  Stages: 1 Account → 2 Business → 3 Profile → 4 Review.
// ═══════════════════════════════════════════════════════════════

const STAGES = [
  { n: 1, label: "Account", title: "Create your identity", hint: "This signs you in as the business owner." },
  { n: 2, label: "Business", title: "Tell us about your business", hint: "Customers will see this on explore." },
  { n: 3, label: "Profile", title: "Make it yours", hint: "Payouts and branding — polish comes later." },
  { n: 4, label: "Review", title: "Review & launch", hint: "One last look before we create your account." },
] as const;

/** Fields validated (via zod) before leaving each stage. */
const STAGE_FIELDS: Record<number, (keyof RegisterBusinessFormData)[]> = {
  1: ["fullName", "email", "phoneNumber", "password"],
  2: ["businessName", "businessCategory", "businessLocation"],
  3: ["businessMpesaNumber", "businessDescription", "logoUrl"],
  4: [],
};

export function BusinessRegisterForm() {
  const { registerBusiness, isLoading, error } = useOnboarding();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
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

  const [stage, setStage] = useState(1);

  /** Advance only when the current stage validates cleanly. */
  const goNext = async () => {
    const valid = await trigger(STAGE_FIELDS[stage], { shouldFocus: true });
    if (valid) setStage((s) => Math.min(STAGES.length, s + 1));
  };

  const goBack = () => setStage((s) => Math.max(1, s - 1));

  const onSubmit = (data: RegisterBusinessFormData) => {
    registerBusiness(data);
  };

  const currentStage = STAGES[stage - 1];
  const progressPercent = ((stage - 1) / (STAGES.length - 1)) * 100;
  const values = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Progress indicator */}
      <nav aria-label="Onboarding progress" className="space-y-3">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
          aria-valuenow={stage}
          aria-label={`Stage ${stage} of ${STAGES.length}`}
          className="h-[3px] w-full bg-[var(--border)] overflow-hidden"
        >
          <div
            className="h-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(progressPercent, 4)}%` }}
          />
        </div>

        <ol className="flex items-center justify-between gap-2">
          {STAGES.map((s) => {
            const done = s.n < stage;
            const active = s.n === stage;
            return (
              <li key={s.n} className="flex items-center gap-2 min-w-0">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] tracking-widest font-bold border transition-colors duration-300 ${
                    done
                      ? "bg-ok text-white border-ok"
                      : active
                        ? "bg-[var(--text-primary)] text-[var(--background)] border-[var(--text-primary)]"
                        : "bg-transparent text-[var(--text-muted)] border-[var(--border)]"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                </span>
                <span
                  className={`hidden sm:block text-[11px] tracking-[0.15em] uppercase font-bold truncate ${
                    active
                      ? "text-[var(--text-primary)]"
                      : done
                        ? "text-ok-text"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Stage header */}
      <header className="min-h-[76px]">
        <h1
          key={`title-${stage}`}
          className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)] animate-fade-in"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {currentStage.title}
        </h1>
        <p
          className="font-mono text-sm text-[var(--text-tertiary)] mt-2 max-w-md animate-fade-in"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span className="text-brand">Step {stage} of {STAGES.length}</span>
          {" — "}
          {currentStage.hint}
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

      {/* ── Stage 1: owner account ────────────────────────── */}
      {stage === 1 && (
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
      )}

      {/* ── Stage 2: business identity ────────────────────── */}
      {stage === 2 && (
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
      </section>
      )}

      {/* ── Stage 3: profile & payouts ────────────────────── */}
      {stage === 3 && (
      <section className="relative border border-[var(--border)] p-5 flex flex-col gap-5">
        <span
          aria-hidden
          className="absolute -top-2.5 left-4 bg-[var(--background)] px-2 text-[10px] tracking-[0.2em] uppercase font-bold text-[var(--text-tertiary)]"
        >
          Profile &amp; Payouts
        </span>

      <Input
        label="M-Pesa number (payouts)"
        type="text"
        placeholder="123456"
        error={errors.businessMpesaNumber?.message}
        {...register("businessMpesaNumber")}
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
      )}

      {/* ── Stage 4: review ───────────────────────────────── */}
      {stage === 4 && (
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
          {(
            [
              ["Owner", "fullName"],
              ["Email", "email"],
              ["Phone", "phoneNumber"],
              ["Business name", "businessName"],
              ["Category", "businessCategory"],
              ["Location", "businessLocation"],
              ["Business phone", "businessPhone"],
              ["Business email", "businessEmail"],
              ["M-Pesa number", "businessMpesaNumber"],
              ["Logo URL", "logoUrl"],
              ["Description", "businessDescription"],
            ] as [string, keyof RegisterBusinessFormData][]
          ).map(([label, key]) => {
            const value = values[key];
            return typeof value === "undefined" || value === "" ? null : (
              <li
                key={key}
                className="py-3 border-b border-[var(--border-light)] last:border-b-0 flex justify-between gap-4"
              >
                <span className="text-[var(--text-tertiary)] flex-shrink-0">{label}</span>
                <span className="text-[var(--text-primary)] truncate">{String(value)}</span>
              </li>
            );
          })}
        </ul>
        <p className="px-5 py-4 font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
          Need to change something? Use the back button — your entries are kept.
        </p>
      </section>
      )}

      {/* Stage navigation / submit */}
      <div className="flex flex-col sm:flex-row gap-3">
        {stage > 1 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={isLoading}
            className="rounded-none uppercase tracking-widest font-bold sm:w-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {stage < STAGES.length ? (
          <Button
            type="button"
            size="lg"
            isLoading={false}
            onClick={goNext}
            fullWidth={stage === 1}
            className="flex-1 rounded-none uppercase tracking-widest font-bold border border-brand bg-brand hover:bg-brand-hover shadow-none hover:shadow-none"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            fullWidth
            className="flex-1 rounded-none uppercase tracking-widest font-bold border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] hover:bg-transparent hover:text-[var(--text-primary)] shadow-none hover:shadow-none motion-safe:active:scale-[0.98]"
          >
            Create Business Account
          </Button>
        )}
      </div>

      {/* Success / achievement moment while the account is being created */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="border border-ok/40 bg-ok-light px-5 py-4 flex items-center gap-3 animate-fade-in"
        >
          <Check className="h-5 w-5 text-ok-text flex-shrink-0" />
          <p className="font-mono text-sm text-ok-text" style={{ fontFamily: "'Space Mono', monospace" }}>
            Everything looks good — creating your business…
          </p>
        </div>
      )}

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
