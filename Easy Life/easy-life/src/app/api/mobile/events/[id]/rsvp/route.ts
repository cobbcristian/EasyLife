import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { logEvent, toggleEventRsvp } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let paid = false;
  let acceptInvite = false;
  let decline = false;
  try {
    const body = await request.json();
    paid = Boolean(body?.paid);
    acceptInvite = Boolean(body?.acceptInvite);
    decline = Boolean(body?.decline);
  } catch {
    // optional
  }

  const event = await prisma.communityEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (decline) {
    await prisma.eventInvite.updateMany({
      where: {
        eventId: id,
        memberEmail: session.email.trim().toLowerCase(),
      },
      data: { status: "declined" },
    });
    const existing = await prisma.eventRsvp.findUnique({
      where: {
        eventId_memberEmail: {
          eventId: id,
          memberEmail: session.email.trim().toLowerCase(),
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
        memberEmail: session.email.trim().toLowerCase(),
      },
    },
  });

  if (!existing && event.requirePayment && event.feeCents > 0 && !paid) {
    return NextResponse.json({
      ok: false,
      needsPayment: true,
      amount: event.feeCents / 100,
      description: `Event fee: ${event.title}`,
      eventId: event.id,
    });
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
        memberEmail: session.email.trim().toLowerCase(),
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
