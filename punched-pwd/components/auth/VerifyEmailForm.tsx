"use client";

import { useRef, useState, useEffect, useCallback, KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

// ═══════════════════════════════════════════════════════════════
//  Verify Email Form — Mobile-optimized OTP input
// ═══════════════════════════════════════════════════════════════

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get("email") || "";
  const { pendingVerificationEmail } = useAuthStore();
  const email = pendingVerificationEmail || emailFromParams;

  const { verifyEmail, resendVerificationCode, isLoading, error } = useAuth();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === CODE_LENGTH && email) {
      verifyEmail({ email, code: fullCode });
    }
  }, [code, email, verifyEmail]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^[0-9]$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      const newCode = Array(CODE_LENGTH).fill("");
      pasted.split("").forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);
      const nextEmpty = newCode.findIndex((c) => !c);
      inputRefs.current[nextEmpty >= 0 ? nextEmpty : CODE_LENGTH - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (countdown > 0 || !email) return;
    resendVerificationCode(email);
    setCountdown(RESEND_COOLDOWN);
    setCode(Array(CODE_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  };

  const handleSubmit = () => {
    const fullCode = code.join("");
    if (fullCode.length === CODE_LENGTH && email) {
      verifyEmail({ email, code: fullCode });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with icon */}
      <div className="text-center">
        <div className="mx-auto h-14 w-14 bg-brand-surface rounded-2xl flex items-center justify-center mb-4">
          <Mail className="h-7 w-7 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Check your email</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">We sent a 6-digit code to</p>
        <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{email}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-light text-danger text-sm font-medium px-4 py-3 rounded-2xl text-center animate-scale-in">
          {error}
        </div>
      )}

      {/* 6-digit code input — larger touch targets */}
      <div className="flex justify-center gap-2.5 xs:gap-3" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`w-11 h-14 xs:w-12 xs:h-16 text-center text-xl font-bold border-2 rounded-xl
              bg-[var(--surface)] text-[var(--text-primary)]
              focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]
              transition-all duration-200 outline-none
              ${digit ? "border-brand bg-brand-surface" : error ? "border-danger" : "border-[var(--border)]"}
            `}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Verify button */}
      <Button
        type="button"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={code.join("").length !== CODE_LENGTH}
        onClick={handleSubmit}
      >
        Verify Email
      </Button>

      {/* Resend code */}
      <div className="text-center space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">Didn&apos;t receive the code?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className={`text-sm font-semibold transition-colors ${
            countdown > 0
              ? "text-[var(--text-muted)] cursor-not-allowed"
              : "text-brand hover:text-brand-hover active:scale-[0.98]"
          }`}
        >
          {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
        </button>
      </div>

      {/* Back to register */}
      <div className="text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change email
        </Link>
      </div>
    </div>
  );
}
