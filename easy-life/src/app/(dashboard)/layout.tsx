import { getSession } from "@/lib/server/auth";
import {
  isClubAdmin,
  isSuperAdmin,
  resolveScopedCommunityId,
} from "@/lib/server/community-context";
import { getCommunityById, listCommunities } from "@/lib/server/db";
import { logoForCommunity } from "@/lib/brand-assets";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return <DashboardShell>{children}</DashboardShell>;
  }

  const superAdmin = isSuperAdmin(session);
  const clubAdmin = isClubAdmin(session);

  const communities = superAdmin
    ? (await listCommunities()).map((c) => ({
        id: c.id,
        name: c.name,
        logoUrl: logoForCommunity(c.id, c.logoUrl),
        appDisplayName: c.appDisplayName ?? c.name,
      }))
    : clubAdmin && session.communityId
      ? await (async () => {
          const club = await getCommunityById(session.communityId!);
          return [
            {
              id: session.communityId!,
              name: club?.name ?? "Community",
              logoUrl: logoForCommunity(session.communityId!, club?.logoUrl),
              appDisplayName: club?.appDisplayName ?? club?.name ?? "Community",
            },
          ];
        })()
      : [];

  // Always resolve an effective club so logos/metrics match the Managing Club control.
  const activeCommunityId = await resolveScopedCommunityId(session);

  return (
    <DashboardShell
      isSuperAdmin={superAdmin}
      isClubAdmin={clubAdmin}
      communities={communities}
      activeCommunityId={activeCommunityId}
      clubCommunityId={session.communityId}
      userName={session.name}
    >
      {children}
    </DashboardShell>
  );
}
