"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { Business } from "@/types";
import {
  ArrowLeft, Loader2, Store, Phone, Mail, MapPin, FileText, Hash, Pencil,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Business Profile — View
//  Route: /dashboard/business/profile/business
//  Display-only. Editing lives on a separate page:
//  /dashboard/business/profile/business/edit
// ═══════════════════════════════════════════════════════════════

export default function BusinessProfileViewPage() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    businessesApi.getMine().then((res) => {
      if (res.success && res.data) setBusiness(res.data);
      setIsLoading(false);
    });
  }, []);

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
  }) => (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--border-light)]">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="break-words text-sm font-semibold text-[var(--text-primary)]">
          {value || "—"}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const b = business;

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Business Profile</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Your business details</p>
        </div>
        <Link
          href="/dashboard/business/profile/business/edit"
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />Edit
        </Link>
      </div>

      {/* Logo + name */}
      <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0">
          {b?.logoUrl ? (
            <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-7 w-7 text-brand" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-[var(--text-primary)]">{b?.name}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{b?.category}</p>
        </div>
      </div>

      {/* Details */}
      <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card px-4 divide-y divide-[var(--border-light)]">
        <InfoRow icon={Store} label="Business name" value={b?.name ?? ""} />
        <InfoRow icon={Hash} label="Category" value={b?.category ?? ""} />
        <InfoRow icon={MapPin} label="Location" value={b?.location ?? ""} />
        <InfoRow icon={Phone} label="Phone" value={b?.phoneNumber ?? ""} />
        <InfoRow icon={Mail} label="Email" value={b?.email ?? ""} />
        <InfoRow icon={Hash} label="M-Pesa Paybill / Till" value={(b as any)?.mpesaNumber ?? ""} />
        <InfoRow icon={FileText} label="Description" value={b?.description ?? ""} />
      </div>
    </div>
  );
}