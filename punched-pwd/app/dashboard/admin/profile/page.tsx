"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, THEMES } from "@/store/themeStore";
import { useAuth } from "@/hooks/useAuth";
import {
  User as UserIcon,
  ChevronRight,
  KeyRound,
  Info,
  HelpCircle,
  MessageCircle,
  LogOut,
  Palette,
  X,
  Check,
  Shield,
  Mail,
  Phone,
  Calendar,
  Copy,
} from "lucide-react";

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { logout } = useAuth();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const currentTheme = THEMES.find((t) => t.value === theme);

  const initial = user?.fullName?.charAt(0).toUpperCase() || "A";

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Profile Hero */}
      <div className="bg-gradient-to-br from-brand to-brand-hover px-5 pt-6 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[var(--surface)]/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-2xl font-bold">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate">{user?.fullName}</h1>
            <p className="text-sm text-white/70 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-[var(--surface)]/20 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {user?.role}
              </span>
              <span className="text-xs text-white/50">
                Since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-3">
        {/* Personal Details Card */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">PERSONAL DETAILS</p>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            <DetailRow icon={Mail} label="Email" value={user?.email || "—"} />
            <DetailRow icon={Phone} label="Phone" value={user?.phone || "Not set"} />
            <DetailRow icon={UserIcon} label="Gender" value={user?.gender || "Not set"} />
            <DetailRow
              icon={Calendar}
              label="Date of Birth"
              value={
                user?.dateOfBirth
                  ? `${new Date(user.dateOfBirth).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} (${calcAge(user.dateOfBirth)} yrs)`
                  : "Not set"
              }
            />
          </div>
        </div>

        {/* Account Section */}
        <SettingsSection title="ACCOUNT">
          <SettingsRow href="/dashboard/profile/account" icon={UserIcon} label="Edit Account" sub="Name, phone, date of birth, gender" />
          <SettingsRow href="/dashboard/profile/password" icon={KeyRound} label="Change Password" sub="Update your password" />
        </SettingsSection>

        {/* Theme */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">APPEARANCE</p>
          </div>
          <button
            onClick={() => setShowThemePicker(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
              <Palette className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-tertiary)]">{currentTheme?.label}</p>
            </div>
            <div className="flex -space-x-1.5 mr-1">
              <div className="h-4 w-4 rounded-full border-2 border-white shadow-card" style={{ background: currentTheme?.primary }} />
              <div className="h-4 w-4 rounded-full border-2 border-white shadow-card" style={{ background: currentTheme?.accent }} />
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          </button>
        </div>

        {/* Theme bottom sheet */}
        {showThemePicker && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowThemePicker(false)} />
            <div className="relative bg-[var(--surface)] rounded-t-3xl shadow-elevated overflow-hidden animate-scale-in">
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

        {/* User ID */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">REFERENCE</p>
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <code className="flex-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-light)] px-3 py-2.5 rounded-xl font-mono text-[var(--text-tertiary)] truncate">
              {user?.id}
            </code>
            <button
              onClick={() => {
                if (user?.id) {
                  navigator.clipboard.writeText(user.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }
              }}
              className="h-10 w-10 flex-shrink-0 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center hover:bg-[var(--border-light)] transition-colors"
            >
              {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-[var(--text-tertiary)]" />}
            </button>
          </div>
        </div>

        {/* Support Section */}
        <SettingsSection title="SUPPORT">
          <SettingsRow href="/dashboard/profile/about" icon={Info} label="About Punched" sub="Our mission & story" />
          <SettingsRow href="/dashboard/profile/faq" icon={HelpCircle} label="FAQ" sub="Frequently asked questions" />
          <SettingsRow href="/dashboard/profile/help" icon={MessageCircle} label="Help & Support" sub="Get in touch" />
        </SettingsSection>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card px-4 py-3.5 hover:bg-red-50 transition-colors group"
        >
          <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <span className="text-sm font-semibold text-red-500">Log Out</span>
        </button>

        <p className="text-center text-[10px] text-[var(--text-muted)] pt-2">Punched Loyalty v1.0.0</p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Icon className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{label}</p>
        <p className="text-sm text-[var(--text-primary)] truncate">{value}</p>
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
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors">
      <div className="h-9 w-9 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
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
