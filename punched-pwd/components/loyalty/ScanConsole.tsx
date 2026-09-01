"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import { createIdempotencyKey, enqueueStamp, isNetworkError, queuedStampCount, dequeueStamp } from "@/lib/api/offlineQueue";
import { stampsApi } from "@/lib/api/stamps";
import toast from "react-hot-toast";
import { Loader2, QrCode, ScanLine, User, Clock, Gift } from "lucide-react";
import type { ScanState, ScanErrorCode, ScanSuccessResult } from "@/lib/scanConsoleMachine";
import { initialScanState, scanConsoleReducer, errorGuidance } from "@/lib/scanConsoleMachine";
import { useOfflineReplay } from "@/hooks/useOfflineReplay";

const MONO_FONT = "'Space Mono', monospace";
const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";

export interface ScanConsoleProps {
  businessId: string;
  businessName: string;
  allowAdjust?: boolean;
}

export function ScanConsole({ businessId, businessName, allowAdjust = false }: ScanConsoleProps) {
  const [state, dispatch] = useReducer(scanConsoleReducer, undefined, initialScanState);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualMatch, setManualMatch] = useState<import("@/types").ManualLookupResponse | null>(null);
  const [manualLookupLoading, setManualLookupLoading] = useState(false);
  const [manualLookupError, setManualLookupError] = useState("");

  useOfflineReplay(businessId);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => clearCountdown, [clearCountdown]);

  useEffect(() => {
    if (state.phase === "error" && state.countdown !== undefined && state.countdown > 0) {
      countdownRef.current = setInterval(() => {
        const next = state.countdown! - 1;
        if (next <= 0) {
          clearCountdown();
          dispatch({ type: "RESET" });
        } else {
          dispatch({ type: "COUNTDOWN_TICK", remaining: next });
        }
      }, 1000);
    } else if (countdownRef.current) {
      clearCountdown();
    }
  }, [state.phase === "error" ? state.countdown : undefined, clearCountdown]);

  const currentToken = (): string | undefined => {
    if (state.phase === "resolving") return state.token;
    if (state.phase === "confirm") return state.token;
    if (state.phase === "enroll-confirm") return state.token;
    if (state.phase === "awarding") return state.token;
    if (state.phase === "error") return state.token;
    return undefined;
  };

  const handleScan = useCallback((token: string) => {
    dispatch({ type: "TOKEN_SCANNED", token });
    (async () => {
      try {
        const res = await stampsApi.resolve({ token, businessId });
        if (res.success && res.data) {
          const d = res.data;
          dispatch({ type: "RESOLVED", preview: {
            customerId: d.customerId,
            customerName: d.customerFirstName,
            cardId: d.cardId,
            totalStamps: d.totalStamps,
            stampsRequired: d.stampsRequired,
            stampsRemaining: d.stampsRemaining,
            rewardReady: d.rewardReady,
            programName: d.programName,
            rewardValue: d.rewardValue,
            maxStampsPerVisit: d.maxStampsPerVisit,
          } });
        } else if (res.error?.code === "NOT_ENROLLED") {
          dispatch({ type: "RESOLVE_FAILED", code: "NOT_ENROLLED", message: res.error?.message || "Not enrolled" });
        } else {
          dispatch({ type: "RESOLVE_FAILED", code: mapCode(res.error?.code), message: res.error?.message || "Could not resolve QR code." });
        }
      } catch {
                toast.error("Network error while resolving. Will retry.");
        dispatch({ type: "AWARD_FAILED", code: "NETWORK", message: "Network error while resolving." });
      }
    })();
  }, [businessId]);

  const confirmAward = useCallback(async (stampCount = 1) => {
    const token = currentToken();
    if (!token) return;
    const idempotencyKey = createIdempotencyKey();
    dispatch({ type: "CONFIRM_AWARD", idempotencyKey });
    try {
      const res = await stampsApi.award({ token, businessId, stampCount }, { idempotencyKey });
      if (res.success && res.data) {
        dispatch({ type: "AWARD_SUCCEEDED", result: adapt(res.data) });
        dequeueStamp(idempotencyKey);
        toast.success("Stamp awarded!");
      } else if (res.error?.code === "IDEMPOTENCY_CONFLICT") {
        dispatch({ type: "AWARD_FAILED", code: "IDEMPOTENCY_CONFLICT", message: res.error?.message || "Idempotency conflict." });
      } else {
        throw new Error(res.error?.message || "Failed to award stamp.");
      }
    } catch (err) {
      if (isNetworkError(err)) {
                enqueueStamp({ idempotencyKey, token, businessId, stampCount });
                toast("Stamp queued — will sync when back online");
        dispatch({ type: "AWARD_FAILED", code: "NETWORK", message: "Offline — stamp queued.", queuedIdempotencyKey: idempotencyKey });
        return;
      }
      dispatch({
        type: "AWARD_FAILED",
        code: mapCode((err as { code?: string })?.code),
        message: (err as { message?: string })?.message || "Award failed.",
      });
    }
  }, [businessId]);

  const confirmEnroll = useCallback(async () => {
    const token = currentToken();
    if (!token) return;
    const idempotencyKey = createIdempotencyKey();
    dispatch({ type: "CONFIRM_ENROLL", idempotencyKey });
    try {
      const res = await stampsApi.enrollAndStamp({ token, businessId, stamps: 1 }, { idempotencyKey });
      if (res.success && res.data) {
        dispatch({ type: "AWARD_SUCCEEDED", result: adapt(res.data) });
        dequeueStamp(idempotencyKey);
        toast.success("Customer enrolled & stamped!");
      } else {
        dispatch({ type: "AWARD_FAILED", code: mapCode(res.error?.code), message: res.error?.message || "Enroll failed." });
      }
    } catch (err) {
      dispatch({
        type: "AWARD_FAILED",
        code: mapCode((err as { code?: string })?.code),
        message: (err as { message?: string })?.message || "Enroll failed.",
      });
    }
  }, [businessId]);

  const manualLookup = useCallback(async () => {
    setManualLookupError("");
    setManualMatch(null);
    if (!manualPhone.trim()) {
      setManualLookupError("Enter a phone number.");
      return;
    }
    setManualLookupLoading(true);
    try {
      const res = await stampsApi.lookup({ phone: manualPhone.trim(), businessId });
      if (res.success && res.data) {
        setManualMatch(res.data);
      } else {
        setManualLookupError(res.error?.message || "No customer found.");
      }
    } catch {
      setManualLookupError("Network error. Try again.");
    } finally {
      setManualLookupLoading(false);
    }
  }, [manualPhone, businessId]);

  const manualAward = useCallback(async () => {
    if (!manualMatch) return;
    const token = manualMatch.token;
    const idempotencyKey = createIdempotencyKey();
    dispatch({ type: "CONFIRM_AWARD", idempotencyKey });
    setShowManual(false);
    setManualMatch(null);
    setManualPhone("");
    try {
      const res = await stampsApi.award({ token, businessId, stampCount: 1 }, { idempotencyKey });
      if (res.success && res.data) {
        dispatch({ type: "AWARD_SUCCEEDED", result: adapt(res.data) });
        toast.success("Stamp awarded (manual entry).");
      } else {
        dispatch({ type: "AWARD_FAILED", code: mapCode(res.error?.code), message: res.error?.message || "Award failed." });
      }
    } catch (err) {
      dispatch({
        type: "AWARD_FAILED",
        code: mapCode((err as { code?: string })?.code),
        message: (err as { message?: string })?.message || "Award failed.",
      });
    }
  }, [manualMatch, businessId]);

  let body: React.ReactNode;
  switch (state.phase) {
    case "idle":
    case "scanning":
      body = (
        <>
          <button onClick={() => dispatch({ type: "START_SCAN" })} className="w-full bg-[var(--text-primary)] text-[var(--background)] py-4 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors flex items-center justify-center gap-2" style={{ fontFamily: HEADLINE_FONT }}>
            <ScanLine className="h-5 w-5" /> Start Scanning
          </button>
        </>
      );
      break;
    case "resolving":
      body = <div className="border border-[var(--border)] bg-[var(--surface-raised)] py-12 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-brand" /><p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Reading code…</p></div>;
      break;
    case "confirm":
      body = renderConfirm(state);
      break;
    case "enroll-confirm":
      body = renderEnrollConfirm(state);
      break;
    case "awarding":
      body = <div className="border border-[var(--border)] bg-[var(--surface-raised)] py-14 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-brand" /><p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Awarding stamp…</p></div>;
      break;
    case "success":
      body = <StampSuccessOverlay result={state.result} onClose={() => dispatch({ type: "RESET" })} />;
      break;
    case "queued":
      body = renderQueued();
      break;
    case "error":
      body = renderError(state);
      break;
  }

  return (
    <div className="relative w-full max-w-lg mx-auto px-5 py-8 min-h-[70vh] flex flex-col">
      <div className="mb-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>{businessName}</p>
      </div>
      {queuedStampCount() > 0 && state.phase !== "queued" && (
        <div className="mb-4 bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand" />
          <span className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>{queuedStampCount()} stamp(s) queued offline</span>
        </div>
      )}
      {body}

      {state.phase === "scanning" && (
        <div className="mt-6">
          <QRScanner onScan={handleScan} isActive={state.phase === "scanning"} />
          <button onClick={() => setShowManual((v) => !v)} className="mt-4 w-full bg-transparent text-brand py-3 font-mono text-sm uppercase border border-brand hover:bg-brand-light/20 transition-colors" style={{ fontFamily: MONO_FONT }}>
            {showManual ? "← Back to QR scan" : "Manual entry (phone)"}
          </button>
          {showManual && (
            <div className="mt-4 border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Manual entry is logged</p>
              <div className="flex gap-2">
                <input
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="e.g. +254712345678"
                  disabled={manualLookupLoading}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand"
                  style={{ fontFamily: MONO_FONT }}
                />
                <button
                  onClick={manualLookup}
                  disabled={manualLookupLoading}
                  className="px-4 py-2 bg-[var(--text-primary)] text-[var(--background)] font-mono text-xs uppercase tracking-widest font-bold disabled:opacity-60"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {manualLookupLoading ? "…" : "Find"}
                </button>
              </div>

              {manualLookupError && (
                <p className="mt-3 font-mono text-xs text-red-500" style={{ fontFamily: MONO_FONT }}>{manualLookupError}</p>
              )}

              {manualMatch && (
                <div className="mt-4">
                  <p className="font-mono text-sm text-[var(--text-primary)]" style={{ fontFamily: MONO_FONT }}>
                    Match: <span className="font-bold">{manualMatch.maskedName}</span>
                  </p>
                  <button
                    onClick={manualAward}
                    className="mt-3 w-full bg-[var(--text-primary)] text-[var(--background)] py-3 font-mono text-xs uppercase tracking-widest font-bold"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    Award 1 stamp
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={() => dispatch({ type: "CANCEL" })} className="mt-4 w-full bg-transparent text-[var(--text-secondary)] py-3 font-mono text-sm uppercase border border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors" style={{ fontFamily: MONO_FONT }}>Cancel</button>
          {allowAdjust && (
            <p className="mt-3 text-center font-mono text-[11px] text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>
              Need to fix a customer&apos;s count? Adjust stamps from the customer page.
            </p>
          )}
        </div>
      )}
    </div>
  );

  function renderConfirm(s: Extract<ScanState, { phase: "confirm" }>) {
    const p = s.preview;
    const remaining = Math.max(p.stampsRequired - (p.totalStamps || 0), 0);
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>{p.customerName}</h2>
          <p className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>{p.programName} · {p.totalStamps} / {p.stampsRequired}</p>
        </div>
        <div className="flex justify-center"><ProgressRing value={p.totalStamps || 0} max={p.stampsRequired} /></div>
        <p className="font-mono text-sm text-center text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>
          {remaining === 0 ? `Reward ready — ${p.rewardValue}` : `${remaining} stamps until ${p.rewardValue}`}
        </p>
        <button onClick={() => confirmAward()} className="w-full bg-[var(--text-primary)] text-[var(--background)] py-4 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors flex items-center justify-center gap-2" style={{ fontFamily: HEADLINE_FONT }}>
          <Gift className="h-5 w-5" /> Give Stamp & Confirm
        </button>
        <button onClick={() => dispatch({ type: "CANCEL" })} className="w-full bg-transparent text-[var(--text-secondary)] py-3 font-mono text-sm uppercase border border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors" style={{ fontFamily: MONO_FONT }}>Cancel</button>
      </div>
    );
  }

  function renderEnrollConfirm(s: Extract<ScanState, { phase: "enroll-confirm" }>) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto border border-[var(--border)] rounded-full bg-brand-surface"><User className="h-8 w-8 text-brand" /></div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>New customer</h2>
        <p className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}><span className="font-medium text-[var(--text-primary)]">{s.customerName}</span> is not yet enrolled.</p>
        <p className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: MONO_FONT }}>Enroll & give first stamp to activate their card.</p>
        <button onClick={confirmEnroll} className="w-full bg-[var(--text-primary)] text-[var(--background)] py-4 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors flex items-center justify-center gap-2" style={{ fontFamily: HEADLINE_FONT }}>
          <Gift className="h-5 w-5" /> Enroll & give first stamp
        </button>
        <button onClick={() => dispatch({ type: "CANCEL" })} className="w-full bg-transparent text-[var(--text-secondary)] py-3 font-mono text-sm uppercase border border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors" style={{ fontFamily: MONO_FONT }}>Cancel</button>
      </div>
    );
  }

  function renderQueued() {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Clock className="h-8 w-8 mx-auto text-brand animate-pulse" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>Stamp queued</h2>
        <p className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontFamily: MONO_FONT }}>Network unavailable. This stamp will sync when back online.</p>
        <button onClick={() => dispatch({ type: "RESET" })} className="w-full bg-[var(--text-primary)] text-[var(--background)] py-3 font-mono text-sm uppercase tracking-widest font-bold" style={{ fontFamily: MONO_FONT }}>Scan another</button>
      </div>
    );
  }

  function renderError(s: Extract<ScanState, { phase: "error" }>) {
    const g = errorGuidance(s);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center w-20 h-20 mx-auto border border-[var(--border)]"><QrCode className="h-10 w-10 text-[var(--text-tertiary)] opacity-60" strokeWidth={1.25} /></div>
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-2" style={{ fontFamily: MONO_FONT }}>System Alert</p>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]" style={{ fontFamily: HEADLINE_FONT }}>{g.headline}</h2>
        </div>
        <p className="font-mono text-sm leading-relaxed text-[var(--text-tertiary)] border-y border-[var(--border)] py-4 text-center" style={{ fontFamily: MONO_FONT }}>{g.body}</p>
        {s.countdown !== undefined && (<p className="text-center font-mono text-xs text-brand" style={{ fontFamily: MONO_FONT }}>Returning to scan in {s.countdown}…</p>)}
        <button onClick={() => { if (g.autoReturn) dispatch({ type: "RESET" }); else dispatch({ type: "CANCEL" }); }} className="w-full bg-[var(--text-primary)] text-[var(--background)] py-3.5 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors" style={{ fontFamily: MONO_FONT }}>{g.ctaLabel}</button>
      </div>
    );
  }
}

