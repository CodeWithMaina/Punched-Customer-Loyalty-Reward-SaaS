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
  Bell,
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
  CalendarDays,

} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { logout } = useAuth();

  const [headerLabel, setHeaderLabel] = useState<string | null>(null);

  /* ═══════════════════════════════════════════════════════════════
     AUTHENTICATION
     ═══════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  /* ═══════════════════════════════════════════════════════════════
     BUSINESS / STAFF HEADER LABEL
     ═══════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!user) return;

    if (user.role === "Admin") {
      setHeaderLabel("Punched Admin");
      return;
    }

    if (user.role === "Business") {
      businessesApi.getMine().then((res) => {
        if (res.success && res.data) {
          setHeaderLabel(res.data.name);
        }
      });

      return;
    }

    if (user.role === "Staff") {
      businessesApi.getStaffBusiness().then((res) => {
        if (res.success && res.data) {
          setHeaderLabel((res.data as StaffBusinessResponse).businessName);
        }
      });
    }
  }, [user]);

  /* ═══════════════════════════════════════════════════════════════
     LOADING / AUTHENTICATION GUARD
     ═══════════════════════════════════════════════════════════════ */

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

  /* ═══════════════════════════════════════════════════════════════
     CUSTOMER NAVIGATION
     ═══════════════════════════════════════════════════════════════ */

  const customerNav = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
      exact: true,
    },
    {
      href: "/dashboard/explore",
      label: "Explore",
      icon: Compass,
      exact: false,
    },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: CalendarDays,
      exact: false,
    },

    {
      href: "/dashboard/cards",
      label: "Rewards",
      icon: Award,
      exact: false,
    },
    {
      href: "/dashboard/profile",
      label: "Profile",
      icon: User,
      exact: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     BUSINESS NAVIGATION
     ═══════════════════════════════════════════════════════════════ */

  const businessNav = [
    {
      href: "/dashboard/business",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/dashboard/business/analytics",
      label: "Analytics",
      icon: TrendingUp,
      exact: false,
    },
    {
      href: "/dashboard/business/customers",
      label: "Customers",
      icon: Users,
      exact: false,
    },
    {
      href: "/dashboard/business/staff",
      label: "Staff",
      icon: UserCheck,
      exact: false,
    },
    {
      href: "/dashboard/business/appointments",
      label: "Appointments",
      icon: CalendarDays,
      exact: false,
    },

    {
      href: "/dashboard/business/profile",
      label: "Settings",
      icon: User,
      exact: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     STAFF DESKTOP NAVIGATION
     ═══════════════════════════════════════════════════════════════ */

  const staffSideNav = [
    {
      href: "/dashboard/staff/activity",
      label: "Activity",
      icon: BarChart2,
      exact: false,
    },
    {
      href: "/dashboard/staff/appointments",
      label: "Appointments",
      icon: CalendarDays,
      exact: false,
    },

    {
      href: "/dashboard/staff/scan",
      label: "Scan",
      icon: ScanLine,
      exact: false,
    },
    {
      href: "/dashboard/profile",
      label: "Profile",
      icon: User,
      exact: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     STAFF MOBILE NAVIGATION
     
     Scan is deliberately kept as a floating center action.
     ═══════════════════════════════════════════════════════════════ */

  const staffBottomNav = [
    {
      href: "/dashboard/staff/activity",
      label: "Activity",
      icon: BarChart2,
      exact: false,
    },
    {
      href: "/dashboard/staff/appointments",
      label: "Appointments",
      icon: CalendarDays,
      exact: false,
    },

    {
      href: "/dashboard/profile",
      label: "Profile",
      icon: User,
      exact: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     ADMIN NAVIGATION
     ═══════════════════════════════════════════════════════════════ */

  const adminNav = [
    {
      href: "/dashboard/admin",
      label: "Overview",
      icon: Shield,
      exact: true,
    },
    {
      href: "/dashboard/admin/analytics",
      label: "Analytics",
      icon: TrendingUp,
      exact: false,
    },
    {
      href: "/dashboard/admin/businesses",
      label: "Businesses",
      icon: Store,
      exact: false,
    },
    {
      href: "/dashboard/admin/users",
      label: "Users",
      icon: Users,
      exact: false,
    },
    {
      href: "/dashboard/admin/insights",
      label: "Insights",
      icon: Zap,
      exact: false,
    },
    {
      href: "/dashboard/admin/profile",
      label: "Profile",
      icon: User,
      exact: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     ROLE DETECTION
     ═══════════════════════════════════════════════════════════════ */

  const isStaff = user?.role === "Staff";
  const isBusiness = user?.role === "Business";
  const isAdmin = user?.role === "Admin";

  const sideNavItems = isAdmin
    ? adminNav
    : isBusiness
      ? businessNav
      : isStaff
        ? staffSideNav
        : customerNav;

  const bottomNavItems = isAdmin
    ? adminNav
    : isBusiness
      ? businessNav
      : isStaff
        ? staffBottomNav
        : customerNav;

  const fallbackLabel = isAdmin
    ? "Admin"
    : isBusiness
      ? "Business"
      : isStaff
        ? "Staff"
        : "Punched";

  const displayLabel =
    isAdmin || isBusiness || isStaff
      ? (headerLabel ?? fallbackLabel)
      : "Punched";

  /* ═══════════════════════════════════════════════════════════════
     NAVIGATION HELPERS
     ═══════════════════════════════════════════════════════════════ */

  const isNavItemActive = (href: string, exact: boolean) => {
    return exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  };

  /* ═══════════════════════════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* ═════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
          ═════════════════════════════════════════════════════════ */}

      <aside
        className="
          hidden
          md:flex
          md:flex-col
          md:fixed
          md:inset-y-0
          md:left-0
          md:w-60
          bg-[var(--surface)]
          border-r
          border-[var(--border-light)]
          z-20
        "
      >
        {/* Brand */}
        <div
          className="
            flex
            items-center
            gap-2.5
            px-5
            py-5
            border-b
            border-[var(--border-light)]
          "
        >
          <div
            className="
              h-9
              w-9
              bg-brand
              rounded-xl
              flex
              items-center
              justify-center
              flex-shrink-0
              shadow-sm
            "
          >
            <CreditCard className="h-5 w-5 text-white" aria-hidden="true" />
          </div>

          <span
            className="
              text-base
              font-bold
              text-[var(--text-primary)]
              tracking-tight
              truncate
            "
          >
            {displayLabel}
          </span>
        </div>

        {/* Desktop navigation */}
        <nav
          aria-label="Main navigation"
          className="
            flex-1
            px-3
            py-4
            space-y-1
            overflow-y-auto
          "
        >
          {sideNavItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = isNavItemActive(href, exact);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`
                    flex
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-xl
                    transition-all
                    font-medium
                    text-sm

                    ${
                      isActive
                        ? "bg-brand-surface text-brand shadow-sm"
                        : "text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text-primary)]"
                    }
                  `}
              >
                <Icon
                  className="h-5 w-5 flex-shrink-0"
                  strokeWidth={isActive ? 2.5 : 1.8}
                  aria-hidden="true"
                />

                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Account actions */}
        <div
          className="
            space-y-1
            px-3
            py-4
            border-t
            border-[var(--border-light)]
          "
        >
          <Link
            href="/dashboard/notifications"
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-2.5
              text-sm
              font-medium
              text-[var(--text-tertiary)]
              transition-colors
              hover:bg-brand-surface
              hover:text-brand
            "
          >
            <Bell className="h-5 w-5 flex-shrink-0" aria-hidden="true" />

            <span>Notifications</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="
              flex
              items-center
              gap-3
              w-full
              px-3
              py-2.5
              rounded-xl
              text-sm
              font-medium
              text-[var(--text-tertiary)]
              hover:text-danger
              hover:bg-danger-light
              transition-colors
            "
          >
            <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ═════════════════════════════════════════════════════════
          MAIN AREA
          ═════════════════════════════════════════════════════════ */}

      <div
        className="
          flex
          flex-col
          flex-1
          md:ml-60
          min-h-screen
        "
      >
        {/* ═══════════════════════════════════════════════════════
            PAGE CONTENT
            ═══════════════════════════════════════════════════════ */}

        <main
          className="
            flex-1
            pb-[calc(4rem+env(safe-area-inset-bottom,0px))]
            md:pb-0
          "
        >
          {children}
        </main>

        {/* PWA install prompt */}
        <PWAInstallPrompt />

        {
          /* ═══════════════════════════════════════════════════════
            MOBILE BOTTOM NAVIGATION
            ═══════════════════════════════════════════════════════

            Designed for:

            • Latest iPhones
            • iPhone home indicator
            • iOS Safari
            • iOS standalone PWA
            • Android gesture navigation
            • Android 3-button navigation
            • Small Android phones
            • Large Android phones
            • Tablets in mobile breakpoint range

            The navigation itself has a stable 64px content
            height and then adds the device's native bottom
            safe-area inset.
            ═══════════════════════════════════════════════════════ */

          <nav
            aria-label="Mobile navigation"
            className="
            md:hidden
            fixed
            inset-x-0
            bottom-0
            z-50

            border-t
            border-[var(--border-light)]

            bg-[var(--surface)]

            shadow-[0_-4px_20px_rgba(0,0,0,0.04)]

            supports-[backdrop-filter]:backdrop-blur-xl
          "
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {isStaff && !isAdmin ? (
              /* ═══════════════════════════════════════════════════
               STAFF NAVIGATION
               ═══════════════════════════════════════════════════ */

              <div
                className="
                relative
                mx-auto
                flex
                min-h-16
                w-full
                max-w-lg
                items-center
                px-3
              "
              >
                {/* ───────────────────────────────────────────────
                  ACTIVITY
                  ─────────────────────────────────────────────── */}

                {(() => {
                  const item = staffBottomNav[0];

                  const isActive = isNavItemActive(item.href, item.exact);

                  const Icon = item.icon;

                  return (
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                      flex
                      min-h-12
                      flex-1
                      items-center
                      justify-center
                      rounded-xl
                      px-3

                      transition-transform
                      duration-150

                      active:scale-95

                      touch-manipulation

                      ${isActive ? "text-brand" : "text-[var(--text-tertiary)]"}
                    `}
                    >
                      <span
                        className="
                        flex
                        min-h-11
                        min-w-16
                        flex-col
                        items-center
                        justify-center
                        gap-0.5
                      "
                      >
                        <span
                          className={`
                          relative
                          flex
                          h-8
                          w-10
                          items-center
                          justify-center
                          rounded-xl

                          ${isActive ? "bg-brand-surface" : ""}
                        `}
                        >
                          <Icon
                            className="h-[21px] w-[21px]"
                            strokeWidth={isActive ? 2.5 : 1.8}
                            aria-hidden="true"
                          />

                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="
                              absolute
                              -bottom-1
                              h-1
                              w-1
                              rounded-full
                              bg-brand
                            "
                            />
                          )}
                        </span>

                        <span
                          className={`
                          max-w-20
                          truncate
                          text-[10px]
                          leading-4

                          ${
                            isActive
                              ? "font-semibold text-brand"
                              : "font-medium text-[var(--text-tertiary)]"
                          }
                        `}
                        >
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  );
                })()}

                {/* ───────────────────────────────────────────────
                  CENTER SCAN FAB
                  ─────────────────────────────────────────────── */}

                <div
                  className="
                  relative
                  flex
                  w-20
                  shrink-0
                  items-center
                  justify-center
                "
                >
                  <Link
                    href="/dashboard/staff/scan"
                    aria-label="Scan QR code"
                    className="
                    absolute

                    left-1/2
                    top-1/2

                    -translate-x-1/2
                    -translate-y-[calc(50%+18px)]

                    flex
                    h-14
                    w-14

                    items-center
                    justify-center

                    rounded-full

                    bg-brand
                    text-white

                    shadow-[0_6px_18px_var(--brand-ring)]

                    ring-4
                    ring-[var(--surface)]

                    transition-all
                    duration-150

                    hover:bg-brand-hover

                    active:scale-90

                    touch-manipulation
                  "
                  >
                    <ScanLine
                      className="h-6 w-6"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />

                    <span className="sr-only">Scan QR code</span>
                  </Link>

                  {/* Center spacer */}
                  <span aria-hidden="true" className="h-12 w-12" />
                </div>

                {/* ───────────────────────────────────────────────
                  PROFILE
                  ─────────────────────────────────────────────── */}

                {(() => {
                  const item = staffBottomNav[1];

                  const isActive = isNavItemActive(item.href, item.exact);

                  const Icon = item.icon;

                  return (
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                      flex
                      min-h-12
                      flex-1
                      items-center
                      justify-center
                      rounded-xl
                      px-3

                      transition-transform
                      duration-150

                      active:scale-95

                      touch-manipulation

                      ${isActive ? "text-brand" : "text-[var(--text-tertiary)]"}
                    `}
                    >
                      <span
                        className="
                        flex
                        min-h-11
                        min-w-16
                        flex-col
                        items-center
                        justify-center
                        gap-0.5
                      "
                      >
                        <span
                          className={`
                          relative
                          flex
                          h-8
                          w-10
                          items-center
                          justify-center
                          rounded-xl

                          ${isActive ? "bg-brand-surface" : ""}
                        `}
                        >
                          <Icon
                            className="h-[21px] w-[21px]"
                            strokeWidth={isActive ? 2.5 : 1.8}
                            aria-hidden="true"
                          />

                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="
                              absolute
                              -bottom-1
                              h-1
                              w-1
                              rounded-full
                              bg-brand
                            "
                            />
                          )}
                        </span>

                        <span
                          className={`
                          max-w-20
                          truncate
                          text-[10px]
                          leading-4

                          ${
                            isActive
                              ? "font-semibold text-brand"
                              : "font-medium text-[var(--text-tertiary)]"
                          }
                        `}
                        >
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  );
                })()}
              </div>
            ) : (
              /* ═══════════════════════════════════════════════════
               CUSTOMER / BUSINESS / ADMIN NAVIGATION
               ═══════════════════════════════════════════════════ */

              <div
                className="
                mx-auto
                flex
                min-h-16
                w-full
                max-w-lg
                items-stretch
                justify-between
                px-1
                sm:px-2
              "
              >
                {bottomNavItems.map(({ href, label, icon: Icon, exact }) => {
                  const isActive = isNavItemActive(href, exact);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        group

                        flex
                        min-h-16
                        min-w-0
                        flex-1

                        items-center
                        justify-center

                        px-0.5
                        sm:px-1

                        transition-transform
                        duration-150

                        active:scale-95

                        touch-manipulation

                        ${
                          isActive
                            ? "text-brand"
                            : "text-[var(--text-tertiary)]"
                        }
                      `}
                    >
                      <span
                        className="
                          flex
                          min-h-12
                          w-full
                          max-w-[76px]
                          flex-col
                          items-center
                          justify-center
                          gap-0.5
                        "
                      >
                        {/* Icon */}
                        <span
                          className={`
                            relative
                            flex
                            h-8
                            w-10

                            items-center
                            justify-center

                            rounded-xl

                            transition-colors

                            ${
                              isActive
                                ? "bg-brand-surface"
                                : "group-hover:bg-[var(--border-light)]"
                            }
                          `}
                        >
                          <Icon
                            className="
                              h-[21px]
                              w-[21px]
                            "
                            strokeWidth={isActive ? 2.5 : 1.8}
                            aria-hidden="true"
                          />

                          {/* Active indicator */}
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="
                                absolute
                                -bottom-1
                                h-1
                                w-1
                                rounded-full
                                bg-brand
                              "
                            />
                          )}
                        </span>

                        {/* Label */}
                        <span
                          className={`
                            w-full
                            truncate
                            text-center
                            text-[10px]
                            leading-4

                            ${
                              isActive
                                ? "font-semibold text-brand"
                                : "font-medium text-[var(--text-tertiary)]"
                            }
                          `}
                        >
                          {label}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        }
      </div>
    </div>
  );
}
