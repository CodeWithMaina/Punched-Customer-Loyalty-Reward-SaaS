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
      <Suspense fallback={<div className="text-center text-[var(--text-tertiary)] font-mono">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
