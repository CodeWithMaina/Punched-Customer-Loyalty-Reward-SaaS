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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Welcome back</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to your account</p>
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
      <div className="text-right -mt-1">
        <Link
          href="/forgot-password"
          className="text-xs text-[var(--text-secondary)] hover:text-brand font-medium"
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
      >
        Sign In
      </Button>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-light)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--surface)] px-3 text-[var(--text-tertiary)]">or</span>
        </div>
      </div>

      {/* Link to register */}
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-brand font-semibold hover:text-brand-hover"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
