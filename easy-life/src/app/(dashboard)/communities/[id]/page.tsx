import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity, isClubAdmin } from "@/lib/server/community-context";
import { getCommunityById } from "@/lib/server/db";
import { CommunityDetail } from "./community-detail";

export const dynamic = "force-dynamic";

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (session?.role === "admin" && session.communityId && !canManageCommunity(session, id)) {
    redirect(`/communities/${session.communityId}`);
  }

  const community = await getCommunityById(id);
  if (!community) {
    notFound();
  }

  return (
    <CommunityDetail
      community={community}
      clubAdmin={session ? isClubAdmin(session) : false}
    />
  );
}
