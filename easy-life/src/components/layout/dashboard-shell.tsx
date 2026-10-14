"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { PlazaPhoneChrome } from "@/components/layout/plaza-phone-chrome";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { CommunityOption } from "@/components/layout/community-selector";
import { logoForCommunity } from "@/lib/brand-assets";

interface DashboardShellProps {
  children: React.ReactNode;
  isSuperAdmin?: boolean;
  isClubAdmin?: boolean;
  communities?: CommunityOption[];
  activeCommunityId?: string | null;
  clubCommunityId?: string | null;
  userName?: string;
}

export function DashboardShell({
  children,
  isSuperAdmin = false,
  isClubAdmin = false,
  communities = [],
  activeCommunityId = null,
  clubCommunityId = null,
  userName = "Admin",
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(
    null,
  );

  if (pendingCommunityId && pendingCommunityId === activeCommunityId) {
    setPendingCommunityId(null);
  }

  const effectiveCommunityId =
    pendingCommunityId ??
    activeCommunityId ??
    clubCommunityId ??
    communities[0]?.id ??
    null;

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

  const homeHref =
    isClubAdmin && clubCommunityId
      ? `/communities/${clubCommunityId}/bookings`
      : "/dashboard";

  return (
    <div className="flex min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSuperAdmin={isSuperAdmin}
        isClubAdmin={isClubAdmin}
        communities={communities}
        activeCommunityId={effectiveCommunityId}
        clubCommunityId={clubCommunityId}
        onCommunityChange={setPendingCommunityId}
        userName={userName}
      />
      <PlazaPhoneChrome
        productName={
          isClubAdmin
            ? activeCommunity?.appDisplayName ?? activeCommunity?.name ?? "Easy Life"
            : "Easy Life"
        }
        logoUrl={activeCommunity?.logoUrl}
        communityName={activeCommunity?.name}
        accountName={userName}
        homeHref={homeHref}
        title={
          pathname.includes("/users")
            ? "Profiles"
            : pathname.includes("/help-desk")
              ? "Messages"
              : pathname.includes("/bookings")
                ? "Bookings"
                : "Home"
        }
        icon={
          pathname.includes("/users")
            ? "people"
            : pathname.includes("/help-desk")
              ? "messages"
              : pathname.includes("/bookings")
                ? "reserve"
                : "home"
        }
        onOpenMenu={() => setSidebarOpen(true)}
        tabs={
          isClubAdmin && clubCommunityId
            ? [
                {
                  href: `/communities/${clubCommunityId}/bookings`,
                  label: "Home",
                  icon: "reserve",
                  exact: true,
                },
                { href: "/users", label: "Profiles", icon: "people" },
                { href: "/help-desk", label: "Messages", icon: "messages" },
              ]
            : [
                { href: "/dashboard", label: "Home", icon: "home", exact: true },
                { href: "/users", label: "Profiles", icon: "people" },
                { href: "/help-desk", label: "Messages", icon: "messages" },
              ]
        }
      >
        {children}
      </PlazaPhoneChrome>
    </div>
  );
}
