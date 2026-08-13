"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { stampsApi } from "@/lib/api/stamps";
import { businessesApi } from "@/lib/api/businesses";
import type { StampAwardedResponse } from "@/types";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import {
  Loader2,
  AlertCircle,
  ScanLine,
  Store,
  Camera,
  X,
} from "lucide-react";

export default function StaffScanPage() {
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
      <main className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-light)]">
            <Store className="h-6 w-6 text-[var(--accent)]" />
          </div>

          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Business not linked
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Ask your business manager to link your staff account before
            scanning customer QR codes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-10">
      {/* Header */}
      <header className="pt-6 pb-5">
        <p className="text-sm font-medium text-brand">
          Customer check-in
        </p>

        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Scan a QR code
        </h1>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Scan the customer's code to give them a stamp.
        </p>
      </header>

      {/* Business */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-surface">
          <Store className="h-4 w-4 text-brand" />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            You're scanning for
          </p>

          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {businessName}
          </p>
        </div>
      </div>

      {/* Idle state */}
      {!isScanning &&
        !isAwarding &&
        !result &&
        !error && (
          <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--surface)] p-5">
            <div className="flex aspect-square max-h-[320px] items-center justify-center rounded-3xl bg-[var(--brand-surface)]">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--brand)] shadow-sm">
                  <ScanLine className="h-9 w-9 text-white" />
                </div>

                <p className="mt-5 text-base font-semibold text-[var(--text-primary)]">
                  Ready to scan
                </p>

                <p className="mt-1 max-w-[220px] text-xs leading-5 text-[var(--text-secondary)]">
                  Ask the customer to show their loyalty QR code.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsScanning(true)}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover active:scale-[0.99]"
            >
              <Camera className="h-5 w-5" />
              Start scanning
            </button>
          </section>
        )}

      {/* Scanner */}
      {isScanning && (
        <section>
          <div className="overflow-hidden rounded-3xl bg-black">
            <QRScanner
              onScan={handleScan}
              isActive={isScanning}
            />
          </div>

          <div className="mt-4 flex items-center justify-center">
            <button
              onClick={closeScanner}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-light)]"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Awarding */}
      {isAwarding && (
        <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--surface)] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-surface">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>

          <h2 className="mt-5 text-base font-semibold text-[var(--text-primary)]">
            Adding stamp
          </h2>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Just a moment...
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
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-red-800">
            Couldn't add the stamp
          </h2>

          <p className="mt-1 text-sm leading-5 text-red-700">
            {error}
          </p>

          <button
            onClick={reset}
            className="mt-5 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
          >
            Try again
          </button>
        </section>
      )}

      {/* Helper */}
      {!isScanning &&
        !isAwarding &&
        !result &&
        !error && (
          <p className="mt-5 text-center text-xs text-[var(--text-tertiary)]">
            Only scan the customer's loyalty QR code.
          </p>
        )}
    </main>
  );
}