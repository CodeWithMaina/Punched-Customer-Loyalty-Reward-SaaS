"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminUserResponse, PaginatedResponse, UserRole } from "@/types";
import {
  Loader2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  X,
  Check,
  Shield,
  Store,
  UserCheck,
  User,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const ROLE_META: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  Admin: { icon: Shield, color: "text-red-600", bg: "bg-red-50" },
  Business: { icon: Store, color: "text-emerald-600", bg: "bg-emerald-50" },
  Staff: { icon: UserCheck, color: "text-violet-600", bg: "bg-violet-50" },
  Customer: { icon: User, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function AdminUsers() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuthStore();
  const [data, setData] = useState<PaginatedResponse<AdminUserResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ fullName: string; role: UserRole; phoneNumber: string; gender: string; dateOfBirth: string }>({
    fullName: "", role: "Customer", phoneNumber: "", gender: "", dateOfBirth: "",
  });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    adminApi
      .getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        page,
        pageSize: 20,
      })
      .then((res) => {
        if (res.success && res.data) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, page]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || currentUser.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }
    fetchUsers();
  }, [currentUser, authLoading, router, fetchUsers]);

  const startEdit = (u: AdminUserResponse) => {
    setEditingId(u.id);
    setEditForm({
      fullName: u.fullName,
      role: u.role,
      phoneNumber: u.phoneNumber || "",
      gender: u.gender || "",
      dateOfBirth: u.dateOfBirth || "",
    });
  };

  const saveEdit = async (userId: string) => {
    const res = await adminApi.updateUser(userId, {
      fullName: editForm.fullName || undefined,
      role: editForm.role,
      phoneNumber: editForm.phoneNumber || undefined,
      gender: editForm.gender || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined,
    });
    if (res.success) {
      toast.success("User updated");
      setEditingId(null);
      fetchUsers();
    } else {
      toast.error(res.error?.message || "Failed to update");
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const res = await adminApi.deleteUser(userId);
    if (res.success) {
      toast.success("User deleted");
      fetchUsers();
    } else {
      toast.error(res.error?.message || "Failed to delete");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Users className="h-6 w-6 text-violet-600" />
          Users
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {data ? `${data.totalCount} total accounts` : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="sm:w-36 px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-[var(--surface)]"
        >
          <option value="">All Roles</option>
          <option value="Customer">Customer</option>
          <option value="Business">Business</option>
          <option value="Staff">Staff</option>
          <option value="Admin">Admin</option>
        </select>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((u) => {
            const roleMeta = ROLE_META[u.role] || ROLE_META.Customer;
            const RoleIcon = roleMeta.icon;
            const isEditing = editingId === u.id;

            return (
              <div key={u.id} className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card overflow-hidden">
                {isEditing ? (
                  /* Edit Mode */
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Full Name</label>
                        <input
                          type="text"
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Role</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
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
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                          placeholder="+254..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
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
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-[var(--surface)]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] px-3 py-1.5 rounded-lg hover:bg-[var(--border-light)]"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(u.id)}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-brand hover:bg-brand-hover px-3 py-1.5 rounded-lg"
                      >
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg ${roleMeta.bg} ${roleMeta.color} flex items-center justify-center flex-shrink-0`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[var(--text-primary)] truncate hover:text-brand transition-colors">{u.fullName}</span>
                        {u.isVerified ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">{u.email}</div>
                    </div>
                    <span className={`hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${roleMeta.bg} ${roleMeta.color}`}>
                      {u.role}
                    </span>
                    <div className="hidden md:block text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-brand hover:bg-brand-surface transition-colors"
                        title="View Profile"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(u)}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-brand hover:bg-brand-surface transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {u.role !== "Admin" && (
                        <button
                          onClick={() => handleDelete(u.id, u.fullName)}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--text-secondary)]">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(data.totalPages, page + 1))}
              disabled={page >= data.totalPages}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
