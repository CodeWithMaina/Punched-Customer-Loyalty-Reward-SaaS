"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/lib/api/users";
import { authApi } from "@/lib/api/auth";
import type { UpdateProfileRequest } from "@/types";
import toast from "react-hot-toast";
import {
  ArrowLeft, Loader2, Save, User, Phone, Mail, Link2, Lock, Eye, EyeOff,
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

export default function OwnerProfilePage() {
  useRoleGuard("Business");
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", avatarUrl: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName ?? "", phoneNumber: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" });
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const data: UpdateProfileRequest = {};
      if (form.fullName) data.fullName = form.fullName;
      if (form.phoneNumber) data.phoneNumber = form.phoneNumber;
      if (form.avatarUrl) data.avatarUrl = form.avatarUrl;
      const res = await usersApi.updateProfile(data);
      if (res.success && res.data) { setUser(res.data); toast.success("Profile updated!"); }
      else toast.error(res.error?.message ?? "Failed to update.");
    } catch { toast.error("Unexpected error."); } finally { setIsSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords do not match."); return; }
    if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setIsSavingPw(true);
    try {
      const res = await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      if (res.success) { toast.success("Password changed!"); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
      else toast.error(res.error?.message ?? "Failed to change password.");
    } catch { toast.error("Unexpected error."); } finally { setIsSavingPw(false); }
  }

  const pwFields = [
    { key: "current" as const, fieldKey: "currentPassword" as const, label: "Current Password" },
    { key: "newPw" as const, fieldKey: "newPassword" as const, label: "New Password" },
    { key: "confirm" as const, fieldKey: "confirmPassword" as const, label: "Confirm New Password" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Owner Profile</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Manage your personal account</p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className="mx-5 mb-5 flex items-center gap-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <div className="h-14 w-14 rounded-full bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0">
          {form.avatarUrl ? (
            <img src={form.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-brand">{form.fullName?.charAt(0).toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{form.fullName || user?.fullName}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Personal info form */}
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Personal Info</p>
            <Field label="Full Name" icon={<User className="h-3.5 w-3.5" />} value={form.fullName}
              onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} placeholder="Your full name" required />
            <Field label="Phone" icon={<Phone className="h-3.5 w-3.5" />} value={form.phoneNumber}
              onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))} placeholder="+254 700 000 000" type="tel" />
            <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />} value={user?.email ?? ""} readOnly />
            <Field label="Avatar URL" icon={<Link2 className="h-3.5 w-3.5" />} value={form.avatarUrl}
              onChange={(v) => setForm((f) => ({ ...f, avatarUrl: v }))} placeholder="https://…/avatar.jpg" type="url" />
          </div>
          <button type="submit" disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Change password form */}
        <form onSubmit={savePassword} className="space-y-4">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-4">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Change Password</p>
            {pwFields.map(({ key, fieldKey, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  <Lock className="h-3.5 w-3.5" />{label}
                </label>
                <div className="relative">
                  <input type={showPw[key] ? "text" : "password"} required value={pwForm[fieldKey]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [fieldKey]: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                    {showPw[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={isSavingPw}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50">
            {isSavingPw ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
            {isSavingPw ? "Saving..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
