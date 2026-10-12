import { notFound, redirect } from "next/navigation";
import { MemberMvpReservationManager } from "@/components/member/member-mvp-reservation-manager";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  getEventReservationDetail,
} from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function MemberEventDetailPage({
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
  const detail = await getEventReservationDetail(
    id,
    session.email,
    session.name,
  );
  if (!detail) notFound();

  return (
    <MemberMvpReservationManager
      added={sp.added === "1"}
      reservation={{
        kind: "event",
        id: detail.id,
        title: detail.title,
        date: detail.date,
        timeLabel: detail.timeLabel,
        locationLine1: detail.locationLine1,
        locationLine2: detail.locationLine2,
        description: detail.description,
        role: detail.role,
        canCancel: detail.canCancel,
        canLeave: detail.canLeave,
        canInviteMore: detail.canInviteMore,
        canRsvp: detail.canRsvp,
        userRsvped: detail.userRsvped,
        yourInviteStatus: detail.yourInviteStatus,
        hostName: detail.hostName,
        guests: detail.guests,
        chatHref: detail.chatHref,
        inviteCapacity: detail.capacity,
        requirePayment: detail.requirePayment,
        feeCents: detail.feeCents,
      }}
    />
  );
}
