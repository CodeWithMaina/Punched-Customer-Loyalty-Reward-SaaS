"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StampAwardedResponse } from "@/types";
import { Gift, CheckCircle2, Stamp as StampIcon, BadgeCheck } from "lucide-react";

interface StampSuccessOverlayProps {
  result: StampAwardedResponse;
  onClose: () => void;
}

const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";
const MONO_FONT = "'Space Mono', monospace";

/**
 * Full-screen brutalist success screen shown after a stamp is successfully awarded.
 * Plays a stamp reveal phase, then shows the progress module; switches to the
 * accent "REWARD UNLOCKED" treatment when the card reaches its reward threshold.
 */
export function StampSuccessOverlay({ result, onClose }: StampSuccessOverlayProps) {
  const [phase, setPhase] = useState<"stamp" | "detail">("stamp");

  useEffect(() => {
    const t = setTimeout(() => setPhase("detail"), 700);
    return () => clearTimeout(t);
  }, []);

  const remaining = Math.max(result.stampsRequired - result.totalStamps, 0);

  // Bento stamp cells: filled vs empty, latest highlighted
  const cells = Array.from({ length: result.stampsRequired }, (_, i) => ({
    index: i,
    filled: i < result.totalStamps,
    latest: i === result.stampNumber - 1,
  }));

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={result.rewardReady ? "Reward unlocked" : "Stamp added"}
    >
      {/* Watermark */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.03] z-0 select-none"
      >
        <span
          className="font-extrabold leading-none tracking-tighter text-[var(--text-primary)] text-[40vw]"
          style={{ fontFamily: HEADLINE_FONT }}
        >
          {result.totalStamps}
        </span>
      </div>

      <main className="relative z-10 min-h-full flex items-center justify-center p-5 md:p-16">
        <div
          className="w-full max-w-4xl flex flex-col gap-10 md:gap-14 items-center animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Hero ───────────────────────────────────────────── */}
          <section className="flex flex-col items-center text-center gap-6 w-full">
            <div
              className={`relative w-28 h-28 md:w-44 md:h-44 border flex items-center justify-center overflow-hidden transition-colors duration-500 ${
                result.rewardReady
                  ? "border-accent/50 bg-[var(--accent-light)]"
                  : "border-[var(--border)] bg-brand-surface"
              }`}
            >
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/20" />
              {phase === "stamp" ? (
                <Loader />
              ) : result.rewardReady ? (
                <Gift className="h-16 w-16 md:h-24 md:w-24 text-accent" strokeWidth={1.5} />
              ) : (
                <CheckCircle2 className="h-16 w-16 md:h-24 md:w-24 text-brand" strokeWidth={1.5} />
              )}
            </div>

            <h1
              className={`text-[44px] md:text-[72px] leading-[0.95] font-extrabold uppercase tracking-tight transition-opacity duration-300 ${
                phase === "stamp" ? "opacity-0" : "opacity-100"
              } ${result.rewardReady ? "text-accent" : "text-[var(--text-primary)]"}`}
              style={{ fontFamily: HEADLINE_FONT }}
            >
              {result.rewardReady ? "Reward Unlocked" : "Stamp Added"}
            </h1>

            {phase === "detail" && (
              <div
                className={`border px-4 py-2 flex items-center gap-2 ${
                  result.rewardReady
                    ? "bg-[var(--accent-light)] border-accent/40"
                    : "bg-[var(--surface-raised)] border-[var(--border)]"
                }`}
              >
                <BadgeCheck className={`h-4 w-4 ${result.rewardReady ? "text-accent-text" : "text-ok"}`} />
                <span className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-primary)]">
                  Verification successful
                </span>
              </div>
            )}
          </section>

          {/* ── Progress module ────────────────────────────────── */}
          <section
            className={`w-full border p-6 md:p-8 bg-[var(--surface)] transition-opacity duration-300 delay-200 ${
              phase === "stamp" ? "opacity-0 pointer-events-none" : "opacity-100"
            } ${result.rewardReady ? "border-accent/40" : "border-[var(--border)]"}`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight text-[var(--text-primary)] uppercase"
                  style={{ fontFamily: HEADLINE_FONT }}
                >
                  Current Progress
                </h2>
                <p className="font-mono text-xs text-[var(--text-tertiary)] mt-2 uppercase tracking-wide" style={{ fontFamily: MONO_FONT }}>
                  Customer: {result.customerName}
                </p>
              </div>
              <div className="md:text-right">
                <span
                  className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)]"
                  style={{ fontFamily: HEADLINE_FONT }}
                >
                  {result.totalStamps}
                  <span className="text-[var(--text-tertiary)]">/{result.stampsRequired}</span>
                </span>
                <p className="font-mono text-xs text-[var(--text-tertiary)] uppercase mt-1" style={{ fontFamily: MONO_FONT }}>
                  {remaining} remaining for reward
                </p>
              </div>
            </div>

            {/* Bento stamp grid */}
            <div className="grid grid-cols-5 gap-0 border border-[var(--border)] bg-[var(--background)]">
              {cells.map(({ index, filled, latest }) => (
                <div
                  key={index}
                  className={`aspect-square flex items-center justify-center border-[0.5px] border-[var(--border)] ${
                    filled
                      ? latest
                        ? "bg-brand-surface"
                        : "bg-[var(--text-primary)]"
                      : "bg-[var(--background)]"
                  }`}
                  aria-label={filled ? `Stamp ${index + 1} collected` : `Stamp ${index + 1} empty`}
                >
                  {filled ? (
                    <StampIcon
                      className={`h-6 w-6 md:h-8 md:w-8 ${latest ? "text-brand" : "text-[var(--background)]"}`}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${result.rewardReady ? "bg-accent/40" : "bg-[var(--border)]"}`} />
                  )}
                </div>
              ))}
            </div>

            {result.rewardReady && result.rewardDescription && (
              <div className="mt-6 bg-[var(--accent-light)] border border-accent/40 px-4 py-3 flex items-center justify-center gap-2">
                <Gift className="h-4 w-4 text-accent-text flex-shrink-0" />
                <p className="font-mono text-sm text-accent-text" style={{ fontFamily: MONO_FONT }}>
                  {result.rewardDescription}
                </p>
              </div>
            )}
          </section>

          {/* ── Actions ────────────────────────────────────────── */}
          <section
            className={`flex flex-col sm:flex-row gap-4 w-full transition-opacity duration-300 ${
              phase === "stamp" ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <Link
              href="/dashboard"
              className="flex-1 sm:flex-none text-center bg-transparent text-[var(--text-primary)] py-4 px-8 font-mono text-sm uppercase tracking-widest border border-[var(--border)] hover:border-brand hover:text-brand transition-colors"
              style={{ fontFamily: MONO_FONT }}
            >
              Return to Dashboard
            </Link>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none bg-[var(--text-primary)] text-[var(--background)] py-4 px-12 font-mono text-sm uppercase tracking-widest font-bold border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: MONO_FONT }}
            >
              Next Scan
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

function Loader() {
  return (
    <div
      className="h-14 w-14 rounded-full border-2 border-[var(--border)] border-t-brand animate-spin"
      role="status"
      aria-label="Confirming stamp"
    />
  );
}
