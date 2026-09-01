"use client";

import { RequireModule } from "@/components/modules/RequireModule";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { ScanConsole } from "@/components/loyalty/ScanConsole";
import { Loader2, Store } from "lucide-react";
import { useState, useEffect } from "react";

function StaffScanPageContent() {
  useRoleGuard("Staff");
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    businessesApi
      .getStaffBusiness()
      .then((res) => {
        if (res.success && res.data) {
          setBusinessId(res.data.businessId);
          setBusinessName(res.data.businessName);
        } else {
          setNotLinked(true);
        }
      })
      .catch(() => setNotLinked(true))
      .finally(() => setIsLoadingBusiness(false));
  }, []);

  if (isLoadingBusiness) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (notLinked || !businessId) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center border border-[var(--border)] bg-[var(--surface-raised)] p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-[var(--border)] bg-[var(--background)]">
            <Store className="h-6 w-6 text-[var(--text-tertiary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Not linked to a business
          </h2>
          <p className="font-mono text-sm text-[var(--text-secondary)] mb-6" style={{ fontFamily: "'Space Mono', monospace" }}>
            You need to be linked to a business to scan customer QR codes.
          </p>
        </div>
      </main>
    );
  }

  return <ScanConsole businessId={businessId} businessName={businessName} allowAdjust={false} />;
}

export default function StaffScanPage() {
  return (
    <RequireModule module="stamps">
      <StaffScanPageContent />
    </RequireModule>
  );
}
