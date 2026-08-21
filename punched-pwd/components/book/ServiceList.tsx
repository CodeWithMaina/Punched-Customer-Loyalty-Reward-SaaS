"use client";

import { useEffect, useState } from "react";
import { servicesApi } from "@/lib/api/services";
import type { ServiceCatalogItemResponse } from "@/types";
import { Check } from "lucide-react";

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
            className="h-20 bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-light)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
        {error}
      </p>
    );
  }

  if (services.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] py-6 text-center">
        No services available for this business yet.
      </p>
    );
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      {services.map((svc) => {
        const isSelected = selectedIds.includes(svc.id);
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => onToggle(svc.id)}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
              isSelected
                ? "border-brand bg-brand-surface ring-2 ring-brand/20"
                : "border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <div
              className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${
                isSelected
                  ? "bg-brand text-white"
                  : "bg-[var(--surface-raised)] text-[var(--text-tertiary)]"
              }`}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {svc.name}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {svc.durationMinutes} min{svc.price > 0 ? ` • KES ${svc.price}` : ""}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}