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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Create account</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Start earning rewards today</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-light text-danger text-sm font-medium px-4 py-3 rounded-2xl animate-scale-in">
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
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface-raised)] p-4">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-brand flex-shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">
            <Link
              href="/business-register"
              className="text-brand font-semibold hover:text-brand-hover"
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
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                strengthPercent <= 25
                  ? "bg-danger"
                  : strengthPercent <= 50
                  ? "bg-accent"
                  : strengthPercent <= 75
                  ? "bg-brand"
                  : "bg-ok"
              }`}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-2 gap-1.5">
            {requirements.map((req) => (
              <div
                key={req.label}
                className="flex items-center gap-1.5 text-xs"
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
      >
        Create Account
      </Button>

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

      {/* Staff note */}
      <p className="text-center text-xs text-[var(--text-tertiary)]">
        Joining a business as staff? Use the invitation link sent to you by your
        business owner.
      </p>
    </form>
  );
}
