"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useSSE } from "@/hooks/useSSE";
import { loyaltyApi } from "@/lib/api/loyalty";
import { qrApi } from "@/lib/api/qr";
import { redemptionsApi } from "@/lib/api/redemptions";
import type { LoyaltyCard, QrTokenResponse, SseStampEvent } from "@/types";
import {
  Loader2,
  QrCode,
  RefreshCw,
  CheckCircle,
  Gift,
  Wifi,
  WifiOff,
  Trophy,
  Clock,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { StampAwardedOverlay } from "@/components/loyalty/StampAwardedOverlay";

const QR_REFRESH_INTERVAL_MS = 40_000;

// ── Reward Expiry Countdown ──────────────────────────────────
function useCountdown(expiresAt?: string) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function CardDetailPage() {
  useRoleGuard("Customer");
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [stampFlash, setStampFlash] = useState(false);
  const [rewardReady, setRewardReady] = useState(false);
  const [rewardExpiresAt, setRewardExpiresAt] = useState<string | undefined>(undefined);
  const [isClaiming, setIsClaiming] = useState(false);
  const [stampOverlay, setStampOverlay] = useState<{
    stampNumber: number;
    stampsRequired: number;
    rewardReady: boolean;
  } | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expiryCountdown = useCountdown(rewardExpiresAt);
  const rewardExpired = expiryCountdown === 0 && rewardExpiresAt != null;

  // Load card data
  useEffect(() => {
    loyaltyApi
      .getCard(cardId)
      .then((res) => {
        if (res.success && res.data) {
          setCard(res.data);
          setRewardReady(res.data.totalStamps >= res.data.program.stampsRequired);
          setRewardExpiresAt(res.data.rewardExpiresAt);
        }
      })
      .finally(() => setIsLoadingCard(false));
  }, [cardId]);

  // Generate QR token and schedule auto-refresh
  const generateQr = useCallback(async () => {
    if (!card) return;
    setIsGeneratingQr(true);
    try {
      const res = await qrApi.generate({ businessId: card.businessId });
      if (res.success && res.data) {
        setQrToken(res.data);
        if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
        qrTimerRef.current = setTimeout(generateQr, QR_REFRESH_INTERVAL_MS);
      }
    } finally {
      setIsGeneratingQr(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.businessId]);

  useEffect(() => {
    if (card) generateQr();
    return () => { if (qrTimerRef.current) clearTimeout(qrTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.businessId]);

  // SSE: receive stamp events in real time
  const handleStamp = useCallback((evt: SseStampEvent) => {
    setCard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalStamps: evt.totalStamps,
        lifetimeStamps: (prev.lifetimeStamps ?? 0) + 1,
      };
    });
    setStampFlash(true);
    setRewardReady(evt.rewardReady);
    // Clear expiry when stamps reset (new cycle)
    if (!evt.rewardReady) setRewardExpiresAt(undefined);
    setTimeout(() => setStampFlash(false), 1500);
    // Show celebratory overlay
    setStampOverlay({
      stampNumber: evt.totalStamps,
      stampsRequired: evt.stampsRequired,
      rewardReady: evt.rewardReady,
    });
    generateQr();
  }, [generateQr]);

  const { isConnected } = useSSE(cardId, { onStamp: handleStamp });

  if (isLoadingCard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--text-secondary)]">Card not found.</p>
      </div>
    );
  }

  const stampsRequired = card.program.stampsRequired;
  const totalStamps = card.totalStamps;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Business header */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{card.businessName}</h1>
          <span
            title={isConnected ? "Live updates active" : "Reconnecting..."}
            className={`transition-colors ${isConnected ? "text-green-500" : "text-[var(--text-muted)]"}`}
          >
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{card.program.rewardDescription}</p>

        {/* Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>{totalStamps} / {stampsRequired} stamps</span>
            <span>Lifetime: {card.lifetimeStamps}</span>
          </div>
          <div className="h-2.5 bg-[var(--border-light)] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-700"
              style={{ width: `${Math.min((totalStamps / stampsRequired) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Stamp grid */}
        <div
          className={`mt-4 grid gap-2 transition-all ${stampFlash ? "scale-105" : ""}`}
          style={{ gridTemplateColumns: `repeat(${Math.min(stampsRequired, 6)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: stampsRequired }).map((_, i) => (
            <div
              key={i}
              className={`relative aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                i < totalStamps
                  ? stampFlash && i === totalStamps - 1
                    ? "bg-green-500 border-green-500 scale-110"
                    : "bg-brand border-brand"
                  : "bg-[var(--surface-raised)] border-[var(--border)]"
              }`}
            >
              {i < totalStamps && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {/* Ripple on the newly stamped circle */}
              {stampFlash && i === totalStamps - 1 && (
                <span className="absolute inset-0 rounded-full animate-[ripple_0.8s_ease-out_forwards] border-2 border-green-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reward expired warning */}
      {rewardExpired && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Reward Expired</p>
            <p className="text-xs text-red-600">Your reward window has passed. Keep stamping to earn the next one!</p>
          </div>
        </div>
      )}

      {/* Reward ready banner with countdown + claim button */}
      {rewardReady && !rewardExpired && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800">Reward Ready!</p>
              <p className="text-sm text-green-600">{card.program.rewardDescription}</p>
            </div>
            {/* Countdown timer */}
            {expiryCountdown != null && card.program.rewardExpirationHours > 0 && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                expiryCountdown < 3600000
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}>
                <Clock className="h-3 w-3" />
                {formatCountdown(expiryCountdown)}
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              setIsClaiming(true);
              try {
                const res = await redemptionsApi.claim({ cardId: card.id });
                if (res.success && res.data) {
                  toast.success(`Reward claimed! ${res.data.rewardDescription}`);
                  setRewardReady(false);
                  setRewardExpiresAt(undefined);
                  setCard((prev) => prev ? { ...prev, totalStamps: 0, totalRedemptions: prev.totalRedemptions + 1 } : prev);
                } else {
                  toast.error(res.error?.message || "Failed to claim reward.");
                }
              } catch {
                toast.error("An unexpected error occurred.");
              } finally {
                setIsClaiming(false);
              }
            }}
            disabled={isClaiming}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {isClaiming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Gift className="h-5 w-5" />
                Claim Reward
              </>
            )}
          </button>
        </div>
      )}

      {/* QR Code display */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-6 flex flex-col items-center space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <QrCode className="h-4 w-4" />
          Show this to the cashier to get stamped
        </div>

        <div className="relative">
          {qrToken ? (
            <div className="p-3 bg-[var(--surface)] rounded-xl border-2 border-[var(--border-light)]">
              <QRCodeSVG
                value={qrToken.token}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
          ) : (
            <div className="h-56 w-56 bg-[var(--surface-raised)] rounded-xl flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          )}
          {isGeneratingQr && qrToken && (
            <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
        </div>

        {qrToken && (
          <p className="text-xs text-[var(--text-tertiary)]">
            Auto-refreshes every 40 seconds
          </p>
        )}

        <button
          onClick={generateQr}
          disabled={isGeneratingQr}
          className="flex items-center gap-2 text-sm text-brand hover:text-brand-hover disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isGeneratingQr ? "animate-spin" : ""}`} />
          Refresh QR Code
        </button>
      </div>

      {/* Stamp awarded overlay */}
      {stampOverlay && (
        <StampAwardedOverlay
          stampNumber={stampOverlay.stampNumber}
          stampsRequired={stampOverlay.stampsRequired}
          rewardReady={stampOverlay.rewardReady}
          onDone={() => setStampOverlay(null)}
        />
      )}

      <style jsx>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}