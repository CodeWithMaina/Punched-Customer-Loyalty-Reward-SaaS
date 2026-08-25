"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  Tabs — accessible segmented tab switcher (WAI-ARIA tabs).
//  Used for view switching (calendar/list), period selection, etc.
// ═══════════════════════════════════════════════════════════════

export type TabItem<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  idPrefix,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
  /** Optional prefix used to build tab ids / aria-controls pairs. */
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const current = items.findIndex((item) => item.value === value);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = items[(current + delta + items.length) % items.length];
    onChange(next.value);
    refs.current[items.indexOf(next)]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1",
        className
      )}
    >
      {items.map((item, index) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.value}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none sm:text-sm min-h-[36px]",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}