import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import {
  assertEventHasCapacity,
  ClinicCapacityError,
  clinicFeeCents,
  createClinicGuestInvoice,
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let decline = false;
  let acceptInvite = false;
  try {
    const body = await request.json();
    // Intentionally ignore body.paid — clients previously could RSVP for free by
    // posting `{ paid: true }` with no Stripe / charge settlement.
    decline = Boolean(body?.decline);
    acceptInvite = Boolean(body?.acceptInvite);
  } catch {
    // optional body
  }

  const event = await prisma.communityEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = session.email.trim().toLowerCase();

  if (decline) {
    await prisma.eventRsvp.deleteMany({
      where: { eventId: id, memberEmail: email },
    });
    await prisma.eventInvite.updateMany({
      where: { eventId: id, memberEmail: email },
      data: { status: "declined" },
    });
    await logEvent({
      communityId: session.communityId,
      userName: session.name,
      action: "Not going",
      detail: event.title,
    });
    revalidatePath("/member/calendar");
    revalidatePath("/member/notifications");
    return NextResponse.json({ ok: true, rsvped: false, going: false });
  }

  const existing = await prisma.eventRsvp.findUnique({
    where: {
      eventId_memberEmail: {
        eventId: id,
        memberEmail: email,
      },
    },
  });

  // Calendar toggle off when already going (unless explicitly accepting an invite
  // / re-confirming after payment settlement).
  if (existing && !acceptInvite) {
    await prisma.eventRsvp.delete({ where: { id: existing.id } });
    await prisma.eventInvite.updateMany({
      where: { eventId: id, memberEmail: email },
      data: { status: "declined" },
    });
    revalidatePath("/member/calendar");
    revalidatePath("/member/notifications");
    return NextResponse.json({ ok: true, rsvped: false, going: false });
  }

  if (existing) {
    await prisma.eventInvite.updateMany({
      where: { eventId: id, memberEmail: email },
      data: { status: "accepted" },
    });
    return NextResponse.json({ ok: true, rsvped: true, going: true });
  }

  try {
    await assertEventHasCapacity(id);
  } catch (err) {
    if (err instanceof ClinicCapacityError) {
      return NextResponse.json({ error: err.message, full: true }, { status: 409 });
    }
    throw err;
  }

  const isMember = await isClubMemberEmail(email, event.communityId);
  const clinic = isClinicCategory(event.category);
  const feeCents =
    event.requirePayment && event.feeCents > 0
      ? clinicFeeCents({
          memberFeeCents: event.feeCents,
          isMember: clinic ? isMember : true,
        })
      : 0;
  const amountDollars = feeCents / 100;

  if (feeCents > 0) {
    const alreadyPaid = await memberHasPaidEventFee({
      eventId: event.id,
      memberEmail: email,
      minAmountDollars: amountDollars,
    });
    if (!alreadyPaid) {
      if (clinic && !isMember) {
        const { payUrl, payToken } = await createClinicGuestInvoice({
          communityId: event.communityId,
          eventId: event.id,
          eventTitle: event.title,
          guestName: session.name,
          guestEmail: email,
          amountDollars,
        });
        return NextResponse.json({
          ok: false,
          needsPayment: true,
          guest: true,
          amount: amountDollars,
          description: `Guest clinic fee (2× member rate): ${event.title}`,
          eventId: event.id,
          payUrl,
          payToken,
        });
      }

      const description = `${clinic ? "Clinic" : "Event"} fee: ${event.title}`;
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

  await prisma.eventRsvp.create({
    data: {
      eventId: id,
      memberEmail: email,
      memberName: session.name,
    },
  });
  await prisma.eventInvite.updateMany({
    where: { eventId: id, memberEmail: email },
    data: { status: "accepted" },
  });

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Going",
    detail: event.title,
  });
  revalidatePath("/member/calendar");
  revalidatePath("/member/notifications");
  return NextResponse.json({ ok: true, rsvped: true, going: true });
}
