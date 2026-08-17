import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { logEvent, toggleEventRsvp } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import {
  clinicFeeCents,
  isClinicCategory,
  isClubMemberEmail,
} from "@/lib/server/clinics";
import {
  ensureMemberEventFeeCharge,
  memberHasPaidEventFee,
} from "@/lib/server/event-rsvp-payment";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let acceptInvite = false;
  let decline = false;
  try {
    const body = await request.json();
    // Ignore body.paid — payment must be proven via a settled MemberCharge.
    acceptInvite = Boolean(body?.acceptInvite);
    decline = Boolean(body?.decline);
  } catch {
    // optional
  }

  const event = await prisma.communityEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const email = session.email.trim().toLowerCase();

  if (decline) {
    await prisma.eventInvite.updateMany({
      where: {
        eventId: id,
        memberEmail: email,
      },
      data: { status: "declined" },
    });
    const existing = await prisma.eventRsvp.findUnique({
      where: {
        eventId_memberEmail: {
          eventId: id,
          memberEmail: email,
        },
      },
    });
    if (existing) {
      await prisma.eventRsvp.delete({ where: { id: existing.id } });
    }
    await logEvent({
      communityId: session.communityId,
      userName: session.name,
      action: "Event invite declined",
      detail: id,
    });
    return NextResponse.json({ ok: true, rsvped: false, declined: true });
  }

  const existing = await prisma.eventRsvp.findUnique({
    where: {
      eventId_memberEmail: {
        eventId: id,
        memberEmail: email,
      },
    },
  });

  if (!existing && event.requirePayment && event.feeCents > 0) {
    const isMember = await isClubMemberEmail(email, event.communityId);
    const clinic = isClinicCategory(event.category);
    const feeCents = clinicFeeCents({
      memberFeeCents: event.feeCents,
      isMember: clinic ? isMember : true,
    });
    const amountDollars = feeCents / 100;
    const alreadyPaid = await memberHasPaidEventFee({
      eventId: event.id,
      memberEmail: email,
      minAmountDollars: amountDollars,
    });
    if (!alreadyPaid) {
      const description = `Event fee: ${event.title}`;
      const charge = await ensureMemberEventFeeCharge({
        communityId: event.communityId,
        eventId: event.id,
        eventTitle: event.title,
        memberName: session.name,
        memberEmail: email,
        amountDollars,
        description,
      });
      return NextResponse.json({
        ok: false,
        needsPayment: true,
        amount: amountDollars,
        description,
        eventId: event.id,
        chargeId: charge.id,
      });
    }
  }

  const result = await toggleEventRsvp({
    eventId: id,
    memberEmail: session.email,
    memberName: session.name,
  });

  if (result.rsvped || acceptInvite) {
    await prisma.eventInvite.updateMany({
      where: {
        eventId: id,
        memberEmail: email,
      },
      data: { status: result.rsvped ? "accepted" : "declined" },
    });
  }

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: result.rsvped ? "Event RSVP" : "Event RSVP cancelled",
    detail: id,
  });

  return NextResponse.json({ ok: true, ...result });
}
