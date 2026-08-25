"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ArrowRight, type LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  FeatureSheet — dedicated feature information experience.
//  Mobile: full-screen sheet sliding up from the bottom.
//  Desktop (sm+): centered modal over a dimmed backdrop.
//  Accessible: Escape closes, focus moves in on open and is
//  restored on close, background interaction is blocked.
//  Motion respects prefers-reduced-motion via motion-safe:.
// ═══════════════════════════════════════════════════════════════

export interface FeatureInfo {
  label: string;
  icon: LucideIcon;
  /** One-line explanation of what the feature does. */
  summary: string;
  /** Concrete benefits for a business owner. */
  benefits: string[];
}

interface FeatureSheetProps {
  feature: FeatureInfo | null;
  onClose: () => void;
  ctaHref?: string;
  ctaLabel?: string;
}

export function FeatureSheet({
  feature,
  onClose,
  ctaHref = "/business-register",
  ctaLabel = "Start free",
}: FeatureSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Focus management + scroll lock + Escape handling while open.
  useEffect(() => {
    if (!feature) return;

    lastFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: keep Tab cycling inside the dialog.
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      lastFocused.current?.focus();
    };
  }, [feature, onClose]);

  if (!feature) return null;

  const Icon = feature.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${feature.label} feature`}
      className="fixed inset-0 z-[100]"
    >
      {/* Backdrop */}
      <button
        aria-label="Close feature details"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 w-full h-full bg-black/60 animate-fade-in cursor-default"
      />

      {/* Sheet / modal panel */}
      <div
        ref={panelRef}
        className={`absolute bg-[var(--background)] border border-[var(--border)] flex flex-col overflow-hidden motion-safe:duration-300 motion-safe:ease-out
          inset-x-0 bottom-0 max-h-[92dvh] animate-sheet-up
          sm:inset-0 sm:m-auto sm:max-w-lg sm:max-h-[85dvh] sm:h-fit`}
      >
        {/* Header — sticky so Close stays reachable while scrolling */}
        <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-brand" strokeWidth={1.5} />
            </span>
            <h2
              className="text-base md:text-lg font-bold tracking-tight uppercase truncate text-[var(--text-primary)]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {feature.label}
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={`Close ${feature.label} details`}
            className="h-10 w-10 flex items-center justify-center border border-[var(--border)] text-[var(--text-secondary)] hover:border-brand hover:text-brand transition-colors flex-shrink-0 active:scale-95 motion-reduce:active:scale-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 py-6 space-y-8">
          <p
            className="font-mono text-sm leading-relaxed text-[var(--text-secondary)]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {feature.summary}
          </p>

          <section aria-label="Benefits">
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-3">
              What you get
            </p>
            <ul className="space-y-3">
              {feature.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-brand" />
                  <span className="text-sm text-[var(--text-primary)]">{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* UI preview built purely from theme tokens */}
          <section aria-label="Preview" className="border border-[var(--border)] p-4 relative overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-8 w-8 border border-[var(--border)] flex-shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <span className="block h-2 w-24 bg-[var(--border)]" />
                      <span className="block h-1.5 w-16 bg-[var(--border-light)]" />
                    </div>
                  </div>
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-muted)]">
                    Live
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center font-mono text-xs text-[var(--text-muted)]" style={{ fontFamily: "'Space Mono', monospace" }}>
              A live look inside PUNCHED
            </p>
          </section>
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--background)] p-4 safe-area-bottom">
          <Link
            href={ctaHref}
            onClick={onClose}
            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--background)] border border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors uppercase tracking-widest text-xs font-bold active:scale-[0.98] motion-reduce:active:scale-100"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}