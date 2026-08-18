"use client";

import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowLeft, User, Phone, Mail, CalendarDays, Pencil, Shield,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Owner Profile — View
//  Route: /dashboard/business/profile/owner
//  Display-only. Editing lives on a separate page:
//  /dashboard/business/profile/owner/edit
// ═══════════════════════════════════════════════════════════════

export default function OwnerProfileViewPage() {
  useRoleGuard("Business");
  const { user } = useAuthStore();

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

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
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {value || "—"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Owner Profile</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Your personal account</p>
        </div>
        <Link
          href="/dashboard/business/profile/owner/edit"
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />Edit
        </Link>
      </div>

      {/* Identity card */}
      <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-brand-surface flex items-center justify-center overflow-hidden ring-4 ring-brand/10">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
          ) : (
            <User className="h-9 w-9 text-brand" />
          )}
        </div>
        <p className="mt-3 text-lg font-bold text-[var(--text-primary)]">{user?.fullName}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand-surface px-2.5 py-1 rounded-full">
          <Shield className="h-3 w-3" />Business Owner
        </span>
      </div>

      {/* Details */}
      <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card px-4 divide-y divide-[var(--border-light)]">
        <InfoRow icon={User} label="Full name" value={user?.fullName ?? ""} />
        <InfoRow icon={Phone} label="Phone" value={user?.phone ?? ""} />
        <InfoRow icon={Mail} label="Email" value={user?.email ?? ""} />
        <InfoRow icon={CalendarDays} label="Joined" value={joined} />
      </div>
    </div>
  );
}