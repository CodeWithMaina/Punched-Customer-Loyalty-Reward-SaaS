"use client";

import { RequireModule } from "@/components/modules/RequireModule";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { ScanConsole } from "@/components/loyalty/ScanConsole";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Business } from "@/types";

function BusinessScanPageContent() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);

  useEffect(() => {
    businessesApi
      .getMine()
      .then((res) => { if (res.success && res.data) setBusiness(res.data); })
      .finally(() => setIsLoadingBusiness(false));
  }, []);

  if (isLoadingBusiness) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>;
  }

  if (!business) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-[var(--text-secondary)]">No business found. Create one first.</p></div>;
  }

  return <ScanConsole businessId={business.id} businessName={business.name} allowAdjust={true} />;
}

export default function BusinessScanPage() {
  return (
    <RequireModule module="stamps">
      <BusinessScanPageContent />
    </RequireModule>
  );
}
