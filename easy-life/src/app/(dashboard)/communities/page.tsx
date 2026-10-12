import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { isClubAdmin, isSuperAdmin } from "@/lib/server/community-context";
import { listCommunities } from "@/lib/server/db";
import { CommunitiesClient } from "./communities-client";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await getSession();
  if (session && isClubAdmin(session) && session.communityId) {
    redirect(`/communities/${session.communityId}`);
  }

  const communities = await listCommunities();
  const superAdmin = session ? isSuperAdmin(session) : false;

  return (
    <CommunitiesClient
      communities={communities.map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        coverColor: c.coverColor,
        logoUrl: c.logoUrl,
        residentCount: c.residentCount,
        serviceCount: c.serviceCount,
        activityCount: c.activityCount,
        adminName: c.management[0]?.name,
      }))}
      superAdmin={superAdmin}
    />
  );
}
