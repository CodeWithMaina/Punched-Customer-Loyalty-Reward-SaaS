import { RegisterForm } from "@/components/auth/RegisterForm";

// ═══════════════════════════════════════════════════════════════
//  Register Page
//  Route: /register
//  UI Spec: 06_FRONTEND_SCREENS.md — Screen #1
// ═══════════════════════════════════════════════════════════════

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
        Sign Up with Email
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Create your account to start earning rewards.
      </p>
      <RegisterForm />
    </div>
  );
}
