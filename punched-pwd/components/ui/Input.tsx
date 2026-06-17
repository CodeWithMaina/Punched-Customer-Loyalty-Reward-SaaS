"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Input — Mobile-first with 16px font (prevents iOS zoom)
// ═══════════════════════════════════════════════════════════════

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, showPasswordToggle, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType =
      isPassword && showPasswordToggle
        ? showPassword
          ? "text"
          : "password"
        : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full h-13 px-4 bg-[var(--surface)] border rounded-xl",
              "text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base",
              "focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]",
              "transition-all duration-200 outline-none",
              error
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : "border-[var(--border)]",
              isPassword && showPasswordToggle && "pr-12",
              className
            )}
            style={{ height: "3.25rem" }}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
