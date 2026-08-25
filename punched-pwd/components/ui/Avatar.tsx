"use client";

import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  Avatar — initials fallback avatar (no external deps).
//  Sizes map to common usages across the app (list rows, cards,
//  detail headers). Image support included when `src` is given.
// ═══════════════════════════════════════════════════════════════

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeStyles: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-sm",
};

const radiusStyles: Record<AvatarSize, string> = {
  xs: "rounded-full",
  sm: "rounded-[var(--radius-md)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-full",
};

export function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  /** Full display name — used for initials + alt text. */
  name: string;
  /** Optional image URL; falls back to initials when absent. */
  src?: string;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "flex shrink-0 select-none items-center justify-center overflow-hidden font-bold bg-brand-surface text-brand",
        sizeStyles[size],
        radiusStyles[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}