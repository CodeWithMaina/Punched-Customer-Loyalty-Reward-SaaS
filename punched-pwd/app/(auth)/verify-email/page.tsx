import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

// ═══════════════════════════════════════════════════════════════
//  Verify Email Page
//  Route: /verify-email?email=...
//  UI Spec: 06_FRONTEND_SCREENS.md — Screen #2
// ═══════════════════════════════════════════════════════════════

export default function VerifyEmailPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1 text-center">
        Verify Your Email
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 text-center">
        Enter the 6-digit code we sent to your email.
      </p>
      <Suspense fallback={<div className="text-center text-[var(--text-tertiary)]">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
