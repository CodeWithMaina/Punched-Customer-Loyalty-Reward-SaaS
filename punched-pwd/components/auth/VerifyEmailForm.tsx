"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
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
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6">
        <div className="w-14 h-14 border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center mb-4">
          <Mail className="h-7 w-7 text-brand" strokeWidth={1.5} />
        </div>
        <h2
          className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Check your email
        </h2>
        <p className="font-mono text-sm text-[var(--text-tertiary)] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          We sent a 6-digit code to{" "}
          <span className="font-bold text-[var(--text-secondary)]">{email}</span>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="border border-accent/40 bg-[var(--accent-light)] text-accent-text font-mono text-sm px-4 py-3 text-center animate-scale-in"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {error}
        </div>
      )}

      {/* 6-digit code input — larger touch targets */}
      <div className="flex flex-col gap-3">
        <label
          className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Authentication Code
        </label>
        <div className="flex justify-center gap-2 xs:gap-3" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-full max-w-[48px] h-16 xs:h-16 text-center font-mono text-xl font-bold rounded-none
                bg-transparent border-0 border-b outline-none transition-all duration-200
                focus:bg-[var(--surface-raised)]
                ${digit ? "border-brand" : error ? "border-accent" : "border-[var(--border)]"}
                ${digit ? "focus:border-brand" : "focus:border-[var(--text-primary)]"}
              `}
              style={{ fontFamily: "'Space Mono', monospace", color: "var(--text-primary)" }}
              autoFocus={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Verify button */}
      <Button
        type="button"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={code.join("").length !== CODE_LENGTH}
        onClick={handleSubmit}
        className="rounded-none uppercase tracking-widest font-bold border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] hover:bg-transparent hover:text-[var(--text-primary)] shadow-none hover:shadow-none"
      >
        Verify Email →
      </Button>

      {/* Resend code */}
      <div className="text-center space-y-2">
        <p className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
          Didn&apos;t receive the code?
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className={`font-mono text-sm font-semibold underline underline-offset-4 transition-colors ${
            countdown > 0
              ? "text-[var(--text-muted)] cursor-not-allowed no-underline"
              : "text-brand active:scale-[0.98]"
          }`}
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
        </button>
      </div>

      {/* Back to register */}
      <div className="text-center border-t border-[var(--border)] pt-5">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 font-mono text-sm text-[var(--text-secondary)] hover:text-brand transition-colors"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change email
        </Link>
      </div>
    </div>
  );
}
