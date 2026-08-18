import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";

// ═══════════════════════════════════════════════════════════════
//  Business Registration Page
//  Route: /business-register
//  Onboarding for business owners (atomic owner + business creation).
// ═══════════════════════════════════════════════════════════════

export default function BusinessRegisterPage() {
  return (
    <div>
      <BusinessRegisterForm />
    </div>
  );
}