"use client";

import { useEffect, useState } from "react";
import { servicesApi } from "@/lib/api/services";
import type { ServiceCatalogItemResponse } from "@/types";
import { Check, Clock3 } from "lucide-react";

interface ServiceListProps {
  businessId: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  className?: string;
}

/**
 * Multi-select service tiles. Fetches the public (active) catalog for a
 * business and renders each item as a tappable card. Duration + price are
 * shown inline. Multi-select enabled (booking.md §9).
 */
export function ServiceList({
  businessId,
  selectedIds,
  onToggle,
  className = "",
}: ServiceListProps) {
  const [services, setServices] = useState<ServiceCatalogItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    servicesApi
      .getPublic(businessId)
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) setServices(res.data);
          else setError(res.error?.message ?? "Could not load services.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load services.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-mono text-sm text-[var(--text-secondary)] py-6 text-center" style={{ fontFamily: "'Space Mono', monospace" }}>
        {error}
      </p>
    );
  }

  if (services.length === 0) {
    return (
      <p className="font-mono text-sm text-[var(--text-tertiary)] py-6 text-center" style={{ fontFamily: "'Space Mono', monospace" }}>
        No services available for this business yet.
      </p>
    );
  }

  return (
    <div className={`grid gap-3 ${className}`} role="group" aria-label="Services">
      {services.map((svc) => {
        const isSelected = selectedIds.includes(svc.id);
        return (
          <button
            key={svc.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(svc.id)}
            className={`relative w-full text-left p-4 border transition-all duration-200 overflow-hidden ${
              isSelected
                ? "border-[var(--text-primary)] bg-[var(--surface-raised)]"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
            }`}
          >
            {/* Rim light for selected state */}
            {isSelected && (
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/20" />
            )}
            <div className="flex justify-between items-start gap-3">
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    {svc.name}
                  </h3>
                  {svc.price > 0 && (
                    <span className="font-mono text-sm text-[var(--text-primary)] flex-shrink-0" style={{ fontFamily: "'Space Mono', monospace" }}>
                      KES {svc.price}
                    </span>
                  )}
                </div>
                {svc.description && (
                  <p className="text-xs text-[var(--text-secondary)] leading-snug mt-0.5 line-clamp-2">
                    {svc.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock3 className="h-3.5 w-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
                    {svc.durationMinutes} min
                  </span>
                </div>
              </div>
              {/* Checkbox */}
              <span
                aria-hidden
                className={`w-6 h-6 border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
                  isSelected
                    ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--background)]"
                    : "border-[var(--border)] text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}