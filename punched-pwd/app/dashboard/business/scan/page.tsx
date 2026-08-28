"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { stampsApi } from "@/lib/api/stamps";
import type { StampAwardedResponse, Business } from "@/types";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import { Loader2, QrCode, ScanLine } from "lucide-react";

function BusinessScanPageContent() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [result, setResult] = useState<StampAwardedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const awardingRef = useRef(false);
  const processedTokensRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    businessesApi
      .getMine()
      .then((res) => { if (res.success && res.data) setBusiness(res.data); })
      .finally(() => setIsLoadingBusiness(false));
  }, []);

  const handleScan = useCallback(async (token: string) => {
    if (!business || awardingRef.current || processedTokensRef.current.has(token)) return;
    processedTokensRef.current.add(token);
    awardingRef.current = true;
    setIsScanning(false);
    setIsAwarding(true);
    setError(null);
    setResult(null);

    try {
      const res = await stampsApi.award({ token, businessId: business.id });
      if (res.success && res.data) setResult(res.data);
      else setError(res.error?.message ?? "Failed to award stamp");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      awardingRef.current = false;
      setIsAwarding(false);
    }
  }, [business]);

  function reset() {
    setResult(null);
    setError(null);
    processedTokensRef.current.clear();
    setIsScanning(true);
  }

  if (isLoadingBusiness) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>;
  }

  if (!business) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-[var(--text-secondary)]">No business found. Create one first.</p></div>;
  }

  return (
    <div className="relative max-w-lg mx-auto px-5 py-8 min-h-[70vh] flex flex-col">
      {/* Watermark */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.03] z-0 select-none"
      >
        <span
          className="font-extrabold leading-none tracking-tighter text-[var(--text-primary)] text-[30vw] whitespace-nowrap"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          SCAN
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header */}
        <header>
          <p className="text-[12px] tracking-[0.15em] uppercase font-bold text-brand">Stamp Station</p>
          <h1
            className="mt-1 text-2xl md:text-3xl font-bold uppercase tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Scan Customer QR
          </h1>
        </header>

        {!isScanning && !isAwarding && !result && !error && (
          <>
            {/* Idle viewport preview */}
            <div className="relative aspect-square border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center overflow-hidden">
              {["top-0 left-0 border-t-[3px] border-l-[3px]", "top-0 right-0 border-t-[3px] border-r-[3px]", "bottom-0 left-0 border-b-[3px] border-l-[3px]", "bottom-0 right-0 border-b-[3px] border-r-[3px]"].map((cls, i) => (
                <div key={i} aria-hidden className={`absolute w-10 h-10 border-[var(--border)] ${cls}`} />
              ))}
              <div className="text-center px-6">
                <ScanLine className="h-10 w-10 text-brand mx-auto mb-4" strokeWidth={1.5} />
                <p
                  className="text-lg font-semibold tracking-wide text-[var(--text-primary)]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Ready to Scan
                </p>
                <p className="font-mono text-xs text-[var(--text-tertiary)] mt-2 max-w-[240px]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  Ask the customer to show their loyalty QR code.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsScanning(true)}
              className="w-full bg-[var(--text-primary)] text-[var(--background)] py-4 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Start Scanning
            </button>
          </>
        )}

        {isScanning && (
          <div className="flex flex-col gap-6">
            <QRScanner onScan={handleScan} isActive={isScanning} />
            <button
              onClick={() => setIsScanning(false)}
              className="w-full bg-transparent text-[var(--text-secondary)] py-3 font-mono text-sm uppercase tracking-[0.3em] border border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Cancel
            </button>
          </div>
        )}


        {isAwarding && (
          <div className="border border-[var(--border)] bg-[var(--surface-raised)] py-14 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
              Awarding stamp...
            </p>
          </div>
        )}

        {result && <StampSuccessOverlay result={result} onClose={reset} />}

        {error && (
          <section className="relative border border-accent/40 bg-[var(--surface-raised)] overflow-hidden">
            <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-accent/50" />
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="relative w-20 h-20 border border-[var(--border)] flex items-center justify-center">
                <QrCode className="h-10 w-10 text-[var(--text-tertiary)] opacity-60" strokeWidth={1.25} />
                <div aria-hidden className="absolute w-[110%] h-[2px] bg-accent -rotate-45 shadow-[0_0_12px_var(--accent)]" />
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-2" style={{ fontFamily: "'Space Mono', monospace" }}>
                  System Alert
                </p>
                <h2
                  className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Invalid Code
                </h2>
              </div>
              <p className="font-mono text-sm leading-relaxed text-[var(--text-tertiary)] border-y border-[var(--border)] py-4" style={{ fontFamily: "'Space Mono', monospace" }}>
                {error}
              </p>
              <button
                onClick={reset}
                className="w-full bg-[var(--text-primary)] text-[var(--background)] py-3.5 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Try Again
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function BusinessScanPage() {
  return (
    <RequireModule module="stamps">
      <BusinessScanPageContent />
    </RequireModule>
  );
}