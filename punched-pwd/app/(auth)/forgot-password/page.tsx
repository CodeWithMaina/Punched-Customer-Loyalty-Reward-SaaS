"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import toast from "react-hot-toast";
import { Loader2, Mail, KeyRound, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Forgot Password Page — Full flow:
//  1. Enter email → request reset code
//  2. Enter 6-digit code + new password → reset
//  Route: /forgot-password
// ═══════════════════════════════════════════════════════════════

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first code input when entering reset step
  useEffect(() => {
    if (step === "reset") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Step 1: Request reset code
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      if (res.success) {
        toast.success("If the email is registered, a reset code has been sent.");
        setStep("reset");
      } else {
        toast.error(res.error?.message || "Failed to send reset code.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle code input
  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  // Step 2: Reset password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const codeStr = code.join("");
    if (codeStr.length !== 6 || !newPassword) return;

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        code: codeStr,
        newPassword,
      });
      if (res.success) {
        toast.success("Password reset successfully! You can now log in.");
        router.push("/login");
      } else {
        toast.error(res.error?.message || "Failed to reset password.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  // Password strength indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  return (
    <div className="space-y-6">
      {/* Step 1: Email entry */}
      {step === "email" && (
        <>
          <div className="space-y-2 border-b border-[var(--border)] pb-6">
            <div className="w-14 h-14 border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center mb-4">
              <KeyRound className="h-7 w-7 text-brand" strokeWidth={1.5} />
            </div>
            <h2
              className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Recover Access
            </h2>
            <p className="font-mono text-sm text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
              Enter your email address to receive a secure reset code.
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="forgot-email"
                className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Email Address
              </label>
              <div className="flex items-end">
                <Mail className="h-4 w-4 text-[var(--text-tertiary)] mr-3 mb-3 flex-shrink-0" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  className="w-full py-3 px-1 bg-transparent border-0 border-b border-[var(--border)] rounded-none font-mono text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)] transition-all duration-200"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[var(--text-primary)] hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] text-[var(--background)] font-mono font-bold py-4 rounded-none uppercase tracking-widest transition-colors disabled:opacity-50 disabled:pointer-events-none"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Send Reset Code →</>
              )}
            </button>
          </form>
        </>
      )}

      {/* Step 2: Code + new password */}
      {step === "reset" && (
        <>
          <div className="space-y-2 border-b border-[var(--border)] pb-6">
            <div className="w-14 h-14 border border-ok/40 bg-ok-light flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7 text-ok" strokeWidth={1.5} />
            </div>
            <h2
              className="text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Verify Identity.
            </h2>
            <p className="font-mono text-sm text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
              Enter the 6-digit code sent to <span className="font-bold text-[var(--text-secondary)]">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* 6-digit code input */}
            <div className="flex flex-col gap-3">
              <label
                className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Authentication Code
              </label>
              <div className="flex justify-between gap-2 xs:gap-3" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-full max-w-[48px] h-16 text-center font-mono text-xl font-bold bg-transparent border-0 border-b border-[var(--border)] rounded-none text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)] transition-all duration-200"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  />
                ))}
              </div>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="new-password"
                className="block text-[12px] tracking-[0.15em] font-bold uppercase text-[var(--text-secondary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full py-3 pr-10 pl-1 bg-transparent border-0 border-b border-[var(--border)] rounded-none font-mono text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)] transition-all duration-200"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Segmented strength meter */}
              {newPassword && (
                <>
                  <div className="flex gap-1 h-1 w-full mt-2">
                    {[hasMinLength, hasUppercase, hasNumber, hasSpecial].map((met, i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-colors duration-500 ${met ? "bg-brand" : "bg-[var(--border)]"}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 font-mono text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {[
                      { met: hasMinLength, label: "At least 8 characters" },
                      { met: hasUppercase, label: "One uppercase letter" },
                      { met: hasNumber, label: "One number" },
                      { met: hasSpecial, label: "One special character" },
                    ].map(({ met, label }) => (
                      <p key={label} className={met ? "text-ok-text" : "text-[var(--text-tertiary)]"}>
                        {met ? "✓" : "○"} {label}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join("").length !== 6 || !isPasswordValid}
              className="w-full flex items-center justify-center gap-2 mt-2 bg-[var(--text-primary)] hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] text-[var(--background)] font-mono font-bold py-4 rounded-none uppercase tracking-widest transition-colors disabled:opacity-50 disabled:pointer-events-none"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Update Password →</>
              )}
            </button>
          </form>
        </>
      )}

      {/* Back to login */}
      <div className="text-center pt-2 border-t border-[var(--border)]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-mono text-sm text-brand font-semibold underline underline-offset-4"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>

      {/* Help text */}
      {step === "email" && (
        <>
          <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed" style={{ fontFamily: "'Space Mono', monospace" }}>
              <strong className="text-[var(--text-primary)]">Need assistance?</strong>{" "}
              If you no longer have access to this email, please contact our support team for manual identity verification.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
