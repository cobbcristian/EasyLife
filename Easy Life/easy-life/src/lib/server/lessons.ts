import { prisma } from "@/lib/server/prisma";
import {
  assertCanBookAmenity,
  MembershipAccessError,
} from "@/lib/server/membership";
import { assignUnitNumber, countOverlappingBookings, timeRangesOverlap } from "@/lib/scheduling";
import { hoursClosedMessage, isOpenAt, parseWeeklyHours } from "@/lib/hours";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export class LessonConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonConflictError";
  }
}

export type LessonSport = "tennis" | "golf" | "pickleball";

async function findLessonAmenity(input: {
  communityId: string;
  sport: LessonSport;
  onCourse?: boolean;
}) {
  if (input.sport === "tennis") {
    return (
      (await prisma.amenity.findFirst({
        where: {
          communityId: input.communityId,
          kind: "court",
          playable: true,
          name: { contains: "Tennis" },
        },
        orderBy: { name: "asc" },
      })) ??
      (await prisma.amenity.findFirst({
        where: {
          communityId: input.communityId,
          kind: "court",
          playable: true,
          NOT: { name: { contains: "Pickleball" } },
        },
        orderBy: { name: "asc" },
      }))
    );
  }
  if (input.sport === "pickleball") {
    return prisma.amenity.findFirst({
      where: {
        communityId: input.communityId,
        kind: "court",
        playable: true,
        name: { contains: "Pickleball" },
      },
      orderBy: { name: "asc" },
    });
  }
  if (input.onCourse) {
    return prisma.amenity.findFirst({
      where: {
        communityId: input.communityId,
        kind: "golf_course",
        playable: true,
      },
      orderBy: { name: "asc" },
    });
  }
  return (
    (await prisma.amenity.findFirst({
      where: {
        communityId: input.communityId,
        kind: "driving_range",
        playable: true,
      },
      orderBy: { name: "asc" },
    })) ??
    (await prisma.amenity.findFirst({
      where: {
        communityId: input.communityId,
        kind: "golf_course",
        playable: true,
      },
      orderBy: { name: "asc" },
    }))
  );
}

function sportLabel(sport: LessonSport): string {
  switch (sport) {
    case "tennis":
      return "Tennis";
    case "golf":
      return "Golf";
    case "pickleball":
      return "Pickleball";
    default: {
      const _exhaustive: never = sport;
      return _exhaustive;
    }
  }
}

const FALLBACK_LESSON_PROS: Record<
  LessonSport,
  Array<{ name: string; description: string }>
> = {
  golf: [
    {
      name: "Jordan Blake, PGA",
      description:
        "PGA teaching professional — range, short game, and on-course playing lessons.",
    },
    {
      name: "Morgan Ellis, PGA",
      description:
        "First Assistant Professional — junior clinics, fitting sessions, and private lessons.",
    },
    {
      name: "Taylor Brooks, PGA",
      description:
        "Teaching professional focused on full-swing mechanics and course management.",
    },
  ],
  tennis: [
    {
      name: "Alex Rivera",
      description:
        "Head Tennis Professional — private lessons, doubles strategy, and league coaching.",
    },
    {
      name: "Casey Nguyen",
      description:
        "Assistant Tennis Professional — juniors, cardio tennis, and match-play clinics.",
    },
    {
      name: "Riley Quinn",
      description:
        "Tennis Professional — serving, footwork, and competitive match preparation.",
    },
  ],
  pickleball: [
    {
      name: "Sam Ortiz",
      description:
        "Pickleball Professional — beginner through advanced private lessons and drills.",
    },
    {
      name: "Jamie Park",
      description:
        "Pickleball Coach — kitchen strategy, third-shot drops, and open-play clinics.",
    },
  ],
};

function communitySlug(communityId: string): string {
  return communityId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "club";
}

