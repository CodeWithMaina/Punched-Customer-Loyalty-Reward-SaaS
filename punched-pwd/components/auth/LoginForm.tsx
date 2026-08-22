"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

// ═══════════════════════════════════════════════════════════════
//  Login Form — Mobile-first, smooth flow
// ═══════════════════════════════════════════════════════════════

export function LoginForm() {
  const { login, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="mb-2 border-b border-[var(--border)] pb-6">
        <h2
          className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Welcome back
        </h2>
        <p className="font-mono text-sm text-[var(--text-tertiary)] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          Authenticate to enter the workspace.
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

      {/* Password */}
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        showPasswordToggle
        error={errors.password?.message}
        {...register("password")}
      />

      {/* Forgot password */}
      <div className="text-right -mt-2">
        <Link
          href="/forgot-password"
          className="font-mono text-xs text-[var(--text-secondary)] hover:text-brand underline underline-offset-4"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={!isValid}
        className="rounded-none uppercase tracking-widest font-bold border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] hover:bg-transparent hover:text-[var(--text-primary)] shadow-none hover:shadow-none"
      >
        Sign In
      </Button>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
      </div>

      {/* Link to register */}
      <p className="text-center font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-brand font-semibold underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>

      {/* Business owner? */}
      <p className="text-center font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
        <Link
          href="/business-register"
          className="text-brand font-semibold underline underline-offset-4"
        >
          Register a business
        </Link>
      </p>
    </form>
  );
}
