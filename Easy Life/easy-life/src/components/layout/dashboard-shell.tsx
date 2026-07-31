"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
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
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
          communityLogoSrc={activeCommunity?.logoUrl}
          communityName={activeCommunity?.name}
          productName={
            isClubAdmin
              ? activeCommunity?.appDisplayName ?? activeCommunity?.name
              : "Easy Life"
          }
          homeHref={homeHref}
        />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
