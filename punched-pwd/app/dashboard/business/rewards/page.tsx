"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { redemptionsApi } from "@/lib/api/redemptions";
import { fulfilmentCodeSchema } from "@/lib/validations/stamping";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, ShieldCheck, XCircle } from "lucide-react";
import type { RedemptionResponse } from "@/types";

const MONO_FONT = "'Space Mono', monospace";
const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";

export default function BusinessRewardsPage() {
  useRoleGuard("Business");
  const [businessId, setBusinessId] = useState("");
  const [pending, setPending] = useState<RedemptionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RedemptionResponse | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await redemptionsApi.getPending();
      if (res.success && res.data) setPending(res.data);
      else if (res.error) toast.error(res.error.message || "Failed to load pending rewards.");
    } catch {
      toast.error("Network error while loading pending rewards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    businessesApi
      .getMine()
      .then((res) => {
        if (res.success && res.data) setBusinessId(res.data.id);
      })
      .finally(() => load());
  }, [load]);

  const verifyCode = async () => {
    if (!selected) return;
    const parsed = fulfilmentCodeSchema.safeParse(code.trim().toUpperCase());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter the 6-character code");
      return;
    }
    setVerifying(true);
    try {
      const res = await redemptionsApi.fulfill({ cardId: selected.cardId, code: code.trim().toUpperCase(), businessId });
      if (res.success) {
        toast.success(`Reward fulfilled for ${selected.customerName ?? "customer"}!`);
        setSelected(null);
        setCode("");
        load();
      } else if (res.error?.code === "INVALID_CODE") {
        toast.error("Incorrect code — check with the customer.");
      } else if (res.error?.code === "CODE_LOCKED") {
        toast.error("Too many wrong attempts — this redemption is locked.");
      } else {
        toast.error(res.error?.message || "Fulfillment failed.");
      }
    } catch {
      toast.error("Network error while verifying the code.");
    } finally {
      setVerifying(false);
    }
  };

  const cancelRedemption = async (redemption: RedemptionResponse) => {
    if (!window.confirm(`Cancel this redemption and restore the stamps to ${redemption.customerName ?? "the customer"}?`)) return;
    setCancellingId(redemption.id);
    try {
      const res = await redemptionsApi.cancel(redemption.id, { note: "Cancelled from rewards console." });
      if (res.success) {
        toast.success("Redemption cancelled — stamps restored.");
        load();
      } else {
        toast.error(res.error?.message || "Cancel failed.");
      }
    } catch {
      toast.error("Network error while cancelling.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto min-h-[70vh]">
      <header className="mb-8">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand mb-1" style={{ fontFamily: MONO_FONT }}>Rewards console</p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Fulfill rewards</h1>
        <p className="font-mono text-xs text-[var(--text-secondary)] mt-2" style={{ fontFamily: MONO_FONT }}>
          Ask the customer for their 6-character code, then verify to complete the redemption.
        </p>
      </header>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
      ) : pending.length === 0 ? (
        <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-10 text-center">
          <Gift className="h-10 w-10 mx-auto text-[var(--text-tertiary)] mb-4" strokeWidth={1.25} />
          <p className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>
            No pending rewards right now.
          </p>
          <Link href="/dashboard/business/scan" className="inline-block mt-4 font-mono text-xs uppercase tracking-widest text-brand underline" style={{ fontFamily: MONO_FONT }}>
            Go to Scan
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((r) => (
            <li key={r.id} className="border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>
                    {r.customerName ?? "Customer"}
                  </p>
                  <p className="font-mono text-xs text-[var(--text-secondary)] mt-1" style={{ fontFamily: MONO_FONT }}>
                    {r.rewardDescription} · claimed {new Date(r.redeemedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--border)] text-brand" style={{ fontFamily: MONO_FONT }}>
                  {r.status}
                </span>
              </div>

              {selected?.id === r.id ? (
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="ABC234"
                    autoFocus
                    className="w-full bg-[var(--surface)] border border-[var(--border)] px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center uppercase text-[var(--text-primary)] focus:outline-none focus:border-brand"
                    style={{ fontFamily: MONO_FONT }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={verifyCode}
                      disabled={verifying}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--background)] py-3 font-mono text-xs uppercase tracking-widest font-bold disabled:opacity-60"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify & fulfill
                    </button>
                    <button
                      onClick={() => { setSelected(null); setCode(""); }}
                      className="px-4 py-3 font-mono text-xs uppercase border border-[var(--border)] text-[var(--text-secondary)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setSelected(r); setCode(""); }}
                    className="flex-1 bg-[var(--text-primary)] text-[var(--background)] py-2.5 font-mono text-xs uppercase tracking-widest font-bold"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    Verify code
                  </button>
                  <button
                    onClick={() => cancelRedemption(r)}
                    disabled={cancellingId === r.id}
                    className="px-4 py-2.5 flex items-center gap-2 font-mono text-xs uppercase border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-400 disabled:opacity-60"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {cancellingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


