"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, THEMES } from "@/store/themeStore";
import { useAuth } from "@/hooks/useAuth";
import {
  User as UserIcon,
  ChevronRight,
  KeyRound,
  Share2,
  Info,
  HelpCircle,
  MessageCircle,
  LogOut,
  Copy,
  Check,
  Palette,
  X,
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { logout } = useAuth();
  const [copiedRef, setCopiedRef] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const currentTheme = THEMES.find((t) => t.value === theme);

  const referralCode = user?.id ? user.id.slice(0, 8).toUpperCase() : "—";
  const isCustomer = user?.role === "Customer";

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Profile Header */}
      <div className="px-5 pt-5 pb-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-light flex items-center justify-center overflow-hidden ring-2 ring-brand/20">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-8 w-8 text-brand" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{user?.fullName}</h1>
            <p className="text-sm text-[var(--text-secondary)] truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand bg-brand-surface px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Quick Card — accent highlight (10%) */}
      {isCustomer && (
        <div className="px-5 mb-5">
          <div className="bg-accent-light rounded-2xl p-4 flex items-center gap-3 border border-accent/10">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Share2 className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-accent-text font-medium">Your Referral Code</p>
              <p className="text-lg font-bold text-accent-text tracking-widest font-mono">{referralCode}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="h-9 w-9 rounded-xl bg-[var(--surface)] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              {copiedRef ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4 text-[var(--text-tertiary)]" />}
            </button>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="px-5 space-y-3">
        {/* Account Section */}
        <SettingsSection title="ACCOUNT">
          <SettingsRow href="/dashboard/profile/account" icon={UserIcon} label="Account Info" sub="Name, phone, date of birth, gender" />
          <SettingsRow href="/dashboard/profile/password" icon={KeyRound} label="Change Password" sub="Update your password" />
          {isCustomer && (
            <SettingsRow href="/dashboard/profile/referral" icon={Share2} label="Referrals" sub="Invite friends, earn rewards" />
          )}
        </SettingsSection>

        {/* Theme */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">APPEARANCE</p>
          </div>
          <button
            onClick={() => setShowThemePicker(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--border-light)] active:bg-[var(--border)] transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center flex-shrink-0">
              <Palette className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-tertiary)]">{currentTheme?.label}</p>
            </div>
            <div className="flex -space-x-1.5 mr-1">
              <div className="h-5 w-5 rounded-full border-2 border-[var(--surface)] shadow-sm" style={{ background: currentTheme?.primary }} />
              <div className="h-5 w-5 rounded-full border-2 border-[var(--surface)] shadow-sm" style={{ background: currentTheme?.accent }} />
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          </button>
        </div>

        {/* Theme bottom sheet */}
        {showThemePicker && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={() => setShowThemePicker(false)}
            />
            <div className="relative bg-[var(--surface)] rounded-t-3xl shadow-elevated overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div>
                  <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3" />
                  <p className="text-base font-bold text-[var(--text-primary)]">Choose Theme</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Personalize your experience</p>
                </div>
                <button
                  onClick={() => setShowThemePicker(false)}
                  className="h-8 w-8 rounded-full bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
                >
                  <X className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="divide-y divide-[var(--border-light)] pb-8">
                {THEMES.map(({ value, label, primary, accent }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { setTheme(value); setShowThemePicker(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-4 transition-colors ${
                        isActive ? "bg-brand-surface" : "hover:bg-[var(--border-light)] active:bg-[var(--border)]"
                      }`}
                    >
                      <div className="flex -space-x-2">
                        <div className="h-9 w-9 rounded-full border-2 border-[var(--surface)] shadow-md" style={{ background: primary }} />
                        <div className="h-9 w-9 rounded-full border-2 border-[var(--surface)] shadow-md" style={{ background: accent }} />
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

        {/* Support Section */}
        <SettingsSection title="SUPPORT">
          <SettingsRow href="/dashboard/profile/about" icon={Info} label="About Punched" sub="Our mission & story" />
          <SettingsRow href="/dashboard/profile/faq" icon={HelpCircle} label="FAQ" sub="Frequently asked questions" />
          <SettingsRow href="/dashboard/profile/help" icon={MessageCircle} label="Help & Support" sub="Get in touch" />
        </SettingsSection>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card px-4 py-3.5 hover:bg-danger-light transition-colors group active:scale-[0.99]"
        >
          <div className="h-9 w-9 rounded-xl bg-danger-light flex items-center justify-center group-hover:bg-danger/10 transition-colors">
            <LogOut className="h-4 w-4 text-danger" />
          </div>
          <span className="text-sm font-semibold text-danger">Log Out</span>
        </button>

        <p className="text-center text-[10px] text-[var(--text-muted)] pt-2 pb-4">Punched Loyalty v1.0.0</p>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{title}</p>
      </div>
      <div className="divide-y divide-[var(--border-light)]">{children}</div>
    </div>
  );
}

function SettingsRow({ href, icon: Icon, label, sub }: { href: string; icon: React.ElementType; label: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--border-light)] transition-colors active:bg-[var(--border)]">
      <div className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
    </Link>
  );
}
