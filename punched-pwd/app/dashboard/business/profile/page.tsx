"use client";

import Link from "next/link";
import { useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStore, THEMES } from "@/store/themeStore";
import {
  User, Store, Gift, Link2, HelpCircle,
  MessageCircle, LogOut, ChevronRight, Shield, Palette, Check, X,
} from "lucide-react";

const MENU_GROUPS = [
  {
    label: "Account",
    items: [
      { href: "/dashboard/business/profile/owner", icon: User, label: "Owner Profile", description: "Name, phone, avatar, password" },
      { href: "/dashboard/business/profile/business", icon: Store, label: "Business Profile", description: "Name, location, contact, branding" },
    ],
  },
  {
    label: "Programs",
    items: [
      { href: "/dashboard/business/profile/programs", icon: Gift, label: "Loyalty Programs", description: "Create and manage stamp programs" },
      { href: "/dashboard/business/profile/referral", icon: Link2, label: "Referral Program", description: "Reward customers who refer friends" },
    ],
  },
  {
    label: "Help",
    items: [
      { href: "/dashboard/business/profile/faq", icon: HelpCircle, label: "FAQ", description: "Common questions answered" },
      { href: "/dashboard/business/profile/support", icon: MessageCircle, label: "Support", description: "Get help from the Punched team" },
    ],
  },
];

export default function SettingsPage() {
  useRoleGuard("Business");
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { theme, setTheme } = useThemeStore();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const currentTheme = THEMES.find((t) => t.value === theme);

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header identity card */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
      </div>

      <div className="mx-5 mb-6 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-brand">{user?.fullName?.charAt(0).toUpperCase() ?? "?"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.fullName}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand-surface px-2 py-0.5 rounded-full mt-1">
            <Shield className="h-3 w-3" />Business Owner
          </span>
        </div>
      </div>

      {/* Menu groups */}
      <div className="px-5 space-y-6">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-1">{group.label}</p>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
              {group.items.map(({ href, icon: Icon, label, description }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Appearance / Theme */}
        <div>
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-1">Appearance</p>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
            <button
              onClick={() => setShowThemePicker(true)}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                <Palette className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Theme</p>
                <p className="text-xs text-[var(--text-tertiary)]">{currentTheme?.label}</p>
              </div>
              <div className="flex -space-x-1.5 mr-2">
                <div className="h-4 w-4 rounded-full border-2 border-white shadow-card" style={{ background: currentTheme?.primary }} />
                <div className="h-4 w-4 rounded-full border-2 border-white shadow-card" style={{ background: currentTheme?.accent }} />
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Theme bottom sheet */}
        {showThemePicker && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowThemePicker(false)}
            />
            {/* Sheet */}
            <div className="relative bg-[var(--surface)] rounded-t-3xl shadow-elevated overflow-hidden animate-scale-in">
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div>
                  <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3" />
                  <p className="text-base font-bold text-[var(--text-primary)]">Choose Theme</p>
                </div>
                <button
                  onClick={() => setShowThemePicker(false)}
                  className="h-8 w-8 rounded-full bg-[var(--border-light)] flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              {/* Theme list */}
              <div className="divide-y divide-[var(--border-light)] pb-8">
                {THEMES.map(({ value, label, primary, accent }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { setTheme(value); setShowThemePicker(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-4 transition-colors ${
                        isActive ? "bg-brand-surface" : "hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)]"
                      }`}
                    >
                      <div className="flex -space-x-2">
                        <div className="h-9 w-9 rounded-full border-2 border-white shadow-md" style={{ background: primary }} />
                        <div className="h-9 w-9 rounded-full border-2 border-white shadow-md" style={{ background: accent }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-semibold ${isActive ? "text-brand-text" : "text-[var(--text-primary)]"}`}>{label}</p>
                        <p className="text-xs text-[var(--text-tertiary)] capitalize">{value}</p>
                      </div>
                      {isActive && <Check className="h-5 w-5 text-brand flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
            <button onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-4.5 w-4.5 text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-500">Sign Out</p>
                <p className="text-xs text-[var(--text-tertiary)]">Log out of your account</p>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[var(--text-muted)] pb-2">Punched v1.0.0</p>
      </div>
    </div>
  );
}
