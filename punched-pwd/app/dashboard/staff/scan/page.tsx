"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { stampsApi } from "@/lib/api/stamps";
import { businessesApi } from "@/lib/api/businesses";
import type { StampAwardedResponse } from "@/types";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import {
  Loader2,
  QrCode,
  ScanLine,
  Store,
} from "lucide-react";

function StaffScanPageContent() {
  useRoleGuard("Staff");

  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [result, setResult] = useState<StampAwardedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const awardingRef = useRef(false);
  const processedTokensRef = useRef<Set<string>>(new Set());

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

  const handleScan = useCallback(
    async (token: string) => {
      if (
        !businessId ||
        awardingRef.current ||
        processedTokensRef.current.has(token)
      ) {
        return;
      }

      processedTokensRef.current.add(token);
      awardingRef.current = true;

      setIsScanning(false);
      setIsAwarding(true);
      setError(null);
      setResult(null);

      try {
        const res = await stampsApi.award({
          token,
          businessId,
        });

        if (res.success && res.data) {
          setResult(res.data);
        } else {
          setError(
            res.error?.message ?? "We couldn't award the stamp."
          );
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        awardingRef.current = false;
        setIsAwarding(false);
      }
    },
    [businessId]
  );

  function reset() {
    setResult(null);
    setError(null);
    processedTokensRef.current.clear();
    setIsScanning(true);
  }

  function closeScanner() {
    setIsScanning(false);
    setError(null);
  }

  if (isLoadingBusiness) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (notLinked) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center border border-[var(--border)] bg-[var(--surface-raised)] p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-[var(--border)] bg-[var(--background)]">
            <Store className="h-6 w-6 text-accent" />
          </div>

          <h1
            className="text-lg font-bold uppercase tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Business not linked
          </h1>

          <p className="mt-2 font-mono text-sm leading-6 text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
            Ask your business manager to link your staff account before
            scanning customer QR codes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-lg px-5 pb-10">
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

      <div className="relative z-10">
      {/* Header */}
      <header className="pt-6 pb-5">
        <p className="text-[12px] tracking-[0.15em] uppercase font-bold text-brand">Stamp Station</p>

        <h1
          className="mt-1 text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Scan Customer QR
        </h1>
      </header>

      {/* Business */}
      <div className="mb-6 flex items-center gap-3 border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--background)]">
          <Store className="h-4 w-4 text-brand" />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
            Scanning for
          </p>

          <p className="truncate font-mono text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
            {businessName}
          </p>
        </div>
      </div>

      {/* Idle state */}
      {!isScanning &&
        !isAwarding &&
        !result &&
        !error && (
          <section>
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

                <p className="mt-2 max-w-[240px] mx-auto font-mono text-xs leading-5 text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  Ask the customer to show their loyalty QR code.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsScanning(true)}
              className="mt-4 w-full bg-[var(--text-primary)] text-[var(--background)] py-4 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Start Scanning
            </button>
          </section>
        )}

      {/* Scanner */}
      {isScanning && (
        <section className="flex flex-col gap-5">
          <QRScanner
            onScan={handleScan}
            isActive={isScanning}
          />

          <button
            onClick={closeScanner}
            className="w-full bg-transparent text-[var(--text-secondary)] py-3 font-mono text-sm uppercase tracking-[0.3em] border border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Cancel
          </button>
        </section>
      )}

      {/* Awarding */}
      {isAwarding && (
        <section className="border border-[var(--border)] bg-[var(--surface-raised)] px-6 py-14 text-center flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />

          <p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
            Awarding stamp...
          </p>
        </section>
      )}

      {/* Success */}
      {result && (
        <StampSuccessOverlay
          result={result}
          onClose={reset}
        />
      )}

      {/* Error */}
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

      {/* Helper */}
      {!isScanning &&
        !isAwarding &&
        !result &&
        !error && (
          <p className="mt-5 text-center font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
            Only scan the customer&apos;s loyalty QR code.
          </p>
        )}
      </div>
    </main>
  );
}

export default function StaffScanPage() {
  return (
    <RequireModule module="stamps">
      <StaffScanPageContent />
    </RequireModule>
  );
}