import { redirect } from "next/navigation";
import { getDashboardAnalytics } from "@/lib/server/analytics";
import { getSession } from "@/lib/server/auth";
import {
  isClubAdmin,
  isSuperAdmin,
  resolveScopedCommunityId,
} from "@/lib/server/community-context";
import { getCommunityById } from "@/lib/server/db";
import { getPlatformOverview } from "@/lib/server/platform-analytics";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (session && isClubAdmin(session) && session.communityId) {
    redirect(`/communities/${session.communityId}/bookings`);
  }

  const scopeId = session ? await resolveScopedCommunityId(session) : null;
  const clubAdmin = session ? isClubAdmin(session) : false;
  const superAdmin = session ? isSuperAdmin(session) : false;
  const scopedCommunity = scopeId ? await getCommunityById(scopeId) : null;

  const [{ engagement, avgEngagement, tabUsage }, platform] = await Promise.all([
    getDashboardAnalytics(scopeId),
    superAdmin ? getPlatformOverview() : Promise.resolve(null),
  ]);

  return (
    <DashboardClient
      clubAdmin={clubAdmin}
      superAdmin={superAdmin}
      scopedCommunityName={scopedCommunity?.name ?? null}
      engagement={engagement}
      avgEngagement={avgEngagement}
      tabUsage={tabUsage}
      platform={platform}
    />
  );
}
