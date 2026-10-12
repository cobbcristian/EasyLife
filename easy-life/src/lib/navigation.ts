import type { NavItem } from "@/lib/types";

/**
 * Managing Club (platform admin) — run Easy Life across clubs.
 * Keep this focused: communities, providers, subscriptions.
 * Board/PM club-meeting & ops live in separate `/board` and `/pm` portals.
 */
export const managingClubNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Super Admin", href: "/super-admin", icon: "Shield" },
  { label: "Communities", href: "/communities", icon: "Building2" },
  { label: "Users", href: "/users", icon: "Users" },
  { label: "Invites", href: "/invites", icon: "Mail" },
  { label: "Providers", href: "/services-activities", icon: "ListChecks" },
  { label: "Messages", href: "/help-desk", icon: "MessageSquare" },
  { label: "Subscriptions", href: "/subscriptions", icon: "CreditCard" },
  { label: "Account", href: "/account", icon: "UserCircle" },
];

/** @deprecated Use managingClubNavItems — kept for any imports expecting this name. */
export const mainNavItems: NavItem[] = managingClubNavItems;

export const adminNavItems: NavItem[] = [];

export const communityName = "Super Admin";
export const appName = "Easy Life";
