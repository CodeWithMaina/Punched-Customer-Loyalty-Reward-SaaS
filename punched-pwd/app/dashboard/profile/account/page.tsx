"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/lib/api/users";
import type { User, UpdateProfileRequest } from "@/types";
import { ArrowLeft, Loader2, Save, Copy, Check, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";

const GENDER_OPTIONS = ["Prefer not to say", "Male", "Female", "Non-binary", "Other"];

export default function AccountInfoPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        phoneNumber: user.phone ?? "",
        avatarUrl: user.avatarUrl ?? "",
        dateOfBirth: user.dateOfBirth ?? undefined,
        gender: user.gender ?? "",
      });
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await usersApi.updateProfile(form);
      if (res.success && res.data) {
        setUser(res.data as unknown as User);
        toast.success("Profile updated!");
      } else {
        toast.error(res.error?.message ?? "Update failed");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Account Info</h1>
      </div>

      {/* Avatar Preview */}
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-brand-light flex items-center justify-center overflow-hidden ring-4 ring-brand/10">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-10 w-10 text-brand" />
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <FieldGroup label="Full Name">
          <input
            type="text"
            value={form.fullName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
          />
        </FieldGroup>

        <FieldGroup label="Email">
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-not-allowed"
          />
        </FieldGroup>

        <FieldGroup label="Phone Number">
          <input
            type="tel"
            value={form.phoneNumber ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
            placeholder="+254712345678"
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
          />
        </FieldGroup>

        <FieldGroup label="Date of Birth">
          <input
            type="date"
            value={form.dateOfBirth ? String(form.dateOfBirth) : ""}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value as any }))}
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
          />
        </FieldGroup>

        <FieldGroup label="Gender">
          <select
            value={form.gender ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
          >
            <option value="">Select gender</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="Avatar URL">
          <input
            type="url"
            value={form.avatarUrl ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[var(--surface)]"
          />
        </FieldGroup>

        {/* User ID */}
        <FieldGroup label="User ID">
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-light)] px-4 py-3 rounded-xl font-mono text-[var(--text-secondary)] truncate">
              {user?.id}
            </code>
            <button
              type="button"
              onClick={() => {
                if (user?.id) {
                  navigator.clipboard.writeText(user.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }
              }}
              className="h-11 w-11 flex-shrink-0 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center hover:bg-[var(--border-light)] transition-colors"
            >
              {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-[var(--text-tertiary)]" />}
            </button>
          </div>
        </FieldGroup>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors mt-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
