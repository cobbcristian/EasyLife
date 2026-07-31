import { prisma } from "@/lib/server/prisma";
import { getOrCreateFbPeriod } from "@/lib/server/membership";

export async function buildMemberStatement(input: {
  communityId: string;
  memberEmail: string;
  startDate?: string;
  endDate?: string;
}) {
  const email = input.memberEmail.toLowerCase();
  const fb = await getOrCreateFbPeriod({
    communityId: input.communityId,
    memberEmail: email,
  });

  const start = input.startDate ?? fb.periodStart;
  const end = input.endDate ?? fb.periodEnd;

  const [charges, dining, lessons, bookings] = await Promise.all([
    prisma.memberCharge.findMany({
      where: {
        communityId: input.communityId,
        memberEmail: email,
        OR: [
          { dueDate: { gte: start, lte: end } },
          {
            AND: [
              { dueDate: null },
              { createdAt: { gte: new Date(`${start}T00:00:00`), lte: new Date(`${end}T23:59:59`) } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.diningOrder.findMany({
      where: {
        communityId: input.communityId,
        memberEmail: email,
        createdAt: {
          gte: new Date(`${start}T00:00:00`),
          lte: new Date(`${end}T23:59:59`),
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lessonBooking.findMany({
      where: {
        communityId: input.communityId,
        memberEmail: email,
        date: { gte: start, lte: end },
        status: { not: "cancelled" },
      },
      orderBy: { date: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        communityId: input.communityId,
        memberEmail: email,
        date: { gte: start, lte: end },
        status: { not: "cancelled" },
        bookingKind: "amenity",
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const lines: Array<{
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    status: string;
  }> = [];

  for (const c of charges) {
    lines.push({
      id: `charge-${c.id}`,
      date: c.dueDate ?? c.createdAt.toISOString().slice(0, 10),
      category: c.category,
      description: c.description,
      amount: c.amount,
      status: c.status,
    });
  }
  for (const d of dining) {
    lines.push({
      id: `dining-${d.id}`,
      date: d.createdAt.toISOString().slice(0, 10),
      category: "dining",
      description: `Dining — ${d.items.slice(0, 80)}`,
      amount: d.total,
      status: d.status,
    });
  }
  for (const l of lessons) {
    // fee already on MemberCharge usually — include for clarity if no charge linked in range
    if (!l.chargeId) {
      lines.push({
        id: `lesson-${l.id}`,
        date: l.date,
        category: "lesson",
        description: `${l.offeringName} with ${l.providerName}`,
        amount: l.fee,
        status: l.status,
      });
    }
  }
  for (const b of bookings) {
    lines.push({
      id: `booking-${b.id}`,
      date: b.date,
      category: "amenity",
      description: `${b.amenity} ${b.startTime}–${b.endTime}`,
      amount: 0,
      status: b.status,
    });
  }

  lines.sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));

  const totalCharged = lines.reduce((s, l) => s + l.amount, 0);
  const totalDue = charges
    .filter((c) => c.status !== "paid")
    .reduce((s, c) => s + c.amount, 0);
  const totalPaid = charges
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amount, 0);
  const diningSpend = dining.reduce((s, d) => s + d.total, 0);

  return {
    period: {
      start,
      end,
      kind: fb.periodKind,
      fbRequired: fb.requiredAmount,
      fbSpent: Math.max(fb.spentAmount, diningSpend),
      fbRemaining: Math.max(0, fb.requiredAmount - Math.max(fb.spentAmount, diningSpend)),
      fbStatus: fb.status,
    },
    totals: {
      charged: totalCharged,
      due: totalDue,
      paid: totalPaid,
      dining: diningSpend,
    },
    lines,
  };
}
