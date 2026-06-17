"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { Business } from "@/types";
import toast from "react-hot-toast";
import {
  ArrowLeft, Loader2, Save, Store, Phone, Mail, MapPin, FileText, Link2, Hash,
} from "lucide-react";

function Field({ label, icon, value, onChange, placeholder, type = "text", required, readOnly }: {
  label: string; icon: React.ReactNode; value: string;
  onChange?: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">{icon}{label}</label>
      <input type={type} value={value} readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} required={required}
        className={`w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${readOnly ? "bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-default" : ""}`} />
    </div>
  );
}

export default function BusinessProfilePage() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", location: "", phoneNumber: "",
    email: "", description: "", logoUrl: "", mpesaNumber: "",
  });

  useEffect(() => {
    businessesApi.getMine().then((res) => {
      if (res.success && res.data) {
        const b = res.data;
        setBusiness(b);
        setForm({
          name: b.name ?? "", category: b.category ?? "", location: b.location ?? "",
          phoneNumber: b.phoneNumber ?? "", email: b.email ?? "", description: b.description ?? "",
          logoUrl: b.logoUrl ?? "", mpesaNumber: (b as any).mpesaNumber ?? "",
        });
      }
      setIsLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const res = await businessesApi.updateMine(form);
      if (res.success && res.data) { setBusiness(res.data); toast.success("Business profile updated!"); }
      else toast.error(res.error?.message ?? "Failed to update.");
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
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Business Profile</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Manage your business details</p>
        </div>
      </div>

      {/* Business logo preview */}
      <div className="mx-5 mb-5 flex items-center gap-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <div className="h-14 w-14 rounded-2xl bg-brand-surface border border-brand/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {form.logoUrl ? <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" /> : <Store className="h-7 w-7 text-brand" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{form.name || "Your Business"}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{form.category}{form.category && form.location ? " · " : ""}{form.location}</p>
        </div>
      </div>

      <div className="px-5">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Core info */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Core Info</p>
            <Field label="Business Name" icon={<Store className="h-3.5 w-3.5" />} value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Artisan Brews" required />
            <Field label="Category" icon={<Hash className="h-3.5 w-3.5" />} value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="Cafe, Restaurant, Salon…" required />
            <Field label="Location" icon={<MapPin className="h-3.5 w-3.5" />} value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Downtown, Nairobi" required />
          </div>

          {/* Contact */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Contact</p>
            <Field label="Phone" icon={<Phone className="h-3.5 w-3.5" />} value={form.phoneNumber}
              onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))} placeholder="+254 700 000 000" type="tel" />
            <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />} value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="hello@business.co.ke" type="email" />
          </div>

          {/* Branding */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Branding</p>
            <Field label="Logo URL" icon={<Link2 className="h-3.5 w-3.5" />} value={form.logoUrl}
              onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} placeholder="https://cdn.example.com/logo.png" type="url" />
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                <FileText className="h-3.5 w-3.5" />Description
              </label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell customers what makes your business special…" rows={3} maxLength={500}
                className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Payment</p>
            <Field label="M-Pesa Paybill / Till" icon={<Hash className="h-3.5 w-3.5" />} value={form.mpesaNumber}
              onChange={(v) => setForm((f) => ({ ...f, mpesaNumber: v }))} placeholder="174379" />
          </div>

          <button type="submit" disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isSaving ? "Saving…" : "Save Business Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
