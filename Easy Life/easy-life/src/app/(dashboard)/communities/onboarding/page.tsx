import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import {
  getActiveCommunityId,
  isClubAdmin,
  isSuperAdmin,
} from "@/lib/server/community-context";
import { getCommunityById, listCommunities } from "@/lib/server/db";
import { ClubOnboardingClient } from "@/components/onboarding/club-onboarding-client";

export const dynamic = "force-dynamic";

export default async function ClubOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ communityId?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const superAdmin = isSuperAdmin(session);
  const clubAdmin = isClubAdmin(session);
  const params = await searchParams;

  const communities = superAdmin
    ? (await listCommunities()).map((c) => ({ id: c.id, name: c.name }))
    : clubAdmin && session.communityId
      ? [
          {
            id: session.communityId,
            name: (await getCommunityById(session.communityId))?.name ?? "Community",
          },
        ]
      : [];

  const activeCommunityId =
    params.communityId ?? (await getActiveCommunityId(session)) ?? communities[0]?.id;

  return (
    <ClubOnboardingClient
      communities={communities}
      initialCommunityId={activeCommunityId}
      isSuperAdmin={superAdmin}
    />
  );
}