function mapCode(code: string | undefined): ScanErrorCode {
  switch (code) {
    case "NOT_ENROLLED": return "NOT_ENROLLED";
    case "TOKEN_EXPIRED": return "TOKEN_EXPIRED";
    case "TOKEN_USED": return "TOKEN_USED";
    case "INVALID_TOKEN": return "INVALID_TOKEN";
    case "STAMP_LIMIT_EXCEEDED": return "STAMP_LIMIT_EXCEEDED";
    case "IDEMPOTENCY_CONFLICT": return "IDEMPOTENCY_CONFLICT";
    default: return "UNKNOWN";
  }
}

function adapt(a: import("@/types").StampAwardedResponse): ScanSuccessResult {
  return { cardId: a.cardId, customerId: a.customerId, customerName: a.customerName, stampNumber: a.stampNumber, totalStamps: a.totalStamps, stampsRequired: a.stampsRequired, rewardReady: a.rewardReady, rewardDescription: a.rewardDescription, stampedAt: a.stampedAt ?? new Date().toISOString() };
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const dash = 326.7;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--brand-ring)" strokeWidth="6" strokeDasharray={dash} strokeDashoffset={dash - (pct / 100) * dash} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" className="font-mono text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: MONO_FONT }}>{value}/{max}</text>
    </svg>
  );
}
