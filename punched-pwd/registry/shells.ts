import {
  Home,
  Compass,
  LayoutDashboard,
  BarChart2,
  Shield,
  TrendingUp,
  Store,
  Users,
  Zap,
  User,
  CalendarDays,
} from "lucide-react";
import type { NavItem, ShellProfile, ShellScope } from "./types";

// ═══════════════════════════════════════════════════════════════
//  Role → shell profiles. moduleOrder controls generated nav ordering;
//  coreRoutes are always present and never entitlement-gated.
//  Business moduleOrder starts with analytics so the generated nav
//  matches the legacy businessNav exactly
//  (Overview, Analytics, Customers, Staff, Appointments, Settings).
// ═══════════════════════════════════════════════════════════════

export const shellProfiles: Record<ShellScope, ShellProfile> = {
  Customer: {
    scope: "Customer",
    moduleOrder: [
      "appointments",
      "stamps",
      "loyalty",
      "rewards",
      "referral",
      "settings",
    ],
    coreRoutes: [
      { label: "Home", href: "/dashboard", icon: Home, scope: "Customer", exact: true },
      { label: "Explore", href: "/dashboard/explore", icon: Compass, scope: "Customer", exact: false },
    ],
  },
  Business: {
    scope: "Business",
    moduleOrder: [
      "analytics",
      "customers",
      "staff",
      "appointments",
      "stamps",
      "loyalty",
      "programs",
      "notifications",
      "referral",
      "serviceCatalog",
      "settings",
    ],
    coreRoutes: [
      { label: "Overview", href: "/dashboard/business", icon: LayoutDashboard, scope: "Business", exact: true },
    ],
  },
  Staff: {
    scope: "Staff",
    moduleOrder: ["appointments", "stamps", "customers", "settings"],
    coreRoutes: [
      { label: "Activity", href: "/dashboard/staff/activity", icon: BarChart2, scope: "Staff", exact: false },
    ],
    // Floating bottom-bar flanks (Activity + Appointments) mirror the legacy
    // staffBottomNav[0] / [1]; the center Scan action stays a hardcoded FAB.
    floatingActions: [
      { label: "Activity", href: "/dashboard/staff/activity", icon: BarChart2, scope: "Staff", exact: false },
      { label: "Appointments", href: "/dashboard/staff/appointments", icon: CalendarDays, scope: "Staff", exact: false },
    ],
  },
  Admin: {
    // Admin is not entitlement-gated — static nav.
    scope: "Admin",
    moduleOrder: [],
    coreRoutes: [
      { label: "Overview", href: "/dashboard/admin", icon: Shield, scope: "Admin", exact: true },
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: TrendingUp, scope: "Admin", exact: false },
      { label: "Businesses", href: "/dashboard/admin/businesses", icon: Store, scope: "Admin", exact: false },
      { label: "Users", href: "/dashboard/admin/users", icon: Users, scope: "Admin", exact: false },
      { label: "Insights", href: "/dashboard/admin/insights", icon: Zap, scope: "Admin", exact: false },
      { label: "Profile", href: "/dashboard/admin/profile", icon: User, scope: "Admin", exact: false },
    ] as NavItem[],
  },
};