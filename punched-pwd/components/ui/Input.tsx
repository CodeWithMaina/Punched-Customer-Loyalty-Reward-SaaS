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
  /** Optional helper text shown under the field (hidden if an error is present). */
  extraHint?: { tone?: "ok" | "error"; text: string };
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, showPasswordToggle, extraHint, ...props }, ref) => {
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
          <label
            className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)] mb-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full py-3 px-1 bg-transparent border-0 border-b rounded-none",
              "text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base",
              "font-mono outline-none focus:ring-0",
              "focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)]",
              "transition-all duration-200",
              error
                ? "border-accent focus:border-accent"
                : "border-[var(--border)]",
              isPassword && showPasswordToggle && "pr-10",
              className
            )}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
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
          <p className="mt-1.5 font-mono text-xs text-accent">{error}</p>
        )}
        {extraHint && !error && (
          <p
            className={`mt-1.5 font-mono text-xs ${
              extraHint.tone === "ok"
                ? "text-ok-text"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {extraHint.text}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
