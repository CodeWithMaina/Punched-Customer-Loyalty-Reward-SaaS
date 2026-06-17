"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { ArrowLeft, Loader2, Eye, EyeOff, Shield, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requirements = [
    { label: "8+ characters", met: newPw.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(newPw) },
    { label: "1 number", met: /[0-9]/.test(newPw) },
    { label: "1 special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(newPw) },
  ];
  const allMet = requirements.every((r) => r.met);
  const passwordsMatch = newPw === confirm && confirm.length > 0;
  const canSubmit = current.length > 0 && allMet && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const res = await authApi.changePassword({ currentPassword: current, newPassword: newPw });
      if (res.success) {
        toast.success("Password changed successfully!");
        router.back();
      } else {
        toast.error(res.error?.message ?? "Failed to change password.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Change Password</h1>
      </div>

      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-2xl bg-brand-surface flex items-center justify-center">
          <Shield className="h-8 w-8 text-brand" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
              className="w-full border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Enter new password"
              className="w-full border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        {newPw.length > 0 && (
          <div className="space-y-1.5 px-1">
            {requirements.map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-xs">
                {r.met ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                <span className={r.met ? "text-green-600" : "text-[var(--text-tertiary)]"}>{r.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)] ${
              confirm.length > 0 && !passwordsMatch ? "border-red-300" : "border-[var(--border)]"
            }`}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors mt-2"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
