"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { Business, LoyaltyProgram } from "@/types";

const MONO_FONT = "'Space Mono', monospace";
const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";

const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "";

export default function BusinessPosterPage() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessesApi
      .getMine()
      .then((res) => setBusiness(res.success && res.data ? res.data : null))
      .finally(() => setLoading(false));
  }, []);

  const program: LoyaltyProgram | undefined =
    business?.loyaltyProgram ?? business?.loyaltyPrograms?.find((p) => p.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const term = program
    ? `${program.stampsRequired} stamps = ${program.rewardDescription || `reward worth ${program.rewardValue}`}`
    : "Collect stamps, earn rewards";

  const enrollmentUrl = business ? `${ORIGIN}/dashboard/explore/${business.id}` : ORIGIN;

  return (
    <div className="px-5 py-8 min-h-[70vh]">
      <header className="mb-6 flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand mb-1" style={{ fontFamily: MONO_FONT }}>Enrollment poster</p>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Print & display</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--background)] px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold"
          style={{ fontFamily: MONO_FONT }}
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </header>

      <div className="max-w-lg mx-auto poster-sheet border border-[var(--border)] bg-[var(--surface-raised)] p-8 print:p-0">
        {business?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt={business.name} className="h-16 w-16 object-contain mb-4 mx-auto" />
        )}
        <h2 className="text-4xl font-bold text-center text-[var(--text-primary)] mb-2" style={{ fontFamily: HEADLINE_FONT }}>
          {business?.name ?? "Our Loyalty Program"}
        </h2>
        <p className="text-center font-mono text-sm text-[var(--text-secondary)] mb-8" style={{ fontFamily: MONO_FONT }}>
          {business?.description ?? "Scan to join our loyalty program"}
        </p>

        <div className="flex justify-center mb-8 print:border print:border-black">
          <QRCodeSVG value={enrollmentUrl} size={220} level="M" />
        </div>

        <p className="text-center font-bold text-lg text-[var(--text-primary)] mb-1" style={{ fontFamily: HEADLINE_FONT }}>
          {term}
        </p>
        <p className="text-center font-mono text-xs uppercase tracking-widest text-brand mb-8" style={{ fontFamily: MONO_FONT }}>
          Scan the QR code to join
        </p>

        <p className="text-center font-mono text-[11px] text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>
          Show this at the counter — customers scan to enroll & collect stamps
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .poster-sheet {
            border: none !important;
            box-shadow: none !important;
          }
          body * { visibility: hidden; }
          .poster-sheet, .poster-sheet * { visibility: visible; }
          .poster-sheet { position: absolute; inset: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}