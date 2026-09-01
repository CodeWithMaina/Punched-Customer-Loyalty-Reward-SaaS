"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { redemptionsApi } from "@/lib/api/redemptions";
import Link from "next/link";
import { ScanLine, Gift, Loader2, Stamp, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StampingOnboarding } from "@/components/onboarding/StampingOnboarding";
import type { BusinessDashboardResponse, RedemptionResponse } from "@/types";

const MONO_FONT = "'Space Mono', monospace";
const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";

export default function BusinessStampingPage() {
  useRoleGuard("Business");
  const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
  const [pending, setPending] = useState<RedemptionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dashRes, pendingRes] = await Promise.all([
        businessesApi.getDashboard(),
        redemptionsApi.getPending(),
      ]);
      if (dashRes.success && dashRes.data) setDashboard(dashRes.data);
      if (pendingRes.success && pendingRes.data) setPending(pendingRes.data);
    } catch {
      // surfaced via stale data; next poll retries
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000); // live-ish feed: poll every 30s
    return () => clearInterval(timer);
  }, [load]);

  const stampsToday = dashboard?.stampsToday ?? 0;

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto min-h-[70vh]">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand mb-1" style={{ fontFamily: MONO_FONT }}>Stamping ops</p>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Today at a glance</h1>
        </div>
        <button
          onClick={load}
          className="p-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      <StampingOnboarding />

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <Stamp className="h-5 w-5 text-brand mb-3" />
              <p className="text-4xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>{stampsToday}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1" style={{ fontFamily: MONO_FONT }}>Stamps today</p>
            </div>
            <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-5">
              <Gift className="h-5 w-5 text-brand mb-3" />
              <p className="text-4xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>{pending.length}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1" style={{ fontFamily: MONO_FONT }}>Pending rewards</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/dashboard/business/scan" className="flex items-center gap-4 border border-[var(--border)] bg-[var(--surface-raised)] p-4 hover:border-[var(--text-primary)] transition-colors">
              <span className="flex h-11 w-11 items-center justify-center border border-[var(--border)]">
                <ScanLine className="h-5 w-5 text-brand" />
              </span>
              <span>
                <span className="block font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Scan console</span>
                <span className="block font-mono text-xs text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Award stamps, enroll new customers</span>
              </span>
            </Link>

            <Link href="/dashboard/business/rewards" className="flex items-center gap-4 border border-[var(--border)] bg-[var(--surface-raised)] p-4 hover:border-[var(--text-primary)] transition-colors">
              <span className="flex h-11 w-11 items-center justify-center border border-[var(--border)]">
                <Gift className="h-5 w-5 text-brand" />
              </span>
              <span>
                <span className="block font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Rewards fulfillment</span>
                <span className="block font-mono text-xs text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>
                  {pending.length > 0 ? `${pending.length} reward(s) waiting for code verification` : "Verify customer fulfilment codes"}
                </span>
              </span>
            </Link>

            <Link href="/dashboard/business/poster" className="flex items-center gap-4 border border-[var(--border)] bg-[var(--surface-raised)] p-4 hover:border-[var(--text-primary)] transition-colors">
              <span className="flex h-11 w-11 items-center justify-center border border-[var(--border)]">
                <Gift className="h-5 w-5 text-brand" />
              </span>
              <span>
                <span className="block font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Enrollment poster</span>
                <span className="block font-mono text-xs text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Printable QR poster for the counter</span>
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
