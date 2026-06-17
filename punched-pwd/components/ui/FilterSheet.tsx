"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X, SlidersHorizontal } from "lucide-react";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Mobile: bottom sheet / drawer overlay.
 * Desktop (md+): inline collapsible panel.
 * Consistent filter/sort pattern across all dashboards.
 */
export function FilterSheet({ open, onClose, title = "Filters", children }: FilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on outside click (mobile overlay)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose();
    };
    // Small delay so the open-click doesn't immediately close
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Mobile: bottom sheet overlay */}
      <div className="md:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
        {/* Sheet */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-3xl shadow-elevated max-h-[75vh] flex flex-col animate-slide-up safe-area-bottom"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {children}
          </div>
          {/* Apply button */}
          <div className="px-5 py-3 border-t border-[var(--border-light)]">
            <button
              onClick={onClose}
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: inline panel */}
      <div className="hidden md:block bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-medium"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/** Reusable chip group for filter selections */
export function FilterChips({
  label,
  options,
  value,
  onChange,
  emojis,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  emojis?: Record<string, string>;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] ${
              value === opt
                ? "bg-brand text-white shadow-sm"
                : "bg-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            }`}
          >
            {emojis?.[opt] ? `${emojis[opt]} ` : ""}{opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Reusable sort option selector */
export function SortOptions({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Sort by</p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] ${
              value === key
                ? "bg-[var(--text-primary)] text-[var(--surface)]"
                : "bg-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
