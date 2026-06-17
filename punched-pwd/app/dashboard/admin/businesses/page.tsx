"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminBusinessSummary, PaginatedResponse } from "@/types";
import {
  Loader2,
  Store,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Users,
  Stamp,
  Gift,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminBusinesses() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [data, setData] = useState<PaginatedResponse<AdminBusinessSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);


  const fetchBusinesses = useCallback(() => {
    setLoading(true);
    adminApi
      .getBusinesses({
        search: search || undefined,
        category: category || undefined,
        page,
        pageSize: 20,
      })
      .then((res) => {
        if (res.success && res.data) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [search, category, page]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }
    fetchBusinesses();
  }, [user, authLoading, router, fetchBusinesses]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete business "${name}"? This action cannot be undone.`)) return;
    const res = await adminApi.deleteBusiness(id);
    if (res.success) {
      toast.success("Business deleted");
      fetchBusinesses();
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
          <Store className="h-6 w-6 text-emerald-600" />
          Businesses
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {data ? `${data.totalCount} total` : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by category..."
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="sm:w-40 px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
      </div>

      {/* Business List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((biz) => (
            <div
              key={biz.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card overflow-hidden"
            >
              {/* Row */}
              <button
                onClick={() => router.push(`/dashboard/admin/businesses/${biz.id}`)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--text-primary)] truncate">{biz.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {biz.location}
                    <span className="mx-1">·</span>
                    <span className="font-medium">{biz.category}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{biz.totalCustomers}</span>
                  <span className="flex items-center gap-1"><Stamp className="h-3.5 w-3.5" />{biz.totalStamps}</span>
                  <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" />{biz.totalRedemptions}</span>
                </div>
              </button>


            </div>
          ))}
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
