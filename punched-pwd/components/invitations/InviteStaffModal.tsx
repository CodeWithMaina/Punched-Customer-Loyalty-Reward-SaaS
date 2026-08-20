"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, X, Loader2, Send } from "lucide-react";
import { onboardingApi } from "@/lib/api/onboarding";

// ═══════════════════════════════════════════════════════════════
//  InviteStaffModal — business owner invites a staff member by email.
//  Sends an invitation the staff member accepts to become a staff user.
//  Email replaces the old "link by user ID" flow entirely.
// ═══════════════════════════════════════════════════════════════

interface InviteStaffModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful invite so the parent can refresh its list. */
  onInvited?: () => void;
}

export function InviteStaffModal({
  open,
  onClose,
  onInvited,
}: InviteStaffModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    setIsSubmitting(true);
    try {
      const res = await onboardingApi.createStaffInvitation({ email: value });
      if (res.success && res.data) {
        toast.success(
          `Invitation sent to ${res.data.email}. They'll get an email to join.`
        );
        setEmail("");
        onClose();
        onInvited?.();
      } else {
        toast.error(res.error?.message ?? "Failed to send the invitation.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <button
        aria-label="Close invite dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <section className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] shadow-elevated animate-slide-up p-5 sm:p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface">
              <Mail className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Invite a Staff Member
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                They&apos;ll get an email to join your team.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--border-light)] hover:bg-[var(--border)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-[var(--accent-light)] p-3 text-xs leading-relaxed text-[var(--accent-text)]">
          Staff can scan customer QR codes and award stamps. They cannot edit
          your programs or view financial data. Use the staff member&apos;s email —
          no user ID needed.
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Staff email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@business.com"
                required
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-[0_6px_18px_var(--brand-ring)] transition-all hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </section>
    </div>
  );
}
