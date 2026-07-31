import { notFound, redirect } from "next/navigation";
import { MemberMvpReservationManager } from "@/components/member/member-mvp-reservation-manager";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  getBookingReservationDetail,
} from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function MemberReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getBookingReservationDetail(id, session.email);
  if (!detail) notFound();

  return (
    <MemberMvpReservationManager
      added={sp.added === "1"}
      reservation={{
        kind: "booking",
        id: detail.id,
        title: detail.title,
        date: detail.date,
        timeLabel: detail.timeLabel,
        locationLine1: detail.locationLine1,
        locationLine2: detail.locationLine2,
        role: detail.role,
        canCancel: detail.canCancel,
        canLeave: detail.canLeave,
        canInviteMore: detail.canInviteMore,
        canAcceptInvite: detail.canAcceptInvite,
        inviteId: detail.inviteId,
        yourInviteStatus: detail.yourInviteStatus,
        hostName: detail.hostName,
        guests: detail.guests,
        chatHref: detail.chatHref,
        inviteCapacity: detail.inviteCapacity,
      }}
    />
  );
}
