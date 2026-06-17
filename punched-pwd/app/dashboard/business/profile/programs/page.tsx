"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { LoyaltyProgram, CreateLoyaltyProgramRequest, UpdateLoyaltyProgramRequest } from "@/types";
import toast from "react-hot-toast";
import {
  ArrowLeft, Loader2, Gift, Plus, Pencil, Trash2, Check, X, Info,
} from "lucide-react";

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

const blank: CreateLoyaltyProgramRequest = { name: "", stampsRequired: 10, rewardValue: 500, rewardDescription: "" };

export default function ProgramsPage() {
  useRoleGuard("Business");
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateLoyaltyProgramRequest>(blank);
  const [editForms, setEditForms] = useState<Record<string, UpdateLoyaltyProgramRequest>>({});

  function load() {
    loyaltyApi.listPrograms().then((r) => {
      if (r.success && r.data) setPrograms(r.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }
  useEffect(load, []);

  function startEdit(p: LoyaltyProgram) {
    setEditForms((prev) => ({ ...prev, [p.id]: { name: p.name, isActive: p.isActive, stampsRequired: p.stampsRequired, rewardValue: p.rewardValue, rewardDescription: p.rewardDescription } }));
    setEditingId(p.id);
    setShowCreate(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const res = await loyaltyApi.createProgram(createForm);
      if (res.success) { toast.success("Program created!"); setShowCreate(false); setCreateForm(blank); load(); }
      else toast.error(res.error?.message ?? "Failed to create.");
    } catch { toast.error("Unexpected error."); } finally { setIsSaving(false); }
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const res = await loyaltyApi.updateProgram(id, editForms[id]);
      if (res.success) { toast.success("Updated!"); setEditingId(null); load(); }
      else toast.error(res.error?.message ?? "Failed.");
    } catch { toast.error("Unexpected error."); } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this program? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await loyaltyApi.deleteProgram(id);
      if (res.success) { toast.success("Deleted."); load(); }
      else toast.error(res.error?.message ?? "Failed.");
    } catch { toast.error("Unexpected error."); } finally { setDeletingId(null); }
  }

  async function toggleActive(p: LoyaltyProgram) {
    try {
      const res = await loyaltyApi.updateProgram(p.id, { isActive: !p.isActive });
      if (res.success) { load(); toast.success(p.isActive ? "Paused." : "Activated."); }
    } catch { toast.error("Unexpected error."); }
  }

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Loyalty Programs</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Create and manage stamp programs</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-5 mb-5 bg-brand-surface border border-brand/10 rounded-2xl p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
        <p className="text-xs text-brand/80 leading-relaxed">The first active program is used when new customers enroll. You can pause or delete inactive programs at any time.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
      ) : (
        <div className="px-5 space-y-3">
          {programs.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="bg-[var(--surface)] rounded-2xl border-2 border-brand/30 shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-brand uppercase tracking-widest">Editing</p>
                  <button onClick={() => setEditingId(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={(e) => handleUpdate(p.id, e)} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block">Program Name</label>
                    <input type="text" required value={editForms[p.id]?.name ?? ""} maxLength={100}
                      onChange={(e) => setEditForms((f) => ({ ...f, [p.id]: { ...f[p.id], name: e.target.value } }))}
                      placeholder="e.g. Coffee Rewards" className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <NumField label="Stamps required" value={editForms[p.id]?.stampsRequired ?? p.stampsRequired}
                    onChange={(v) => setEditForms((f) => ({ ...f, [p.id]: { ...f[p.id], stampsRequired: v } }))} min={1} max={100} />
                  <NumField label="Reward value (KES)" value={editForms[p.id]?.rewardValue ?? p.rewardValue}
                    onChange={(v) => setEditForms((f) => ({ ...f, [p.id]: { ...f[p.id], rewardValue: v } }))} min={1} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward description</label>
                    <input type="text" required maxLength={200} value={editForms[p.id]?.rewardDescription ?? p.rewardDescription}
                      onChange={(e) => setEditForms((f) => ({ ...f, [p.id]: { ...f[p.id], rewardDescription: e.target.value } }))}
                      placeholder="e.g. Free coffee" className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <button type="submit" disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </form>
              </div>
            ) : (
              <div key={p.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${p.isActive ? "bg-green-500" : "bg-[var(--text-muted)]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{p.stampsRequired} stamps → {p.rewardDescription}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Value: KES {p.rewardValue}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleActive(p)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${p.isActive ? "text-green-600 border-green-200 bg-green-50 hover:bg-green-100" : "text-[var(--text-tertiary)] border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--border-light)]"}`}>
                      {p.isActive ? "Active" : "Paused"}
                    </button>
                    <button onClick={() => startEdit(p)} className="h-7 w-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-brand hover:border-brand/30 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                      className="h-7 w-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50">
                      {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {showCreate ? (
            <div className="bg-[var(--surface)] rounded-2xl border-2 border-brand/30 shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-brand uppercase tracking-widest">New Program</p>
                <button onClick={() => { setShowCreate(false); setCreateForm(blank); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">Program Name</label>
                  <input type="text" required maxLength={100} value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Coffee Rewards" className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <NumField label="Stamps required" value={createForm.stampsRequired}
                  onChange={(v) => setCreateForm((f) => ({ ...f, stampsRequired: v }))} min={1} max={100} />
                <NumField label="Reward value (KES)" value={createForm.rewardValue}
                  onChange={(v) => setCreateForm((f) => ({ ...f, rewardValue: v }))} min={1} />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">Reward description</label>
                  <input type="text" required maxLength={200} value={createForm.rewardDescription}
                    onChange={(e) => setCreateForm((f) => ({ ...f, rewardDescription: e.target.value }))}
                    placeholder="e.g. Free coffee of your choice"
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <button type="submit" disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isSaving ? "Creating…" : "Create Program"}
                </button>
              </form>
            </div>
          ) : (
            <button onClick={() => { setShowCreate(true); setEditingId(null); }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand/30 text-brand hover:bg-brand-surface rounded-2xl py-3.5 text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" />Add Loyalty Program
            </button>
          )}
        </div>
      )}
    </div>
  );
}
