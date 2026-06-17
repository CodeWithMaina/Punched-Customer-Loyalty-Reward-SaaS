"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { LoyaltyProgram, UpsertLoyaltyProgramRequest } from "@/types";
import { Loader2, Save, Gift } from "lucide-react";

export default function LoyaltyProgramPage() {
  useRoleGuard("Business");
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<UpsertLoyaltyProgramRequest>({
    stampsRequired: 10,
    rewardValue: 500,
    rewardDescription: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We don't know the businessId here, so we call the business first
    import("@/lib/api/businesses").then(({ businessesApi }) =>
      businessesApi.getMine().then((res) => {
        if (res.success && res.data?.loyaltyProgram) {
          const p = res.data.loyaltyProgram;
          setProgram(p);
          setForm({
            stampsRequired: p.stampsRequired,
            rewardValue: p.rewardValue,
            rewardDescription: p.rewardDescription,
          });
        }
        setIsLoading(false);
      })
    );
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await loyaltyApi.upsertProgram(form);
      if (res.success && res.data) {
        setProgram(res.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error?.message ?? "Failed to save");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Gift className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Loyalty Program</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {program ? "Update your program" : "Create your loyalty program"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Stamps Required for Reward
          </label>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={form.stampsRequired}
            onChange={(e) => setForm((f) => ({ ...f, stampsRequired: parseInt(e.target.value) || 1 }))}
            className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="text-xs text-[var(--text-tertiary)]">Customers need this many stamps to earn a reward</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Reward Value (KES)
          </label>
          <input
            type="number"
            min={1}
            required
            value={form.rewardValue}
            onChange={(e) => setForm((f) => ({ ...f, rewardValue: parseFloat(e.target.value) || 0 }))}
            className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Reward Description
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.rewardDescription}
            onChange={(e) => setForm((f) => ({ ...f, rewardDescription: e.target.value }))}
            placeholder="e.g. Free Coffee, 20% Discount"
            className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Program saved successfully!</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 font-medium text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : program ? "Update Program" : "Create Program"}
        </button>
      </form>

      {program && (
        <div className="bg-brand-surface rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-brand-dark">Current Program</p>
          <p className="text-sm text-brand-hover">
            {program.stampsRequired} stamps = {program.rewardDescription} (KES {program.rewardValue})
          </p>
        </div>
      )}
    </div>
  );
}
