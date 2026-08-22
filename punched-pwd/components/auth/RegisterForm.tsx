"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, X, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/validations/auth";

// ═══════════════════════════════════════════════════════════════
//  Register Form — Mobile-first, smooth onboarding
// ═══════════════════════════════════════════════════════════════

export function RegisterForm() {
  const { register: registerUser, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      role: "Customer",
    },
  });

  const password = watch("password", "");

  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 number", met: /[0-9]/.test(password) },
    {
      label: "1 special character",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const strengthPercent =
    (requirements.filter((r) => r.met).length / requirements.length) * 100;

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="mb-2 border-b border-[var(--border)] pb-6">
        <h2
          className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Client Sign Up
        </h2>
        <p className="font-mono text-sm text-[var(--text-tertiary)] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          Create your account to start earning rewards.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="border border-accent/40 bg-[var(--accent-light)] text-accent-text font-mono text-sm px-4 py-3 animate-scale-in"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {error}
        </div>
      )}

      {/* Email */}
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Full Name */}
      <Input
        label="Full Name"
        type="text"
        placeholder="John Doe"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* Role is always Customer server-side. Public registration only mints
              customers — business owners use /business-register, staff are
              onboarded exclusively through an invitation link. */}
      <input type="hidden" value="Customer" {...register("role")} />

      {/* Business owner? */}
      <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-brand flex-shrink-0" />
          <p className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
            <Link
              href="/business-register"
              className="text-brand font-semibold underline underline-offset-4"
            >
              Own a business?
            </Link>{" "}
            Register it here to manage rewards and staff.
          </p>
        </div>
      </div>

      {/* Password */}
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        showPasswordToggle
        error={errors.password?.message}
        {...register("password")}
      />

      {/* Password strength indicator */}
      {password.length > 0 && (
        <div className="space-y-2.5 animate-fade-in">
          {/* Segmented strength meter */}
          <div className="flex gap-1 h-1 w-full">
            {[25, 50, 75, 100].map((step) => (
              <div
                key={step}
                className={`flex-1 transition-colors duration-500 ${
                  strengthPercent >= step ? "bg-brand" : "bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-2 gap-1.5">
            {requirements.map((req) => (
              <div
                key={req.label}
                className="flex items-center gap-1.5 font-mono text-xs"
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
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={!isValid}
        className="rounded-none uppercase tracking-widest font-bold border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] hover:bg-transparent hover:text-[var(--text-primary)] shadow-none hover:shadow-none"
      >
        Create Account
      </Button>

      {/* Link to login */}
      <p className="text-center font-mono text-sm text-[var(--text-secondary)] pt-4 border-t border-[var(--border)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand font-semibold underline underline-offset-4"
        >
          Log in
        </Link>
      </p>

      {/* Staff note */}
      <p className="text-center font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        Joining a business as staff? Use the invitation link sent to you by your
        business owner.
      </p>
    </form>
  );
}
