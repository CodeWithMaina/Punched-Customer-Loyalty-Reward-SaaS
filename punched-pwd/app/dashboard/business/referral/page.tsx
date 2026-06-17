"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { referralsApi } from "@/lib/api/referrals";
import { businessesApi } from "@/lib/api/businesses";
import type { ReferralProgram, UpsertReferralProgramRequest, ReferralRewardType } from "@/types";
import toast from "react-hot-toast";
import {
  Loader2,
  Save,
  Users,
  Gift,
  Clock,
  ToggleRight,
  ToggleLeft,
  Info,
} from "lucide-react";

const REWARD_TYPES: { value: ReferralRewardType; label: string; description: string }[] = [
  { value: "Stamp", label: "Bonus Stamp", description: "Award extra stamps to the referrer" },
  { value: "Discount", label: "Discount", description: "Give a percentage or fixed discount" },
  { value: "FreeItem", label: "Free Item", description: "Award a free product or service" },
];

export default function BusinessReferralPage() {
  useRoleGuard("Business");
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<UpsertReferralProgramRequest>({
    referralsRequired: 3,
    rewardType: "Stamp",
    rewardValue: 1,
    rewardDescription: "1 bonus stamp for every 3 referrals",
    expirationDays: 30,
  });

  useEffect(() => {
    businessesApi.getMine().then((bizRes) => {
      if (!bizRes.success || !bizRes.data) { setIsLoading(false); return; }
      const id = bizRes.data.id;
      setBusinessId(id);
      referralsApi
        .getProgram(id)
        .then((progRes) => {
          if (progRes.success && progRes.data) {
            const p = progRes.data;
            setProgram(p);
            setForm({
              referralsRequired: p.referralsRequired,
              rewardType: p.rewardType,
              rewardValue: p.rewardValue,
              rewardDescription: p.rewardDescription,
              expirationDays: p.expirationDays,
            });
          }
        })
        .catch(() => {
          // 404 means no program configured yet — that's fine, show empty form
        })
        .finally(() => setIsLoading(false));
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await referralsApi.upsertProgram(form);
      if (res.success && res.data) {
        setProgram(res.data);
        toast.success("Referral program saved!");
      } else {
        toast.error(res.error?.message || "Failed to save referral program.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  function update<K extends keyof UpsertReferralProgramRequest>(
    key: K,
    value: UpsertReferralProgramRequest[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Business</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Referral Program</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
          Reward customers for bringing in new ones
        </p>
      </div>

      {/* Current status banner */}
      {program && (
        <div className="bg-brand-surface border border-brand/10 rounded-2xl p-4 mb-5 flex items-center gap-3">
          {program.isActive ? (
            <ToggleRight className="h-5 w-5 text-brand flex-shrink-0" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-[var(--text-tertiary)] flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-dark">
              {program.isActive ? "Program is active" : "Program is inactive"}
            </p>
            <p className="text-xs text-brand/70 truncate">
              {program.referralsRequired} referral{program.referralsRequired !== 1 ? "s" : ""} needed → {program.rewardDescription}
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-[var(--text-tertiary)]" />
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">How It Works</p>
        </div>
        <ol className="space-y-2">
          {[
            "Customers get a unique referral link for your business",
            "They share it with friends who sign up and earn their first stamp",
            "Once they hit the required number of referrals, they earn the reward you define below",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-brand-surface text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-snug">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Referrals required */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Requirements</p>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <Users className="h-4 w-4" />
              Referrals Needed for Reward
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={form.referralsRequired}
              onChange={(e) => update("referralsRequired", parseInt(e.target.value) || 1)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
              How many successful referrals unlock one reward
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <Clock className="h-4 w-4" />
              Referral Expiry (days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              required
              value={form.expirationDays}
              onChange={(e) => update("expirationDays", parseInt(e.target.value) || 30)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Referrals expire after this many days if not qualified
            </p>
          </div>
        </div>

        {/* Reward config */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Reward</p>

          {/* Reward type selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward Type</label>
            <div className="grid grid-cols-3 gap-2">
              {REWARD_TYPES.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("rewardType", value)}
                  className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                    form.rewardType === value
                      ? "border-brand bg-brand-surface"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]"
                  }`}
                >
                  <p className={`text-xs font-bold ${form.rewardType === value ? "text-brand" : "text-[var(--text-secondary)]"}`}>
                    {label}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              {REWARD_TYPES.find((r) => r.value === form.rewardType)?.description}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <Gift className="h-4 w-4" />
              Reward Value
              {form.rewardType === "Discount" ? " (%)" : form.rewardType === "Stamp" ? " (stamps)" : ""}
            </label>
            <input
              type="number"
              min={1}
              required
              value={form.rewardValue}
              onChange={(e) => update("rewardValue", parseFloat(e.target.value) || 1)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward Description</label>
            <input
              type="text"
              required
              maxLength={200}
              value={form.rewardDescription}
              onChange={(e) => update("rewardDescription", e.target.value)}
              placeholder="e.g. 1 free coffee for every 3 friends referred"
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
              This is shown to customers when they share or view their referral link
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {isSaving ? "Saving…" : program ? "Update Referral Program" : "Activate Referral Program"}
        </button>
      </form>
    </div>
  );
}
