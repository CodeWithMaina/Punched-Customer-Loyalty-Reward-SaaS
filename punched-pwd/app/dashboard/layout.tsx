"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { businessesApi } from "@/lib/api/businesses";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import type { StaffBusinessResponse } from "@/types";
import {
  Loader2,
  LogOut,
  CreditCard,
  Home,
  Compass,
  Award,
  LayoutDashboard,
  Users,
  UserCheck,
  User,
  BarChart2,
  ScanLine,
  Shield,
  TrendingUp,
  Store,
  Zap,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { logout } = useAuth();
  const [headerLabel, setHeaderLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch business name for Business and Staff roles
  useEffect(() => {
    if (!user) return;
    if (user.role === "Admin") {
      setHeaderLabel("Punched Admin");
    } else if (user.role === "Business") {
      businessesApi.getMine().then((res) => {
        if (res.success && res.data) setHeaderLabel(res.data.name);
      });
    } else if (user.role === "Staff") {
      businessesApi.getStaffBusiness().then((res) => {
        if (res.success && res.data) setHeaderLabel((res.data as StaffBusinessResponse).businessName);
      });
    }
  }, [user]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
        </div>
      </div>
    );
  }

  const customerNav = [
    { href: "/dashboard", label: "Home", icon: Home, exact: true },
    { href: "/dashboard/explore", label: "Explore", icon: Compass, exact: false },
    { href: "/dashboard/cards", label: "Rewards", icon: Award, exact: false },
    { href: "/dashboard/profile", label: "Profile", icon: User, exact: false },
  ];

  const businessNav = [
    { href: "/dashboard/business", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/business/customers", label: "Customers", icon: Users, exact: false },
    { href: "/dashboard/business/staff", label: "Staff", icon: UserCheck, exact: false },
    { href: "/dashboard/business/profile", label: "Settings", icon: User, exact: false },
  ];

  // Staff side-nav (scan link visible in sidebar on md+)
  const staffSideNav = [
    { href: "/dashboard/staff/activity", label: "Activity", icon: BarChart2, exact: false },
    { href: "/dashboard/staff/scan", label: "Scan", icon: ScanLine, exact: false },
    { href: "/dashboard/profile", label: "Profile", icon: User, exact: false },
  ];

  // Staff bottom-nav tabs (scan is a floating center button, not a tab)
  const staffBottomNav = [
    { href: "/dashboard/staff/activity", label: "Activity", icon: BarChart2, exact: false },
    { href: "/dashboard/profile", label: "Profile", icon: User, exact: false },
  ];

  const adminNav = [
    { href: "/dashboard/admin", label: "Overview", icon: Shield, exact: true },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: TrendingUp, exact: false },
    { href: "/dashboard/admin/businesses", label: "Businesses", icon: Store, exact: false },
    { href: "/dashboard/admin/users", label: "Users", icon: Users, exact: false },
    { href: "/dashboard/admin/insights", label: "Insights", icon: Zap, exact: false },
    { href: "/dashboard/admin/profile", label: "Profile", icon: User, exact: false },
  ];

  const isStaff = user?.role === "Staff";
  const isBusiness = user?.role === "Business";
  const isAdmin = user?.role === "Admin";

  const sideNavItems =
    isAdmin ? adminNav :
    isBusiness ? businessNav :
    isStaff ? staffSideNav :
    customerNav;

  const bottomNavItems =
    isAdmin ? adminNav :
    isBusiness ? businessNav :
    isStaff ? staffBottomNav :
    customerNav;

  const fallbackLabel =
    isAdmin ? "Admin" :
    isBusiness ? "Business" :
    isStaff ? "Staff" :
    "Punched";

  const displayLabel = (isAdmin || isBusiness || isStaff)
    ? (headerLabel ?? fallbackLabel)
    : "Punched";

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* ── Side navigation (md+) ───────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-[var(--surface)] border-r border-[var(--border-light)] z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--border-light)]">
          <div className="h-9 w-9 bg-brand rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate">
            {displayLabel}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sideNavItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? "bg-brand-surface text-brand shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[var(--border-light)]">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-tertiary)] hover:text-danger hover:bg-danger-light transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area (right of sidebar on md+) ─────────────── */}
      <div className="flex flex-col flex-1 md:ml-60 min-h-screen">
        {/* Top header (mobile only) */}
        <header className="md:hidden bg-[var(--surface)] border-b border-[var(--border-light)] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-brand rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[180px]">
              {displayLabel}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-danger transition-colors px-2 py-1.5 rounded-xl hover:bg-danger-light"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* PWA install prompt */}
        <PWAInstallPrompt />

        {/* ── Bottom navigation (mobile only) ─────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border-light)] z-10 safe-area-bottom">
          {isStaff && !isAdmin ? (
            <div className="relative flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
              {staffBottomNav.map(({ href, label, icon: Icon, exact }, index) => {
                const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                return (
                  <div key={href} className={`flex flex-col items-center gap-0.5 ${index === 1 ? "ml-14" : ""}`}>
                    <Link
                      href={href}
                      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all min-w-[60px] ${
                        isActive ? "text-brand" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-brand-surface" : ""}`}>
                        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                      </div>
                      <span className={`text-[10px] font-semibold leading-tight ${isActive ? "text-brand" : "text-[var(--text-tertiary)]"}`}>
                        {label}
                      </span>
                    </Link>
                  </div>
                );
              })}

              {/* Floating Scan Button */}
              <Link
                href="/dashboard/staff/scan"
                aria-label="Scan QR code"
                className="absolute left-1/2 -translate-x-1/2 -top-5 h-14 w-14 bg-brand hover:bg-brand-hover text-white rounded-full flex items-center justify-center shadow-elevated active:scale-95 transition-all ring-4 ring-[var(--surface)]"
              >
                <ScanLine className="h-6 w-6" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
              {bottomNavItems.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all min-w-[60px] ${
                      isActive ? "text-brand" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-brand-surface" : ""}`}>
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span className={`text-[10px] font-semibold leading-tight ${isActive ? "text-brand" : "text-[var(--text-tertiary)]"}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
