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
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-brand-surface rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="h-7 w-7 text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Forgot password</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Enter your email address to receive a secure reset code.
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>SEND RESET CODE</>
              )}
            </button>
          </form>
        </>
      )}

      {/* Step 2: Code + new password */}
      {step === "reset" && (
        <>
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Reset password</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* 6-digit code input */}
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-[var(--border)] rounded-xl focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                />
              ))}
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full pl-4 pr-10 py-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 space-y-1 text-xs">
                  <p className={hasMinLength ? "text-green-600" : "text-[var(--text-tertiary)]"}>
                    {hasMinLength ? "✓" : "○"} At least 8 characters
                  </p>
                  <p className={hasUppercase ? "text-green-600" : "text-[var(--text-tertiary)]"}>
                    {hasUppercase ? "✓" : "○"} One uppercase letter
                  </p>
                  <p className={hasNumber ? "text-green-600" : "text-[var(--text-tertiary)]"}>
                    {hasNumber ? "✓" : "○"} One number
                  </p>
                  <p className={hasSpecial ? "text-green-600" : "text-[var(--text-tertiary)]"}>
                    {hasSpecial ? "✓" : "○"} One special character
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join("").length !== 6 || !isPasswordValid}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>RESET PASSWORD</>
              )}
            </button>
          </form>
        </>
      )}

      {/* Back to login */}
      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:text-brand-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>

      {/* Help text */}
      {step === "email" && (
        <>
          <div className="border-t border-[var(--border-light)]" />
          <div className="bg-[var(--surface-raised)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)]">
              <strong className="text-[var(--text-secondary)]">Need assistance?</strong>{" "}
              If you no longer have access to this email, please contact our support team for manual identity verification.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