function pickFallbackPros(
  communityId: string,
  sport: LessonSport,
  count: number,
): Array<{ name: string; description: string }> {
  const bank = FALLBACK_LESSON_PROS[sport];
  const offset =
    [...communityId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % bank.length;
  const out: Array<{ name: string; description: string }> = [];
  for (let i = 0; i < count; i++) {
    out.push(bank[(offset + i) % bank.length]!);
  }
  return out;
}

/**
 * Always guarantee tennis / golf / pickleball lesson pros for a club.
 * Invents demo names when research/seed data is missing — never leave the
 * Private Lessons dropdown empty.
 * HOA /go demos (Harbor Pointe / Willow Creek / Alliant) skip golf so Vendors
 * never invents PGA golf pros mid-pitch.
 */
export async function ensureLessonProsForCommunity(
  communityId: string,
): Promise<void> {
  const cid = communityId?.trim() || "__missing_community__";
  const slug = communitySlug(cid);
  const hoaNoGolf = new Set(["harbor-pointe", "willow-creek", "alliant"]);
  if (hoaNoGolf.has(cid)) {
    await prisma.provider.deleteMany({
      where: {
        communityId: cid,
        listingKind: "club",
        OR: [
          { email: { endsWith: `@${slug}.demo` }, category: "golf" },
          { email: { startsWith: "golf.pro" }, category: "golf" },
          { name: { contains: "PGA" }, category: "golf" },
        ],
      },
    });
  }
  const sports: LessonSport[] = hoaNoGolf.has(cid)
    ? ["tennis", "pickleball"]
    : ["tennis", "golf", "pickleball"];

  for (const sport of sports) {
    const existing = await listClubPros(cid, sport);
    const min = sport === "pickleball" ? 1 : 2;
    if (existing.length >= min) continue;

    const needed = min - existing.length;
    const people = pickFallbackPros(cid, sport, needed);
    for (let i = 0; i < needed; i++) {
      const person = people[i]!;
      const id = `${slug}-lesson-${sport}-${i + 1}`;
      await prisma.provider.upsert({
        where: { id },
        create: {
          id,
          communityId: cid,
          name: person.name,
          email: `${sport}.pro${i + 1}@${slug}.demo`,
          description: person.description,
          category: sport,
          type: "activity",
          listingKind: "club",
          rating: 4.9,
        },
        update: {
          name: person.name,
          description: person.description,
          category: sport,
          type: "activity",
          listingKind: "club",
          rating: 4.9,
        },
      });
    }
  }
}

export async function listClubPros(communityId: string, sport?: LessonSport) {
  // SQLite: no Prisma `mode: "insensitive"`. Seeds use lowercase sport categories.
  const providers = await prisma.provider.findMany({
    where: {
      communityId,
      listingKind: "club",
      ...(sport
        ? {
            OR: [
              { category: { equals: sport } },
              { category: { contains: sport } },
              { category: { contains: sportLabel(sport) } },
              { type: { contains: sport } },
              { name: { contains: sportLabel(sport) } },
            ],
          }
        : {
            OR: [
              { category: { contains: "tennis" } },
              { category: { contains: "Tennis" } },
              { category: { contains: "golf" } },
              { category: { contains: "Golf" } },
              { category: { contains: "pickleball" } },
              { category: { contains: "Pickleball" } },
              { type: { contains: "pro" } },
              { type: { contains: "lesson" } },
              { type: { equals: "activity" } },
              { name: { contains: "Pro" } },
            ],
          }),
    },
    orderBy: { name: "asc" },
  });
  return providers;
}

export async function createLessonBooking(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  providerId: string;
  sport: LessonSport;
  date: string;
  startTime: string;
  durationMinutes?: number;
  onCourse?: boolean;
  notes?: string;
}) {
  const provider = await prisma.provider.findFirst({
    where: { id: input.providerId, communityId: input.communityId },
  });
  if (!provider) throw new LessonConflictError("Pro not found.");

  const duration = input.durationMinutes ?? 60;
  const endTime = addMinutes(input.startTime, duration);
  const amenity = await findLessonAmenity({
    communityId: input.communityId,
    sport: input.sport,
    onCourse: input.onCourse,
  });
  if (!amenity) {
    const missing =
      input.sport === "tennis"
        ? "No tennis courts are available to reserve for lessons."
        : input.sport === "pickleball"
          ? "No pickleball courts are available to reserve for lessons."
          : "No driving range or golf course is available for golf lessons.";
    throw new LessonConflictError(missing);
  }

  try {
    await assertCanBookAmenity({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      amenityKind: amenity.kind,
      amenityName: amenity.name,
    });
  } catch (err) {
    if (err instanceof MembershipAccessError) throw err;
    throw err;
  }

  const hours = parseWeeklyHours(amenity.hoursJson);
  if (!isOpenAt(hours, input.date, input.startTime, endTime)) {
    const hint = hoursClosedMessage(hours, input.date);
    throw new LessonConflictError(
      hint
        ? `${amenity.name} is outside hours of operation. ${hint}`
        : `${amenity.name} is closed at that time.`,
    );
  }

  const existingLessons = await prisma.lessonBooking.findMany({
    where: {
      providerId: provider.id,
      date: input.date,
      status: { not: "cancelled" },
    },
  });
  if (
    existingLessons.some((l) =>
      timeRangesOverlap(input.startTime, endTime, l.startTime, l.endTime),
    )
  ) {
    throw new LessonConflictError("That pro is already booked at this time.");
  }

  const amenityBookings = await prisma.booking.findMany({
    where: {
      communityId: input.communityId,
      date: input.date,
      status: { not: "cancelled" },
      OR: [{ amenityId: amenity.id }, { amenity: amenity.name, amenityId: null }],
    },
  });
  const overlapping = countOverlappingBookings(amenityBookings, input.startTime, endTime);
  if (overlapping >= amenity.unitCount) {
    const label =
      amenity.kind === "golf_course"
        ? "tee time"
        : amenity.kind === "driving_range"
          ? "lane"
          : amenity.kind === "court"
            ? "court"
            : "slot";
    throw new LessonConflictError(`All ${label}s are booked for this lesson time.`);
  }

  const unitNumber = assignUnitNumber(
    amenity.unitCount,
    amenityBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      unitNumber: b.unitNumber,
    })),
    input.startTime,
    endTime,
  );

  const fee =
    input.communityId === "heritage-bay" && input.sport === "golf"
      ? 110
      : input.sport === "tennis" || input.sport === "pickleball"
      ? 85
      : input.onCourse
        ? 120
        : 75;
  const offeringName =
    input.sport === "tennis"
      ? "Private Tennis Lesson"
      : input.sport === "pickleball"
        ? "Private Pickleball Lesson"
        : input.onCourse
          ? "Private Golf Lesson (Course)"
          : "Private Golf Lesson (Range)";

  const charge = await prisma.memberCharge.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      category: "lesson",
      description: `${offeringName} with ${provider.name} — ${input.date} ${input.startTime}`,
      amount: fee,
      status: "due",
      dueDate: input.date,
      referenceType: "lesson",
    },
  });

  const lesson = await prisma.lessonBooking.create({
    data: {
      communityId: input.communityId,
      providerId: provider.id,
      providerName: provider.name,
      proEmail: provider.email,
      offeringName,
      sport: input.sport,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      date: input.date,
      startTime: input.startTime,
      endTime,
      amenityId: amenity.id,
      status: "confirmed",
      fee,
      chargeId: charge.id,
      notes: input.notes ?? null,
    },
  });

  const hold = await prisma.booking.create({
    data: {
      communityId: input.communityId,
      amenityId: amenity.id,
      unitNumber,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: `${input.memberName} (lesson)`,
      amenity: amenity.name,
      date: input.date,
      startTime: input.startTime,
      endTime,
      status: "confirmed",
      bookingKind: "lesson_hold",
      providerId: provider.id,
      lessonBookingId: lesson.id,
    },
  });

  await prisma.lessonBooking.update({
    where: { id: lesson.id },
    data: { amenityBookingId: hold.id },
  });

  await prisma.memberCharge.update({
    where: { id: charge.id },
    data: { referenceId: lesson.id },
  });

  return { lesson, amenityBooking: hold, charge };
}

export async function listMemberLessons(memberEmail: string) {
  return prisma.lessonBooking.findMany({
    where: { memberEmail: memberEmail.toLowerCase() },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });
}
