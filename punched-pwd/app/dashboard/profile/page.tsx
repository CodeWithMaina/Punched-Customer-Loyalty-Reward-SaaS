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
  Pencil,
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { logout } = useAuth();

  const [copiedRef, setCopiedRef] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentTheme = THEMES.find((t) => t.value === theme);

  const referralCode = user?.id
    ? user.id.slice(0, 8).toUpperCase()
    : "—";

  const isCustomer = user?.role === "Customer";

  const copyReferralCode = async () => {
    if (!referralCode || referralCode === "—") return;

    await navigator.clipboard.writeText(referralCode);

    setCopiedRef(true);

    setTimeout(() => {
      setCopiedRef(false);
    }, 2000);
  };

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-10">
      {/* Profile header */}
      <header className="pt-7 pb-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-surface">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-7 w-7 text-brand" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {user?.fullName || "Your Profile"}
            </h1>

            <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
              {user?.email}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-brand-surface px-2.5 py-1 text-[10px] font-semibold text-brand">
                {user?.role}
              </span>

              {user?.createdAt && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Edit profile — editing happens on a separate page */}
      <div className="mb-6">
        <Link
          href="/dashboard/profile/account"
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3.5 shadow-card transition-colors hover:bg-[var(--surface-raised)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-surface">
            <Pencil className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Edit profile</p>
            <p className="text-xs text-[var(--text-tertiary)]">Update your personal information</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        </Link>
      </div>

      {/* Referral */}
      {isCustomer && (
        <section className="mb-7">
          <div className="rounded-2xl bg-[var(--accent-light)] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
                <Share2 className="h-4 w-4 text-[var(--accent)]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[var(--accent-text)]">
                  Referral code
                </p>

                <p className="mt-0.5 font-mono text-base font-bold tracking-[0.15em] text-[var(--accent-text)]">
                  {referralCode}
                </p>
              </div>

              <button
                onClick={copyReferralCode}
                aria-label="Copy referral code"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] transition-transform active:scale-95"
              >
                {copiedRef ? (
                  <Check className="h-4 w-4 text-[var(--success)]" />
                ) : (
                  <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Account */}
      <SettingsGroup title="Account">
        <SettingsRow
          href="/dashboard/profile/account"
          icon={UserIcon}
          label="Account information"
          sub="Personal details"
        />

        <SettingsRow
          href="/dashboard/profile/password"
          icon={KeyRound}
          label="Password"
          sub="Change your password"
        />

        {isCustomer && (
          <SettingsRow
            href="/dashboard/profile/referral"
            icon={Share2}
            label="Referrals"
            sub="Invite friends and earn rewards"
          />
        )}
      </SettingsGroup>

      {/* Appearance */}
      <SettingsGroup title="Appearance">
        <button
          onClick={() => setShowThemePicker(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--border-light)] active:bg-[var(--border-light)]"
        >
          <SettingsIcon>
            <Palette className="h-4 w-4 text-[var(--text-secondary)]" />
          </SettingsIcon>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Theme
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              {currentTheme?.label || "Default"}
            </p>
          </div>

          <div className="flex shrink-0 -space-x-1.5">
            <span
              className="h-5 w-5 rounded-full border-2 border-[var(--surface)]"
              style={{
                background: currentTheme?.primary,
              }}
            />

            <span
              className="h-5 w-5 rounded-full border-2 border-[var(--surface)]"
              style={{
                background: currentTheme?.accent,
              }}
            />
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        </button>
      </SettingsGroup>

      {/* Support */}
      <SettingsGroup title="Support">
        <SettingsRow
          href="/dashboard/profile/about"
          icon={Info}
          label="About Punched"
          sub="About the app"
        />

        <SettingsRow
          href="/dashboard/profile/faq"
          icon={HelpCircle}
          label="Frequently asked questions"
          sub="Find quick answers"
        />

        <SettingsRow
          href="/dashboard/profile/help"
          icon={MessageCircle}
          label="Help & support"
          sub="Get help from our team"
        />
      </SettingsGroup>

      {/* Logout */}
      <button
        onClick={logout}
        className="mt-6 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
          <LogOut className="h-4 w-4 text-red-500" />
        </div>

        <span className="text-sm font-semibold text-red-500">
          Log out
        </span>
      </button>

      <p className="mt-8 text-center text-[10px] text-[var(--text-muted)]">
        Punched Loyalty · v1.0.0
      </p>

      {/* Theme picker */}
      {showThemePicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <button
            aria-label="Close theme picker"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowThemePicker(false)}
          />

          {/* Bottom sheet */}
          <section className="relative w-full rounded-t-3xl bg-[var(--surface)] shadow-elevated animate-slide-up">
            <div className="mx-auto h-1 w-10 rounded-full bg-[var(--border)] mt-3" />

            <div className="flex items-center justify-between px-5 pb-4 pt-4">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Theme
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  Choose how Punched looks
                </p>
              </div>

              <button
                onClick={() => setShowThemePicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-light)]"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="px-4 pb-8">
              <div className="overflow-hidden rounded-2xl border border-[var(--border-light)]">
                {THEMES.map(
                  ({ value, label, primary, accent }, index) => {
                    const isActive = theme === value;

                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setTheme(value);
                          setShowThemePicker(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                          index !== THEMES.length - 1
                            ? "border-b border-[var(--border-light)]"
                            : ""
                        } ${
                          isActive
                            ? "bg-brand-surface"
                            : "hover:bg-[var(--border-light)]"
                        }`}
                      >
                        <div className="flex shrink-0 -space-x-2">
                          <span
                            className="h-8 w-8 rounded-full border-2 border-[var(--surface)] shadow-sm"
                            style={{ background: primary }}
                          />

                          <span
                            className="h-8 w-8 rounded-full border-2 border-[var(--surface)] shadow-sm"
                            style={{ background: accent }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              isActive
                                ? "text-brand-text"
                                : "text-[var(--text-primary)]"
                            }`}
                          >
                            {label}
                          </p>

                          <p className="text-xs capitalize text-[var(--text-tertiary)]">
                            {value}
                          </p>
                        </div>

                        {isActive && (
                          <Check className="h-5 w-5 shrink-0 text-brand" />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-xs font-semibold text-[var(--text-tertiary)]">
        {title}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)]">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--border-light)] active:bg-[var(--border-light)]"
    >
      <SettingsIcon>
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
      </SettingsIcon>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </p>

        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
          {sub}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
    </Link>
  );
}

function SettingsIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--border-light)]">
      {children}
    </div>
  );
}