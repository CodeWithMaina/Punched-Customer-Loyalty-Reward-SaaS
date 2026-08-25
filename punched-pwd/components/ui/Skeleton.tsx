import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  Skeleton / Spinner — lightweight loading primitives built on
//  the app's existing `skeleton` and spinner animations.
// ═══════════════════════════════════════════════════════════════

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-3 rounded"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--brand)]",
        className
      )}
    />
  );
}