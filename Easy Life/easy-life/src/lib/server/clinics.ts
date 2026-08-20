import { randomBytes } from "crypto";
import { prisma } from "@/lib/server/prisma";
import {
  createCommunityEvent,
  createMemberCharge,
} from "@/lib/server/records";
import { createEventInvites } from "@/lib/server/project-management";
import { sendEmail } from "@/lib/server/notify";
import { appPath } from "@/lib/server/app-url";

export type ClinicSport = "tennis" | "golf" | "bocce" | "pickleball";

export function isClinicCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return /clinic|tennis|golf|bocce|pickle/i.test(category);
}

/** Club member = User with matching communityId (active). */
export async function isClubMemberEmail(
  email: string,
  communityId: string | null | undefined,
): Promise<boolean> {
  if (!communityId) return false;
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { communityId: true, role: true, status: true },
  });
  if (!user || user.status === "frozen") return false;
  if (user.communityId !== communityId) return false;
  return user.role === "member" || user.role === "board" || user.role === "pm";
}

export function clinicFeeCents(input: {
  memberFeeCents: number;
  isMember: boolean;
}): number {
  const base = Math.max(0, Math.floor(input.memberFeeCents));
  return input.isMember ? base : base * 2;
}

export async function countEventGoing(eventId: string): Promise<number> {
  return prisma.eventRsvp.count({ where: { eventId } });
}

export class ClinicCapacityError extends Error {
  readonly status = 409;
  constructor(message = "This clinic is full.") {
    super(message);
    this.name = "ClinicCapacityError";
  }
}

export async function assertEventHasCapacity(eventId: string): Promise<void> {
  const event = await prisma.communityEvent.findUnique({
    where: { id: eventId },
    select: { capacity: true },
  });
  if (!event?.capacity || event.capacity <= 0) return;
  const going = await countEventGoing(eventId);
  if (going >= event.capacity) {
    throw new ClinicCapacityError(
      `This clinic is full (${event.capacity} spots).`,
    );
  }
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekly occurrence dates: first date + N extra weeks (0 = one date). */
export function weeklyOccurrenceDates(
  startDate: string,
  repeatWeeks: number,
): string[] {
  const extra = Math.max(0, Math.min(26, Math.floor(repeatWeeks)));
  const count = 1 + extra;
  return Array.from({ length: count }, (_, i) => addDaysIso(startDate, i * 7));
}

export async function createProClinicSeries(input: {
  communityId: string;
  createdByName: string;
  createdByEmail: string;
  title: string;
  description?: string;
  sport: ClinicSport;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  requirePayment: boolean;
  memberFeeCents: number;
  /** Extra weekly occurrences after the first (0 = one clinic). */
  repeatWeeks: number;
  invites: Array<{ email: string; name: string }>;
}) {
  const category = `${input.sport}_clinic`;
  const timeLabel = `${input.startTime}-${input.endTime}`;
  const events = [];
  const dates = weeklyOccurrenceDates(input.date, input.repeatWeeks);

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    const occurrenceNote =
      dates.length > 1 ? ` (week ${i + 1} of ${dates.length})` : "";
    const event = await createCommunityEvent({
      communityId: input.communityId,
      title: `${input.title}${occurrenceNote}`,
      description: [
        input.description?.trim() || `${input.sport} clinic with ${input.createdByName}`,
        input.requirePayment && input.memberFeeCents > 0
          ? `Member fee $${(input.memberFeeCents / 100).toFixed(2)}. Non-members pay double.`
          : null,
        input.capacity ? `Limited to ${input.capacity} players.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      date,
      time: timeLabel,
      endTime: input.endTime,
      location: input.location ?? "",
      category,
      isPromoted: false,
      capacity: input.capacity,
      requirePayment: input.requirePayment,
      feeCents: input.requirePayment ? input.memberFeeCents : 0,
      createdBy: input.createdByName,
      createdByEmail: input.createdByEmail,
    });
    events.push(event);

    // Pro is hosting — count them toward capacity as going.
    await prisma.eventRsvp.upsert({
      where: {
        eventId_memberEmail: {
          eventId: event.id,
          memberEmail: input.createdByEmail.trim().toLowerCase(),
        },
      },
      create: {
        eventId: event.id,
        memberEmail: input.createdByEmail.trim().toLowerCase(),
        memberName: input.createdByName,
      },
      update: {},
    });

    if (input.invites.length) {
      await createEventInvites({
        eventId: event.id,
        invites: input.invites,
        clinic: {
          memberFeeCents: input.memberFeeCents,
          requirePayment: input.requirePayment,
          capacity: input.capacity,
          sport: input.sport,
        },
      });
    }
  }

  return events;
}

/** Create guest (non-member) invoice for clinic RSVP and email pay link. */
export async function createClinicGuestInvoice(input: {
  communityId: string;
  eventId: string;
  eventTitle: string;
  guestName: string;
  guestEmail: string;
  amountDollars: number;
}) {
  const payToken = randomBytes(24).toString("hex");
  const charge = await createMemberCharge({
    communityId: input.communityId,
    memberEmail: input.guestEmail,
    memberName: input.guestName,
    category: "clinic",
    description: `Clinic guest fee (2×): ${input.eventTitle}`,
    amount: input.amountDollars,
    status: "due",
    referenceType: "clinic_guest_fee",
    referenceId: input.eventId,
    payToken,
  });
  const payUrl = appPath(`/pay/guest/${payToken}`);
  await sendEmail({
    to: input.guestEmail,
    subject: `Pay to join: ${input.eventTitle}`,
    body: [
      `Hi ${input.guestName},`,
      "",
      `You're invited as a non-member guest. Guest rate is double the member fee.`,
      `Amount due: $${input.amountDollars.toFixed(2)}`,
      "",
      `Pay here to confirm your spot: ${payUrl}`,
      "",
      "— Your Club",
    ].join("\n"),
  });
  return { charge, payToken, payUrl };
}

export async function markClinicGuestPaidAndRsvp(chargeId: string) {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.referenceType !== "clinic_guest_fee" || !charge.referenceId) {
    return null;
  }
  if (!charge.memberEmail) return charge;

  await prisma.memberCharge.update({
    where: { id: charge.id },
    data: { status: "paid" },
  });

  try {
    await assertEventHasCapacity(charge.referenceId);
  } catch {
    return charge;
  }

  await prisma.eventRsvp.upsert({
    where: {
      eventId_memberEmail: {
        eventId: charge.referenceId,
        memberEmail: charge.memberEmail,
      },
    },
    create: {
      eventId: charge.referenceId,
      memberEmail: charge.memberEmail,
      memberName: charge.memberName,
    },
    update: {},
  });
  await prisma.eventInvite.updateMany({
    where: {
      eventId: charge.referenceId,
      memberEmail: charge.memberEmail,
    },
    data: { status: "accepted" },
  });
  return charge;
}
