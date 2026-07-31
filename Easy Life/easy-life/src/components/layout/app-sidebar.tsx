"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { managingClubNavItems } from "@/lib/navigation";
import { Logo } from "@/components/ui/logo";
import { NavIcon } from "@/components/ui/nav-icon";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n";
import { GlobalSearch } from "@/components/search/global-search";
import {
  CommunitySelector,
  type CommunityOption,
} from "@/components/layout/community-selector";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { logoForCommunity } from "@/lib/brand-assets";

/** Routes that only super / platform admins should see. */
const PLATFORM_ONLY = new Set([
  "/communities",
  "/services-activities",
  "/subscriptions",
]);

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
  isClubAdmin?: boolean;
  communities?: CommunityOption[];
  activeCommunityId?: string | null;
  clubCommunityId?: string | null;
  onCommunityChange?: (communityId: string) => void;
  userName?: string;
}

export function AppSidebar({
  open,
  onClose,
  isSuperAdmin = false,
  isClubAdmin = false,
  communities = [],
  activeCommunityId = null,
  clubCommunityId = null,
  onCommunityChange,
  userName = "Admin",
}: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const effectiveCommunityId =
    activeCommunityId ?? clubCommunityId ?? communities[0]?.id ?? null;

  const activeCommunity = useMemo(() => {
    if (!effectiveCommunityId) return null;
    return (
      communities.find((c) => c.id === effectiveCommunityId) ?? {
        id: effectiveCommunityId,
        name: "Community",
        logoUrl: logoForCommunity(effectiveCommunityId),
      }
    );
  }, [communities, effectiveCommunityId]);

  /** Club-scoped admin: run day-to-day for one club — not Board meetings or platform setup. */
  const clubAdminNav =
    isClubAdmin && clubCommunityId
      ? [
          {
            label: "Bookings",
            href: `/communities/${clubCommunityId}/bookings`,
            icon: "CalendarDays" as const,
          },
          { label: "Messages", href: "/help-desk", icon: "Mail" as const },
          {
            label: "Residents & Services",
            href: `/communities/${clubCommunityId}`,
            icon: "Building2" as const,
          },
          { label: "Invites", href: "/invites", icon: "Mail" as const },
          { label: "Users", href: "/users", icon: "Users" as const },
          { label: "Account", href: "/account", icon: "UserCircle" as const },
        ]
      : null;

  const navItems = clubAdminNav
    ? clubAdminNav
    : isSuperAdmin
      ? managingClubNavItems
      : managingClubNavItems.filter((item) => {
          if (isClubAdmin && PLATFORM_ONLY.has(item.href)) return false;
          return true;
        });

  const homeHref = clubAdminNav?.[0]?.href ?? "/dashboard";

  const workspaceLabel = clubAdminNav
    ? "Club admin"
    : isSuperAdmin
      ? "Managing Club"
      : "Workspace";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-2 bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pb-2 pt-5">
          <UserAvatarMenu
            name={userName}
            align="left"
            homeHref={homeHref}
            trigger={
              <Logo
                size="md"
                productName={
                  activeCommunity?.appDisplayName ??
                  activeCommunity?.name ??
                  "Easy Life"
                }
                communityLogoSrc={
                  activeCommunity?.logoUrl ||
                  (isClubAdmin && clubCommunityId
                    ? logoForCommunity(clubCommunityId)
                    : null)
                }
                communityName={activeCommunity?.name}
                showCommunityName={false}
              />
            }
          />
          <button
            type="button"
            className="rounded-lg p-1.5 text-grey hover:bg-white/60 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {isSuperAdmin ? (
            <CommunitySelector
              communities={communities}
              activeCommunityId={effectiveCommunityId}
              onCommunityChange={onCommunityChange}
            />
          ) : null}
          {!clubAdminNav ? (
            <div className="mb-4 mt-1 px-1">
              <GlobalSearch className="w-full" />
            </div>
          ) : null}
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              let isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              if (clubAdminNav && clubCommunityId) {
                if (item.href.endsWith("/bookings")) {
                  isActive = pathname.includes("/bookings");
                } else if (item.href === `/communities/${clubCommunityId}`) {
                  isActive =
                    pathname === `/communities/${clubCommunityId}` ||
                    (pathname.startsWith(`/communities/${clubCommunityId}/`) &&
                      !pathname.includes("/bookings"));
                }
              }
              if (item.href === "/services-activities") {
                isActive =
                  pathname === "/services-activities" ||
                  pathname.startsWith("/services-activities/");
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--mvp-blue)] text-white shadow-sm"
                        : "text-ink hover:bg-white/70",
                    )}
                  >
                    <NavIcon name={item.icon} active={isActive} />
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-2 p-4">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
            {t(workspaceLabel)}
          </p>
          <LanguageSwitcher />
        </div>
      </aside>
    </>
  );
}
