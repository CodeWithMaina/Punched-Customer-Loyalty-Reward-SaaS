"use client";

import { useEffect, useState } from "react";
import type { StampAwardedResponse } from "@/types";
import { Gift, CheckCircle, Sparkles } from "lucide-react";

interface StampSuccessOverlayProps {
  result: StampAwardedResponse;
  onClose: () => void;
}

/**
 * Full-screen animated overlay shown after a stamp is successfully awarded.
 * Plays a stamp reveal animation, then a progress/reward flash.
 */
export function StampSuccessOverlay({ result, onClose }: StampSuccessOverlayProps) {
  const [phase, setPhase] = useState<"stamp" | "detail" | "reward">("stamp");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("detail"), 700);
    const t2 = setTimeout(() => {
      if (result.rewardReady) setPhase("reward");
    }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [result.rewardReady]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Card */}
      <div
        className="bg-[var(--surface)] rounded-3xl shadow-elevated w-[85vw] max-w-xs mx-auto overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Green top band */}
        <div
          className={`pt-8 pb-6 px-6 flex flex-col items-center transition-colors duration-500 ${
            phase === "reward" ? "bg-amber-500" : "bg-brand"
          }`}
        >
          {/* Stamp stamp mark */}
          <div
            className={`h-20 w-20 rounded-full flex items-center justify-center border-4 shadow-lg transition-all duration-500 ${
              phase === "stamp"
                ? "scale-125 opacity-0 border-white/30 bg-[var(--surface)]/10"
                : phase === "reward"
                ? "scale-100 border-white bg-[var(--surface)]/20"
                : "scale-100 border-white bg-[var(--surface)]/20"
            }`}
            style={{
              animation: phase !== "stamp" ? "stamp-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : undefined,
            }}
          >
            {phase === "reward" ? (
              <Gift className="h-10 w-10 text-white" />
            ) : (
              <CheckCircle className="h-10 w-10 text-white" />
            )}
          </div>

          <div className="mt-3 text-center">
            <p
              className={`text-2xl font-bold text-white transition-all duration-300 ${
                phase === "stamp" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              {phase === "reward" ? "🎉 Reward Ready!" : "Stamped!"}
            </p>
            <p
              className={`text-sm text-white/80 mt-0.5 transition-all duration-300 delay-100 ${
                phase === "stamp" ? "opacity-0" : "opacity-100"
              }`}
            >
              {result.customerName}
            </p>
          </div>
        </div>

        {/* Stamp count + progress */}
        <div
          className={`px-6 py-5 space-y-4 transition-all duration-300 delay-200 ${
            phase === "stamp" ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Big stamp number */}
          <div className="flex items-end justify-center gap-2">
            <span className="text-5xl font-bold text-brand tabular-nums">{result.stampNumber}</span>
            <div className="mb-1.5">
              <p className="text-xs text-[var(--text-tertiary)] font-medium leading-none">of</p>
              <p className="text-lg font-bold text-[var(--text-secondary)]">{result.stampsRequired}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-3 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  result.rewardReady ? "bg-amber-500" : "bg-brand"
                }`}
                style={{
                  width: `${Math.min((result.totalStamps / result.stampsRequired) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] text-center">
              {result.rewardReady
                ? "Reward is ready to claim!"
                : `${result.stampsRequired - result.totalStamps} more stamp${result.stampsRequired - result.totalStamps !== 1 ? "s" : ""} to go`}
            </p>
          </div>

          {/* Reward ready badge */}
          {result.rewardReady && (
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-accent rounded-xl px-4 py-3">
              <Sparkles className="h-4 w-4 text-accent-text flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">{result.rewardDescription ?? "Free reward!"}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full font-semibold py-3 rounded-xl transition-colors text-sm ${
              result.rewardReady
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-brand hover:bg-brand-hover text-white"
            }`}
          >
            Scan Next Customer
          </button>
        </div>
      </div>
    </div>
  );
}
