"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Notifications</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Updates from your loyalty activity</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-5 py-12 text-center shadow-card">
        <Bell className="mx-auto h-7 w-7 text-[var(--text-tertiary)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">No notifications yet</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">New activity will appear here when notification history is available.</p>
      </section>
    </div>
  );
}