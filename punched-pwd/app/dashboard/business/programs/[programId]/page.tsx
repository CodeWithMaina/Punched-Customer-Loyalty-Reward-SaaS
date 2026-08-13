"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Gift, Loader2, Pencil } from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { LoyaltyProgram } from "@/types";

export default function ProgramDetailsPage() {
  useRoleGuard("Business");
  const { programId } = useParams<{ programId: string }>();
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loyaltyApi.getProgramById(programId)
      .then((response) => { if (active && response.success && response.data) setProgram(response.data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [programId]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!program) return <div className="mx-auto max-w-lg px-5 py-12 text-center text-sm text-[var(--text-secondary)]">This program is unavailable or no longer belongs to your business.</div>;

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/business/profile/programs" aria-label="Back to programs" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)]"><ArrowLeft className="h-4 w-4" /></Link>
        <Link href="/dashboard/business/profile/programs" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
      </div>
      <section className="mt-6 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-5 shadow-card">
        <Gift className="h-7 w-7 text-brand" />
        <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{program.name}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{program.isActive ? "Active and accepting enrollments" : "Paused"}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-[var(--surface-raised)] p-3"><dt className="text-xs text-[var(--text-tertiary)]">Stamps required</dt><dd className="mt-1 font-bold text-[var(--text-primary)]">{program.stampsRequired}</dd></div>
          <div className="rounded-xl bg-[var(--surface-raised)] p-3"><dt className="text-xs text-[var(--text-tertiary)]">Reward value</dt><dd className="mt-1 font-bold text-[var(--text-primary)]">KES {program.rewardValue}</dd></div>
        </dl>
        <div className="mt-3 rounded-xl bg-[var(--surface-raised)] p-3"><p className="text-xs text-[var(--text-tertiary)]">Reward</p><p className="mt-1 text-sm font-semibold text-[var(--text-primary)] break-words">{program.rewardDescription}</p></div>
      </section>
    </div>
  );
}