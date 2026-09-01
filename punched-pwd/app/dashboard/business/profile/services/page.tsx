"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { servicesApi } from "@/lib/api/services";
import type { ServiceCatalogItemResponse } from "@/types";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Plus, Clock3, Power, Pencil, Layers } from "lucide-react";
import { Button, FormField, Modal } from "@/components/ui";

/**
 * Owner-facing service catalog management: create, edit, activate/deactivate.
 * All data comes from /v1/services/me (tenant-scoped server-side) — nothing
 * is hardcoded. Follows the business profile design language.
 */

interface ServiceFormState {
  id: string | null; // null → create
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
}

const EMPTY_FORM: ServiceFormState = {
  id: null,
  name: "",
  description: "",
  durationMinutes: 30,
  price: 0,
};

export default function ServicesManagementPage() {
  useRoleGuard("Business");
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ServiceCatalogItemResponse[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    servicesApi
      .getMyServices()
      .then((res) => {
        if (res.success && res.data) setServices(res.data);
        else toast.error(res.error?.message ?? "Could not load services.");
      })
      .catch(() => toast.error("Could not load services."))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (svc: ServiceCatalogItemResponse) => {
    setForm({
      id: svc.id,
      name: svc.name,
      description: svc.description ?? "",
      durationMinutes: svc.durationMinutes,
      price: svc.price,
    });
    setFormOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.durationMinutes <= 0) return;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMinutes: form.durationMinutes,
        price: form.price,
      };
      const res = form.id
        ? await servicesApi.update(form.id, payload)
        : await servicesApi.create(payload);
      if (res.success) {
        toast.success(form.id ? "Service updated." : "Service created.");
        setFormOpen(false);
        load();
      } else {
        toast.error(res.error?.message ?? "Could not save service.");
      }
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (svc: ServiceCatalogItemResponse) => {
    const res = await servicesApi.update(svc.id, { isActive: !svc.isActive });
    if (res.success) {
      toast.success(svc.isActive ? "Service deactivated." : "Service activated.");
      load();
    } else {
      toast.error(res.error?.message ?? "Could not update service.");
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link
          href="/dashboard/business/profile"
          className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
                <Layers className="h-5 w-5 text-brand flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Services</h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            What customers can book, with duration and price
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-3 rounded-xl bg-brand text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-hover transition-colors flex-shrink-0"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>


      {/* List */}
      <div className="px-5 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No services yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Add your first service so customers can book appointments.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 h-9 px-4 rounded-xl bg-brand text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-brand-hover transition-colors"
            >
              <Plus className="h-4 w-4" /> Add service
            </button>
          </div>
        ) : (
          services.map((svc) => (
            <div
              key={svc.id}
              className={`bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 ${
                svc.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">{svc.name}</h2>
                    {!svc.isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] border border-[var(--border)] rounded-full px-2 py-0.5">
                        Inactive
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{svc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                      <Clock3 className="h-3.5 w-3.5" /> {svc.durationMinutes} min
                    </span>
                    {svc.price > 0 && (
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">KES {svc.price}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(svc)}
                    aria-label={`Edit ${svc.name}`}
                    className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(svc)}
                    aria-label={svc.isActive ? `Deactivate ${svc.name}` : `Activate ${svc.name}`}
                    className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
                      svc.isActive
                        ? "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
                        : "border-brand text-brand hover:bg-brand-surface"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Create / edit modal */}
      {formOpen && (
        <Modal
          open
          onClose={() => setFormOpen(false)}
          title={form.id ? "Edit service" : "New service"}
          description="Durations drive real availability — set them accurately."
        >
          <form className="space-y-5" onSubmit={handleSave}>
            <FormField label="Service name">
              <input
                type="text"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Premium Haircut"
                aria-label="Service name"
                className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
              />
            </FormField>

            <FormField label="Description (optional)">
              <textarea
                maxLength={500}
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Shown to customers during booking"
                aria-label="Service description"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)] resize-none"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Duration (minutes)">
                <input
                  type="number"
                  required
                  min={5}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value, 10) || 0 }))}
                  aria-label="Duration in minutes"
                  className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
              </FormField>
              <FormField label="Price (KES)">
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  aria-label="Price in KES"
                  className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
              </FormField>
            </div>

            <Button type="submit" fullWidth disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {form.id ? "Save changes" : "Create service"}
            </Button>
                    </form>
        </Modal>
      )}
    </div>
  );
}
