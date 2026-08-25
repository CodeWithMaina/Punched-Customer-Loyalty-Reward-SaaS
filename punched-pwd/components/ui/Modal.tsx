"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

// ═══════════════════════════════════════════════════════════════
//  Modal / Drawer / ConfirmationDialog — canonical overlay set.
//
//  Responsive by default:
//   - Modal: bottom sheet on mobile → centred dialog on sm+
//   - Drawer: bottom sheet on mobile → right side drawer on sm+
//
//  All overlays provide backdrop click + Escape closing,
//  role="dialog"/aria-modal semantics, and a labelled close
//  button. Animations reuse the app's existing keyframes.
// ═══════════════════════════════════════════════════════════════

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onClose]);
}

function OverlayShell({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label={label ?? "Close dialog"}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
      />
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  description,
  onClose,
  id,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-bold text-[var(--text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      <IconButton label="Close" onClick={onClose}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

type PanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Desktop panel width. */
  size?: "sm" | "md" | "lg";
};

const sizeStyles = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

function titleIdFor(prefix: string, title: string) {
  return `${prefix}-${title.replace(/\s+/g, "-").toLowerCase()}`;
}

/** Bottom sheet on mobile → centred modal on sm+. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: PanelProps) {
  useEscape(open, onClose);
  if (!open) return null;

  const titleId = titleIdFor("modal-title", title);

  return (
    <OverlayShell onClose={onClose} label={`Close ${title}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-light)] bg-[var(--surface)] shadow-elevated animate-slide-up sm:rounded-3xl motion-reduce:animate-none",
          sizeStyles[size]
        )}
      >
        <PanelHeader title={title} description={description} onClose={onClose} id={titleId} />
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-[var(--border-light)] px-5 py-3">{footer}</div>
        )}
      </div>
    </OverlayShell>
  );
}

/** Bottom sheet on mobile → right side drawer on sm+. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: PanelProps) {
  useEscape(open, onClose);
  if (!open) return null;

  const titleId = titleIdFor("drawer-title", title);

  return (
    <OverlayShell onClose={onClose} label={`Close ${title}`}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl border border-b-0 border-[var(--border-light)] bg-[var(--surface)] shadow-elevated animate-slide-up motion-reduce:animate-none",
          "sm:animate-slide-in-right sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:h-full sm:rounded-t-none sm:rounded-l-3xl sm:border-b sm:w-[420px]",
          size === "lg" && "sm:w-[520px]"
        )}
      >
        <div className="sticky top-0 z-10 bg-[var(--surface)]">
          <PanelHeader title={title} description={description} onClose={onClose} id={titleId} />
        </div>
        <div className="flex-1 p-5">{children}</div>
        {footer && (
          <div className="sticky bottom-0 border-t border-[var(--border-light)] bg-[var(--surface)] px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </OverlayShell>
  );
}

/** Destructive/action confirmation with clear intent. */
export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" fullWidth onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          fullWidth
          onClick={onConfirm}
          isLoading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
