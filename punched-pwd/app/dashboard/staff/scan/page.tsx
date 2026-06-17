"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { stampsApi } from "@/lib/api/stamps";
import { businessesApi } from "@/lib/api/businesses";
import type { StampAwardedResponse } from "@/types";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import { Loader2, AlertCircle, ScanLine, Store } from "lucide-react";

// Staff scan page — auto-fetches the linked business ID.
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

  // Auto-fetch linked business
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

  const handleScan = useCallback(async (token: string) => {
    if (!businessId || awardingRef.current || processedTokensRef.current.has(token)) return;
    processedTokensRef.current.add(token);
    awardingRef.current = true;
    setIsScanning(false);
    setIsAwarding(true);
    setError(null);
    setResult(null);

    try {
      const res = await stampsApi.award({ token, businessId });
      if (res.success && res.data) setResult(res.data);
      else setError(res.error?.message ?? "Failed to award stamp");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      awardingRef.current = false;
      setIsAwarding(false);
    }
  }, [businessId]);

  function reset() {
    setResult(null);
    setError(null);
    processedTokensRef.current.clear();
    setIsScanning(true);
  }

  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (notLinked) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
          <Store className="h-8 w-8 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Not Linked to a Business</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Ask your business manager to link your account so you can start scanning customer QR codes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scan QR Code</h1>
        <p className="text-sm text-[var(--text-secondary)]">Award stamps to customers</p>
      </div>

      {/* Linked business info */}
      <div className="bg-brand-surface border border-brand-light rounded-xl px-4 py-3 flex items-center gap-3">
        <Store className="h-5 w-5 text-brand flex-shrink-0" />
        <div>
          <p className="text-xs text-brand font-medium uppercase tracking-wide">Scanning for</p>
          <p className="font-semibold text-brand-dark">{businessName}</p>
        </div>
      </div>

      {!isScanning && !isAwarding && !result && !error && (
        <button
          onClick={() => setIsScanning(true)}
          className="w-full flex items-center justify-center gap-3 bg-brand text-white rounded-2xl py-4 font-semibold hover:bg-brand-hover transition-colors"
        >
          <ScanLine className="h-5 w-5" />
          Start Scanning
        </button>
      )}

      {isScanning && (
        <div className="space-y-4">
          <QRScanner onScan={handleScan} isActive={isScanning} />
          <button onClick={() => setIsScanning(false)} className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">
            Cancel
          </button>
        </div>
      )}

      {isAwarding && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-[var(--text-secondary)]">Awarding stamp...</p>
        </div>
      )}

      {result && (
        <StampSuccessOverlay result={result} onClose={reset} />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={reset} className="w-full bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl py-2.5 font-medium text-sm hover:bg-[var(--border)] transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
