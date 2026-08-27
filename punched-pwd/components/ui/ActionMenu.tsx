"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  ActionMenu — "⋮" overflow menu for row/card contextual actions.
//  Closes on Escape / outside click; supports links, callbacks and
//  a danger tone for destructive entries.
// ═══════════════════════════════════════════════════════════════

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  /** Navigate target (renders a link). */
  href?: string;
  /** Callback action (renders a button). */
  onSelect?: () => void;
  /** Destructive styling. */
  danger?: boolean;
}

export function ActionMenu({
  label = "More actions",
  items,
  className,
}: {
  /** Accessible name for the trigger button. */
  label?: string;
  items: ActionMenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-light)] hover:text-brand"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-10 z-40 w-48 animate-scale-in overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-elevated"
        >
          {items.map((item) => {
            const itemClass = cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium transition-colors",
              item.danger
                ? "text-[var(--error)] hover:bg-red-50"
                : "text-[var(--text-primary)] hover:bg-[var(--border-light)]"
            );

            return item.href ? (
              <Link
                key={item.label}
                role="menuitem"
                href={item.href}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                className={itemClass}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
