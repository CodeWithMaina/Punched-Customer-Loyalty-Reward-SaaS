"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { referralsApi } from "@/lib/api/referrals";
import type { ReferralProgram, UpsertReferralProgramRequest, ReferralRewardType } from "@/types";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Save, Info } from "lucide-react";

const REWARD_TYPES: { value: ReferralRewardType; label: string }[] = [
  { value: "Stamp", label: "Bonus Stamp" },
  { value: "Discount", label: "Discount" },
  { value: "FreeItem", label: "Free Item" },
];

function NumField({ label, hint, value, onChange, min, max }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--text-secondary)] block">{label}</label>
      <input type="number" min={min} max={max} required value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
      {hint && <p className="text-[10px] text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}

export default function ReferralPage() {
  useRoleGuard("Business");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [referralProgram, setReferralProgram] = useState<ReferralProgram | null>(null);
  const [form, setForm] = useState<UpsertReferralProgramRequest>({
    referralsRequired: 3, rewardType: "Stamp", rewardValue: 1,
    rewardDescription: "1 bonus stamp for every 3 referrals", expirationDays: 30,
  });

  useEffect(() => {
    businessesApi.getMine().then((bizRes) => {
      if (bizRes.success && bizRes.data) {
        referralsApi.getProgram(bizRes.data.id).then((r) => {
          if (r.success && r.data) {
            setReferralProgram(r.data);
            setForm({ referralsRequired: r.data.referralsRequired, rewardType: r.data.rewardType, rewardValue: r.data.rewardValue, rewardDescription: r.data.rewardDescription, expirationDays: r.data.expirationDays });
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else { setIsLoading(false); }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const res = await referralsApi.upsertProgram(form);
      if (res.success && res.data) { setReferralProgram(res.data); toast.success("Referral program saved!"); }
      else toast.error(res.error?.message ?? "Failed.");
    } catch { toast.error("Unexpected error."); } finally { setIsSaving(false); }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Referral Program</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Reward customers who bring friends</p>
        </div>
      </div>

      {/* Status */}
      {referralProgram && (
        <div className={`mx-5 mb-4 rounded-2xl border p-4 flex items-center gap-3 ${referralProgram.isActive ? "bg-brand-surface border-brand/10" : "bg-[var(--surface-raised)] border-[var(--border)]"}`}>
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${referralProgram.isActive ? "bg-brand" : "bg-[var(--text-muted)]"}`} />
          <div>
            <p className={`text-sm font-semibold ${referralProgram.isActive ? "text-brand-dark" : "text-[var(--text-secondary)]"}`}>
              {referralProgram.isActive ? "Referral program active" : "Referral program inactive"}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{referralProgram.referralsRequired} referral{referralProgram.referralsRequired !== 1 ? "s" : ""} → {referralProgram.rewardDescription}</p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <div className="flex items-center gap-2 mb-3"><Info className="h-4 w-4 text-[var(--text-tertiary)]" /><p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">How it works</p></div>
        <ol className="space-y-2">
          {["Customers get a unique share link for your business", "Friends sign up and earn their first stamp", "Referrer earns the reward you define below"].map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
              <span className="h-4 w-4 rounded-full bg-brand-surface text-brand text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </div>

      <div className="px-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Requirements</p>
            <NumField label="Referrals needed for reward" hint="How many successful referrals unlock one reward"
              value={form.referralsRequired} onChange={(v) => setForm((f) => ({ ...f, referralsRequired: v }))} min={1} max={50} />
            <NumField label="Referral expiry (days)" hint="Referrals expire if not completed within this many days"
              value={form.expirationDays} onChange={(v) => setForm((f) => ({ ...f, expirationDays: v }))} min={1} max={365} />
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Reward</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward type</label>
              <div className="grid grid-cols-3 gap-2">
                {REWARD_TYPES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, rewardType: value }))}
                    className={`rounded-xl border-2 py-2.5 text-center text-xs font-bold transition-all ${form.rewardType === value ? "border-brand bg-brand-surface text-brand" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <NumField label={`Reward value${form.rewardType === "Discount" ? " (%)" : form.rewardType === "Stamp" ? " (stamps)" : ""}`}
              value={form.rewardValue} onChange={(v) => setForm((f) => ({ ...f, rewardValue: v }))} min={1} />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward description</label>
              <input type="text" required maxLength={200} value={form.rewardDescription}
                onChange={(e) => setForm((f) => ({ ...f, rewardDescription: e.target.value }))}
                placeholder="e.g. 1 free coffee for every 3 friends referred"
                className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>

          <button type="submit" disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isSaving ? "Saving…" : referralProgram ? "Update Referral Program" : "Activate Referral Program"}
          </button>
        </form>
      </div>
    </div>
  );
}
