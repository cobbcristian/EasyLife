import { notFound } from "next/navigation";
import { CommunityAdminBookings } from "@/components/admin/community-admin-bookings";
import { getCommunityBookings } from "@/lib/communities-data";
import { getSession } from "@/lib/server/auth";
import { getCommunityById } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function CommunityBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const community = await getCommunityById(id);
  if (!community) notFound();

  const session = await getSession();
  const bookings = getCommunityBookings(id);

  return (
    <CommunityAdminBookings
      communityName={community.name}
      communityId={id}
      bookings={bookings}
      avatarName={session?.name}
    />
  );
}
