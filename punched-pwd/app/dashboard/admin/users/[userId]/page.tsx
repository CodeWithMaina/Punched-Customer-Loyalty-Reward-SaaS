"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminUserResponse, UserRole } from "@/types";
import {
  Loader2, ArrowLeft, Mail, Phone, Calendar, Shield, Store,
  UserCheck, User as UserIcon, Edit3, Check, X, Trash2,
  CheckCircle, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const ROLE_META: Record<string, { icon: typeof Shield; color: string; bg: string; gradient: string }> = {
  Admin:    { icon: Shield,   color: "text-red-600",     bg: "bg-red-50",     gradient: "from-red-500 to-red-600" },
  Business: { icon: Store,    color: "text-emerald-600", bg: "bg-emerald-50", gradient: "from-emerald-500 to-emerald-600" },
  Staff:    { icon: UserCheck, color: "text-violet-600",  bg: "bg-violet-50",  gradient: "from-violet-500 to-violet-600" },
  Customer: { icon: UserIcon, color: "text-blue-600",    bg: "bg-blue-50",    gradient: "from-blue-500 to-blue-600" },
};

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AdminUserDetail() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<AdminUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", role: "Customer" as UserRole, phoneNumber: "", gender: "", dateOfBirth: "" });

  const userId = params.userId as string;

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || currentUser.role !== "Admin") { router.replace("/dashboard"); return; }

    adminApi.getUser(userId)
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
          setEditForm({
            fullName: res.data.fullName,
            role: res.data.role,
            phoneNumber: res.data.phoneNumber || "",
            gender: res.data.gender || "",
            dateOfBirth: res.data.dateOfBirth || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser, authLoading, router, userId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await adminApi.updateUser(userId, {
      fullName: editForm.fullName || undefined,
      role: editForm.role,
      phoneNumber: editForm.phoneNumber || undefined,
      gender: editForm.gender || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined,
    });
    if (res.success && res.data) {
      setProfile(res.data);
      setEditing(false);
      toast.success("User updated");
    } else {
      toast.error(res.error?.message || "Failed to update");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!profile) return;
    if (profile.role === "Admin") { toast.error("Cannot delete admin accounts"); return; }
    if (!confirm(`Delete user "${profile.fullName}"? This cannot be undone.`)) return;
    const res = await adminApi.deleteUser(userId);
    if (res.success) {
      toast.success("User deleted");
      router.replace("/dashboard/admin/users");
    } else {
      toast.error(res.error?.message || "Failed to delete");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto text-center py-20">
        <UserIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-secondary)]">User not found</p>
        <Link href="/dashboard/admin/users" className="text-brand text-sm font-medium mt-2 inline-block">
          Back to users
        </Link>
      </div>
    );
  }

  const roleMeta = ROLE_META[profile.role] || ROLE_META.Customer;
  const RoleIcon = roleMeta.icon;
  const initial = profile.fullName.charAt(0).toUpperCase();

  const details = [
    { label: "Email", value: profile.email, icon: Mail },
    { label: "Phone", value: profile.phoneNumber || "Not provided", icon: Phone },
    { label: "Gender", value: profile.gender || "Not specified", icon: UserIcon },
    { label: "Date of Birth", value: profile.dateOfBirth ? `${new Date(profile.dateOfBirth).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} (${calcAge(profile.dateOfBirth)} years)` : "Not provided", icon: Calendar },
    { label: "Joined", value: new Date(profile.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Back */}
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Users
      </Link>

      {/* Hero Card */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-brand-hover px-5 py-8 text-white">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-white/30 flex-shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-2xl font-bold">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{profile.fullName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {profile.role}
                </span>
                {profile.isVerified ? (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="bg-red-400/30 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-[var(--border-light)]">
          {details.map((d) => (
            <div key={d.label} className="px-5 py-3.5 flex items-center gap-3">
              <d.icon className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{d.label}</p>
                <p className="text-sm text-[var(--text-primary)] truncate">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 space-y-4">
          <p className="text-sm font-bold text-[var(--text-primary)]">Edit User</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Full Name</label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
              >
                <option value="Customer">Customer</option>
                <option value="Business">Business</option>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Phone</label>
              <input
                type="text"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                placeholder="+254..."
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Gender</label>
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] px-4 py-2 rounded-xl hover:bg-[var(--border-light)] transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        /* Actions */
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover hover:bg-brand-surface px-4 py-2.5 rounded-xl border border-brand/20 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Edit User
          </button>
          {profile.role !== "Admin" && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          )}
        </div>
      )}

      {/* ID Reference */}
      <div className="text-xs text-[var(--text-muted)] font-mono truncate">ID: {profile.id}</div>
    </div>
  );
}
