"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { stampsApi } from "@/lib/api/stamps";
import type { StampAwardedResponse, Business } from "@/types";
import { QRScanner } from "@/components/loyalty/QRScanner";
import { StampSuccessOverlay } from "@/components/loyalty/StampSuccessOverlay";
import { Loader2, AlertCircle, ScanLine } from "lucide-react";

export default function BusinessScanPage() {
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scan QR Code</h1>
        <p className="text-sm text-[var(--text-secondary)]">Scan a customer QR code to award a stamp</p>
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
