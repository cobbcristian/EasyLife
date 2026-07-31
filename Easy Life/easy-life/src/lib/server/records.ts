import { prisma } from "@/lib/server/prisma";
import {
  assignUnitNumber,
  availabilityWindows,
  countOverlappingBookings,
  listFreeUnitNumbers,
  timeRangesOverlap,
  unitNoun,
} from "@/lib/scheduling";
import { sortPlayersForSeeding } from "@/lib/tournament-ratings";
import { scheduleTournamentMatches } from "@/lib/server/tournament-scheduling";
import { syncTournamentCourtBookings } from "@/lib/server/tournament-bookings";
import {
  buildBookingReminderRows,
  deliverScheduledReminder,
  reminderLogAction,
} from "@/lib/server/reminders";
import { sendPushToUser } from "@/lib/server/push";
import { sendEmail } from "@/lib/server/notify";
import { addMemberInboxItem } from "@/lib/server/project-management";
import { appPath } from "@/lib/server/app-url";
import { serializeTiebreakers, DEFAULT_TIEBREAKERS } from "@/lib/tournament-tiebreakers";
import { DEFAULT_NO_START_POLICY } from "@/lib/tournament-no-start";
import type { TiebreakerCriterion } from "@/lib/tournament-tiebreakers";
import type { NoStartDefault } from "@/lib/tournament-no-start";
import { parseScoresJson, type TournamentScoresData } from "@/lib/tournament-scores";
import { brandAssets, genericClubFeaturedTiles, heritageBayFeaturedTiles, homeFeaturedTiles, rewriteTenantApparelImageUrl, spanishWellsFeaturedTiles } from "@/lib/brand-assets";
import { isDemoSeedAllowed } from "@/lib/server/demo-mode";
import {
  assertCanBookAmenity,
  ensureMembershipTiersSeeded,
  MembershipAccessError,
  recordFbSpend,
} from "@/lib/server/membership";
import { ensureClubStaffSeeded } from "@/lib/server/residency";
import { ensureGrabGoSeeded } from "@/lib/server/grab-go";
import {
  ensureDemoDependents,
} from "@/lib/server/dependent-membership";
import { ensureDemoRejoinCase } from "@/lib/server/membership-rejoin";
import { ensureHeritageBayDemoSeeded } from "@/lib/server/heritage-bay-seed";
import { ensureHuntersRidgeDemoSeeded } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoSeeded } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoSeeded } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoSeeded } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoSeeded } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoSeeded } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoSeeded } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoSeeded } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoSeeded } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoSeeded } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoSeeded } from "@/lib/server/copperleaf-seed";
import { ensureClubRenaissanceDemoSeeded } from "@/lib/server/club-renaissance-seed";
import { ensureFallsClubDemoSeeded } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoSeeded } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoSeeded } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoSeeded } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoSeeded } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoSeeded } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoSeeded } from "@/lib/server/windsor-seed";
import { ensureWorthingtonDemoSeeded } from "@/lib/server/worthington-seed";
import { ensureSpanishWellsDemoSeeded } from "@/lib/server/spanish-wells-seed";
import { ensureHarborPointeDemoSeeded } from "@/lib/server/harbor-pointe-seed";
import { ensureWillowCreekDemoSeeded } from "@/lib/server/willow-creek-seed";
import { ensureAlliantDemoSeeded } from "@/lib/server/alliant-seed";
import { ensureIronLakeDemoSeeded } from "@/lib/server/iron-lake-seed";
import { ensureFourClubDemoContent, isFourClubDemoId } from "@/lib/server/four-club-demo-content";
import {
  ironLakeGolfClubRentals,
  rentalItems,
  type RentalItem,
} from "@/lib/member-data";
import {
  computeFlexAvailability,
  countOverlappingFlexRentals,
  inventoryForFlex,
  isGolfClubFlex,
  rentalEndDate,
  todayIsoDate,
  type FlexAvailability,
  type GolfClubFlex,
} from "@/lib/rental-flex";
import {
  closedWindowForRange,
  dayHoursForDate,
  formatHoursSummary,
  hoursClosedMessage,
  isOpenAt,
  parseWeeklyHours,
  weekdayHours,
  defaultDailyHours,
} from "@/lib/hours";
import {
  isRainAdvisoryActive,
  isRainSensitiveAmenity,
  normalizeCourtAddons,
  parseWeatherJson,
  rainClosureMessage,
  type CommunityWeather,
} from "@/lib/weather";
import {
  assignTableLabel,
  computeReadyBy,
  diningConfirmationMessage,
  normalizeDiningFulfillment,
  type DiningLineInput,
} from "@/lib/dining-order";

export { MembershipAccessError };

/** Prefer empty results over leaking another club's demo data. */
const MISSING_COMMUNITY = "__missing_community__";
/** Golden Ocala id — only for GO-specific demo seed rows. */
const GOLDEN_OCALA_COMMUNITY = "golden-ocala";

/** Demo marketplace covers keyed by seed listing title. */
const MARKETPLACE_SEED_IMAGES: Record<string, string> = {
  "Peloton Bike (like new)": brandAssets.marketplacePeloton,
  "Patio dining set, 6 chairs": brandAssets.marketplacePatioSet,
  "Patio dining set": brandAssets.marketplacePatioSet,
  "Titleist Pro V1 dozen": brandAssets.marketplaceGolfBalls,
  "Titleist Pro V1 Dozen": brandAssets.marketplaceGolfBalls,
  "Kids' tennis racquet": brandAssets.marketplaceKidsRacquet,
  "Kids' Tennis Racquet": brandAssets.marketplaceKidsRacquet,
  "Selkirk Pickleball Paddle": brandAssets.marketplacePickleballPaddle,
};

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

/** Invite accepted after party seats were filled (first N acceptors). */
export class BookingInviteFullError extends Error {
  constructor(message = "This reservation is full — no spots left.") {
    super(message);
    this.name = "BookingInviteFullError";
  }
}

export class RentalConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RentalConflictError";
  }
}

function scope(communityId?: string | null): string {
  return communityId?.trim() || MISSING_COMMUNITY;
}

/* ---------------- Bookings ---------------- */

export async function listBookingsForMember(email: string) {
  return prisma.booking.findMany({
    where: { memberEmail: email, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });
}

/** Host bookings plus amenity bookings where this member accepted an invite. */
export async function listBookingsVisibleToMember(email: string) {
  const normalized = email.trim().toLowerCase();
  const [hosted, acceptedInvites] = await Promise.all([
    listBookingsForMember(email),
    prisma.bookingInvite.findMany({
      where: { memberEmail: normalized, status: "accepted" },
      select: { bookingId: true },
    }),
  ]);
  const hostedIds = new Set(hosted.map((b) => b.id));
  const guestIds = acceptedInvites
    .map((i) => i.bookingId)
    .filter((id) => !hostedIds.has(id));
  if (guestIds.length === 0) return hosted;

  const guestBookings = await prisma.booking.findMany({
    where: { id: { in: guestIds }, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });
  return [...hosted, ...guestBookings];
}

export type ReservationGuestStatus = "going" | "not_going" | "pending" | "full";

export type ReservationGuest = {
  email: string;
  name: string;
  status: ReservationGuestStatus;
  isHost: boolean;
  isYou: boolean;
};

export type BookingReservationDetail = {
  kind: "booking";
  id: string;
  bookingId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  locationLine1: string;
  locationLine2: string;
  status: string;
  inviteCapacity: number | null;
  role: "host" | "invitee";
  canCancel: boolean;
  canLeave: boolean;
  canInviteMore: boolean;
  canAcceptInvite: boolean;
  inviteId: string | null;
  yourInviteStatus: ReservationGuestStatus | null;
  hostName: string;
  hostEmail: string;
  guests: ReservationGuest[];
  chatHref: string;
};

export async function getBookingReservationDetail(
  bookingId: string,
  memberEmail: string,
): Promise<BookingReservationDetail | null> {
  const email = memberEmail.trim().toLowerCase();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { invites: { orderBy: { createdAt: "asc" } } },
  });
  if (!booking || booking.status === "cancelled") return null;

  const isHost = booking.memberEmail.trim().toLowerCase() === email;
  const myInvite = booking.invites.find(
    (i) => i.memberEmail.trim().toLowerCase() === email,
  );
  if (!isHost && !myInvite) return null;

  const community = await prisma.community.findUnique({
    where: { id: booking.communityId },
    select: { location: true, name: true },
  });

  const guests: ReservationGuest[] = [
    {
      email: booking.memberEmail,
      name: booking.memberName,
      status: "going",
      isHost: true,
      isYou: isHost,
    },
    ...booking.invites.map((i) => {
      const status: ReservationGuestStatus =
        i.status === "accepted"
          ? "going"
          : i.status === "declined"
            ? "not_going"
            : i.status === "full"
              ? "full"
              : "pending";
      return {
        email: i.memberEmail,
        name: i.memberName,
        status,
        isHost: false,
        isYou: i.memberEmail.trim().toLowerCase() === email,
      };
    }),
  ];

  const unit =
    booking.unitNumber != null ? ` #${booking.unitNumber}` : "";
  const title = `${booking.amenity}${unit}`;

  return {
    kind: "booking",
    id: booking.id,
    bookingId: booking.id,
    title,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timeLabel: `${booking.startTime}–${booking.endTime}`,
    locationLine1: community?.location?.trim() || community?.name || "Club",
    locationLine2: community?.name ?? "",
    status: booking.status,
    inviteCapacity: booking.inviteCapacity,
    role: isHost ? "host" : "invitee",
    canCancel: isHost,
    canLeave: !isHost && Boolean(myInvite) && myInvite!.status !== "declined",
    canInviteMore: isHost,
    canAcceptInvite: !isHost && myInvite?.status === "pending",
    inviteId: myInvite?.id ?? null,
    yourInviteStatus: myInvite
      ? myInvite.status === "accepted"
        ? "going"
        : myInvite.status === "declined"
          ? "not_going"
          : myInvite.status === "full"
            ? "full"
            : "pending"
      : isHost
        ? "going"
        : null,
    hostName: booking.memberName,
    hostEmail: booking.memberEmail,
    guests,
    chatHref: `/member/messages?to=${encodeURIComponent(booking.memberEmail)}&name=${encodeURIComponent(booking.memberName)}`,
  };
}

export async function leaveBookingReservation(
  bookingId: string,
  memberEmail: string,
) {
  const email = memberEmail.trim().toLowerCase();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status === "cancelled") return null;
  if (booking.memberEmail.trim().toLowerCase() === email) {
    return { error: "host_cannot_leave" as const };
  }
  const invite = await prisma.bookingInvite.findUnique({
    where: {
      bookingId_memberEmail: { bookingId, memberEmail: email },
    },
  });
  if (!invite) return null;
  const updated = await prisma.bookingInvite.update({
    where: { id: invite.id },
    data: { status: "declined" },
  });
  return { invite: updated };
}

export type EventReservationDetail = {
  kind: "event";
  id: string;
  eventId: string;
  title: string;
  description: string;
  date: string;
  timeLabel: string;
  endTime: string | null;
  locationLine1: string;
  locationLine2: string;
  category: string;
  requirePayment: boolean;
  feeCents: number;
  capacity: number | null;
  role: "host" | "invitee" | "member";
  canCancel: boolean;
  canLeave: boolean;
  canInviteMore: boolean;
  canRsvp: boolean;
  userRsvped: boolean;
  yourInviteStatus: ReservationGuestStatus | null;
  hostName: string;
  guests: ReservationGuest[];
  chatHref: string;
};

export async function getEventReservationDetail(
  eventId: string,
  memberEmail: string,
  memberName: string,
): Promise<EventReservationDetail | null> {
  const email = memberEmail.trim().toLowerCase();
  const event = await prisma.communityEvent.findUnique({
    where: { id: eventId },
    include: { rsvps: true },
  });
  if (!event) return null;

  const [invites, community] = await Promise.all([
    prisma.eventInvite.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.community.findUnique({
      where: { id: event.communityId },
      select: { location: true, name: true },
    }),
  ]);

  const isOrganizer =
    event.createdBy.trim().toLowerCase() === memberName.trim().toLowerCase();
  const myInvite = invites.find(
    (i) => i.memberEmail.trim().toLowerCase() === email,
  );
  const myRsvp = event.rsvps.find(
    (r) => r.memberEmail.trim().toLowerCase() === email,
  );

  const guestMap = new Map<string, ReservationGuest>();

  // Organizer row first when we can identify them via RSVP matching name,
  // otherwise synthesize from createdBy.
  const organizerRsvp = event.rsvps.find(
    (r) =>
      r.memberName.trim().toLowerCase() === event.createdBy.trim().toLowerCase(),
  );
  const organizerEmail = organizerRsvp?.memberEmail ?? "";
  guestMap.set(organizerEmail || `host:${event.createdBy}`, {
    email: organizerEmail,
    name: event.createdBy,
    status: "going",
    isHost: true,
    isYou: isOrganizer,
  });

  for (const r of event.rsvps) {
    const key = r.memberEmail.trim().toLowerCase();
    if (guestMap.has(key)) continue;
    if (
      organizerEmail &&
      key === organizerEmail.trim().toLowerCase()
    ) {
      continue;
    }
    guestMap.set(key, {
      email: r.memberEmail,
      name: r.memberName,
      status: "going",
      isHost: false,
      isYou: key === email,
    });
  }

  for (const inv of invites) {
    const key = inv.memberEmail.trim().toLowerCase();
    if (guestMap.has(key) && inv.status === "accepted") continue;
    const status: ReservationGuestStatus =
      inv.status === "accepted" || Boolean(event.rsvps.find((r) => r.memberEmail.toLowerCase() === key))
        ? "going"
        : inv.status === "declined"
          ? "not_going"
          : "pending";
    if (guestMap.has(key) && status === "going") continue;
    guestMap.set(key, {
      email: inv.memberEmail,
      name: inv.memberName,
      status,
      isHost: false,
      isYou: key === email,
    });
  }

  const guests = [...guestMap.values()];
  const role: EventReservationDetail["role"] = isOrganizer
    ? "host"
    : myInvite
      ? "invitee"
      : "member";

  const timeLabel = [event.time, event.endTime].filter(Boolean).join("–") || "";

  return {
    kind: "event",
    id: event.id,
    eventId: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    timeLabel,
    endTime: event.endTime,
    locationLine1:
      event.location?.trim() ||
      community?.location?.trim() ||
      community?.name ||
      "Club",
    locationLine2: event.location?.trim()
      ? community?.name ?? ""
      : community?.location ?? "",
    category: event.category,
    requirePayment: event.requirePayment,
    feeCents: event.feeCents,
    capacity: event.capacity,
    role,
    canCancel: isOrganizer,
    canLeave: Boolean(myRsvp) && !isOrganizer,
    canInviteMore: isOrganizer,
    canRsvp: true,
    userRsvped: Boolean(myRsvp),
    yourInviteStatus: myRsvp
      ? "going"
      : myInvite?.status === "declined"
        ? "not_going"
        : myInvite
          ? "pending"
          : null,
    hostName: event.createdBy,
    guests,
    chatHref: organizerEmail
      ? `/member/messages?to=${encodeURIComponent(organizerEmail)}&name=${encodeURIComponent(event.createdBy)}`
      : "/member/messages",
  };
}

export async function cancelCommunityEvent(
  eventId: string,
  memberName: string,
) {
  const event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
  if (!event) return null;
  if (
    event.createdBy.trim().toLowerCase() !== memberName.trim().toLowerCase()
  ) {
    return null;
  }
  await prisma.eventInvite.deleteMany({ where: { eventId } });
  await prisma.eventRsvp.deleteMany({ where: { eventId } });
  await prisma.communityEvent.delete({ where: { id: eventId } });
  return { ok: true as const };
}

async function loadCommunityWeather(
  communityId: string,
): Promise<CommunityWeather> {
  const row = await prisma.community.findUnique({
    where: { id: communityId },
    select: { weatherJson: true },
  });
  return parseWeatherJson(row?.weatherJson);
}

export async function createBooking(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
  amenity: string;
  amenityId?: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Optional preferred court / tee / lane number (1..unitCount). */
  unitNumber?: number | null;
  inviteCapacity?: number | null;
  invites?: Array<{ email: string; name: string }>;
  /** Court add-ons stored on Booking.addonsJson */
  addons?: string[];
}) {
  const communityId = scope(input.communityId);

  const amenityRecord = input.amenityId
    ? await prisma.amenity.findFirst({ where: { id: input.amenityId, communityId } })
    : await prisma.amenity.findFirst({ where: { name: input.amenity, communityId } });

  if (amenityRecord && !amenityRecord.playable) {
    const reason = amenityRecord.unplayableReason?.trim();
    throw new BookingConflictError(
      reason
        ? `${amenityRecord.name} is not playable: ${reason}`
        : `${amenityRecord.name} is currently not playable.`,
    );
  }

  if (amenityRecord) {
    await assertCanBookAmenity({
      communityId,
      memberEmail: input.memberEmail,
      amenityKind: amenityRecord.kind,
      amenityName: amenityRecord.name,
    });

    if (isRainSensitiveAmenity(amenityRecord.kind)) {
      const weather = await loadCommunityWeather(communityId);
      if (isRainAdvisoryActive(weather, input.date)) {
        throw new BookingConflictError(rainClosureMessage(amenityRecord.kind));
      }
    }

    const hours = parseWeeklyHours(amenityRecord.hoursJson);
    if (!isOpenAt(hours, input.date, input.startTime, input.endTime)) {
      const hint = hoursClosedMessage(
        hours,
        input.date,
        input.startTime,
        input.endTime,
      );
      throw new BookingConflictError(
        hint
          ? `${amenityRecord.name} is outside available play times. ${hint}`
          : `${amenityRecord.name} is closed at that time.`,
      );
    }
  }

  const memberBookings = await prisma.booking.findMany({
    where: {
      memberEmail: input.memberEmail,
      date: input.date,
      status: { not: "cancelled" },
    },
  });
  if (
    memberBookings.some((b) =>
      timeRangesOverlap(input.startTime, input.endTime, b.startTime, b.endTime),
    )
  ) {
    throw new BookingConflictError("You already have a booking during this time.");
  }

  const amenityName = amenityRecord?.name ?? input.amenity;
  const unitCount = amenityRecord?.unitCount ?? 1;
  const inviteCapacity =
    input.inviteCapacity != null && input.inviteCapacity > 0
      ? Math.floor(input.inviteCapacity)
      : null;

  const amenityBookings = await prisma.booking.findMany({
    where: {
      communityId,
      date: input.date,
      status: { not: "cancelled" },
      OR: amenityRecord
        ? [{ amenityId: amenityRecord.id }, { amenity: amenityName, amenityId: null }]
        : [{ amenity: amenityName }],
    },
  });

  const overlapping = countOverlappingBookings(
    amenityBookings,
    input.startTime,
    input.endTime,
  );
  const kind = amenityRecord?.kind ?? "facility";
  const noun = unitNoun(kind).toLowerCase();
  if (overlapping >= unitCount) {
    throw new BookingConflictError(
      unitCount === 1
        ? "That time slot is already booked."
        : `All ${unitCount} ${noun}s are booked for this time.`,
    );
  }

  const preferred =
    input.unitNumber != null && Number.isFinite(input.unitNumber)
      ? Math.floor(input.unitNumber)
      : null;
  if (preferred != null && (preferred < 1 || preferred > unitCount)) {
    throw new BookingConflictError(
      `${unitNoun(kind)} ${preferred} is not available at this facility.`,
    );
  }

  const bookingSnapshots = amenityBookings.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    unitNumber: b.unitNumber,
  }));

  const unitNumber = assignUnitNumber(
    unitCount,
    bookingSnapshots,
    input.startTime,
    input.endTime,
    preferred,
  );
  if (unitNumber == null) {
    if (preferred != null) {
      throw new BookingConflictError(
        `${unitNoun(kind)} ${preferred} is already booked for this time.`,
      );
    }
    throw new BookingConflictError("That time slot is already booked.");
  }

  const addons =
    amenityRecord?.kind === "court"
      ? normalizeCourtAddons(input.addons)
      : [];

  return prisma.booking.create({
    data: {
      communityId,
      amenityId: amenityRecord?.id ?? null,
      unitNumber,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      amenity: amenityName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "pending",
      inviteCapacity,
      addonsJson: JSON.stringify(addons),
    },
  }).then(async (booking) => {
    await scheduleBookingReminder(booking);
    const hostEmail = input.memberEmail.trim().toLowerCase();
    const invitees = (input.invites ?? []).filter(
      (i) => i.email.trim().toLowerCase() !== hostEmail,
    );
    if (invitees.length > 0) {
      await createBookingInvites({
        bookingId: booking.id,
        amenity: amenityName,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        hostName: input.memberName,
        inviteCapacity,
        invites: invitees,
      });
    }
    return booking;
  });
}

export async function createBookingInvites(input: {
  bookingId: string;
  amenity: string;
  date: string;
  startTime: string;
  endTime: string;
  hostName: string;
  inviteCapacity?: number | null;
  invites: Array<{ email: string; name: string }>;
}) {
  if (input.invites.length === 0) return [];
  const acceptUrl = appPath(`/member/reservations/${input.bookingId}`);
  const windowLabel = `${input.startTime}–${input.endTime}`;
  const pushTitle = `${input.hostName} invited you to ${input.amenity} ${windowLabel}`;
  const capNote =
    input.inviteCapacity != null
      ? ` First ${input.inviteCapacity} to accept get a spot.`
      : "";
  const rows = await Promise.all(
    input.invites.map(async (invite) => {
      const email = invite.email.trim().toLowerCase();
      const row = await prisma.bookingInvite.upsert({
        where: {
          bookingId_memberEmail: {
            bookingId: input.bookingId,
            memberEmail: email,
          },
        },
        create: {
          bookingId: input.bookingId,
          memberEmail: email,
          memberName: invite.name,
          status: "pending",
        },
        update: {
          memberName: invite.name,
          status: "pending",
        },
      });
      const body = `${input.hostName} invited you to ${input.amenity} on ${input.date} ${windowLabel}.${capNote} Open the app to Accept.`;
      await addMemberInboxItem({
        userEmail: email,
        title: "Activity Invitation",
        body,
        href: `/member/reservations/${input.bookingId}`,
      });
      await sendEmail({
        to: email,
        subject: pushTitle,
        body: [
          `Hi ${invite.name || "there"},`,
          "",
          body,
          "",
          `Accept here: ${acceptUrl}`,
          "",
          "— Your Club",
        ].join("\n"),
      });
      await sendPushToUser(email, {
        title: pushTitle,
        body: `Tap to Accept · ${input.date}`,
        url: acceptUrl,
      });
      return row;
    }),
  );
  return rows;
}

function parseBookingDateTime(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export async function scheduleBookingReminder(booking: {
  id: string;
  communityId: string;
  memberEmail: string;
  memberName: string;
  amenity: string;
  date: string;
  startTime: string;
}) {
  const start = parseBookingDateTime(booking.date, booking.startTime);
  const sendAt = new Date(start.getTime() - 3 * 60 * 60 * 1000);
  const rows = buildBookingReminderRows({ ...booking, sendAt });
  for (const row of rows) {
    await prisma.scheduledNotification.create({ data: row });
  }
}

export async function processDueReminders() {
  const BATCH = 50;
  const MAX_BATCHES = 10;
  let processed = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const due = await prisma.scheduledNotification.findMany({
      where: { sent: false, sendAt: { lte: new Date() } },
      take: BATCH,
      orderBy: { sendAt: "asc" },
    });
    if (due.length === 0) break;

    for (const n of due) {
      await deliverScheduledReminder(n);
      await logEvent({
        communityId: n.communityId,
        userName: n.userName,
        action: reminderLogAction(n.channel as "email" | "sms" | "push"),
        detail: n.subject,
      });
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: { sent: true },
      });
      processed++;
    }

    if (due.length < BATCH) break;
  }

  return processed;
}

export async function cancelBooking(id: string, memberEmail: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.memberEmail !== memberEmail) return null;
  return prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
}

/* ---------------- Service Requests ---------------- */

export async function listServiceRequests(opts: {
  communityId?: string | null;
  email?: string;
}) {
  return prisma.serviceRequest.findMany({
    where: opts.email
      ? { memberEmail: opts.email }
      : { communityId: scope(opts.communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createServiceRequest(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
  unit: string;
  title: string;
  category: string;
  description: string;
}) {
  return prisma.serviceRequest.create({
    data: {
      communityId: scope(input.communityId),
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      unit: input.unit,
      title: input.title,
      category: input.category,
      description: input.description,
      status: "open",
    },
  });
}

/* ---------------- Maintenance tasks ---------------- */

export async function listMaintenanceTasks(communityId?: string | null) {
  return prisma.maintenanceTask.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { due: "asc" },
  });
}

export async function createMaintenanceTask(input: {
  communityId?: string | null;
  title: string;
  area: string;
  assignedTo: string;
  due: string;
  status?: string;
}) {
  return prisma.maintenanceTask.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      area: input.area,
      assignedTo: input.assignedTo,
      due: input.due,
      status: input.status ?? "open",
    },
  });
}

/* ---------------- Announcements ---------------- */

export async function listAnnouncements(communityId?: string | null) {
  const cid = scope(communityId);
  let rows = await prisma.announcement.findMany({
    where: { communityId: cid },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0 && isFourClubDemoId(cid)) {
    await ensureFourClubDemoContent("full", cid);
    rows = await prisma.announcement.findMany({
      where: { communityId: cid },
      orderBy: { createdAt: "desc" },
    });
  }
  return rows;
}

export async function createAnnouncement(input: {
  communityId?: string | null;
  title: string;
  body: string;
  author: string;
  priority: string;
}) {
  return prisma.announcement.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      body: input.body,
      author: input.author,
      priority: input.priority,
    },
  });
}

/* ---------------- Invoices ---------------- */

export async function listInvoices(communityId?: string | null) {
  return prisma.invoice.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInvoice(input: {
  communityId?: string | null;
  vendor: string;
  description: string;
  amount: number;
  submittedBy: string;
}) {
  return prisma.invoice.create({
    data: {
      communityId: scope(input.communityId),
      vendor: input.vendor,
      description: input.description,
      amount: input.amount,
      submittedBy: input.submittedBy,
      status: "pending",
    },
  });
}

export async function updateInvoiceStatus(id: string, status: string) {
  return prisma.invoice.update({ where: { id }, data: { status } });
}

/* ---------------- Member charges ---------------- */

export async function listMemberCharges(opts: {
  communityId?: string | null;
  memberEmail?: string;
}) {
  return prisma.memberCharge.findMany({
    where: {
      communityId: opts.communityId ? scope(opts.communityId) : undefined,
      memberEmail: opts.memberEmail,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMemberCharge(input: {
  communityId: string;
  memberEmail?: string | null;
  memberName: string;
  category: string;
  description: string;
  amount: number;
  status?: string;
  dueDate?: string;
  referenceType?: string;
  referenceId?: string;
  payToken?: string | null;
}) {
  return prisma.memberCharge.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail ?? null,
      memberName: input.memberName,
      category: input.category,
      description: input.description,
      amount: input.amount,
      status: input.status ?? "due",
      dueDate: input.dueDate ?? new Date().toISOString().slice(0, 10),
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      payToken: input.payToken ?? null,
    },
  });
}

export async function listGuestFeeCharges(communityId?: string | null) {
  return prisma.memberCharge.findMany({
    where: {
      communityId: communityId ? scope(communityId) : undefined,
      referenceType: "court_guest_fee",
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChargeByPayToken(token: string) {
  return prisma.memberCharge.findFirst({ where: { payToken: token } });
}

export async function updateMemberChargeStatus(id: string, status: string) {
  return prisma.memberCharge.update({ where: { id }, data: { status } });
}

/* ---------------- Gallery ---------------- */

export async function listGallery(communityId?: string | null) {
  return prisma.galleryImage.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createGalleryImage(input: {
  communityId?: string | null;
  title: string;
  category: string;
  url: string;
  uploadedBy: string;
}) {
  return prisma.galleryImage.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      category: input.category,
      url: input.url,
      uploadedBy: input.uploadedBy,
    },
  });
}

/* ---------------- Marketplace ---------------- */

/** Fix seed listings that still point at mismatched covers. */
async function backfillMarketplaceListingImages(): Promise<void> {
  const rows = await prisma.listing.findMany({
    select: { id: true, title: true, imageUrl: true },
  });
  for (const row of rows) {
    const desired = MARKETPLACE_SEED_IMAGES[row.title];
    if (!desired || row.imageUrl === desired) continue;
    await prisma.listing.update({
      where: { id: row.id },
      data: { imageUrl: desired },
    });
  }
}

/**
 * Production-safe: rewrite listings / apparel products that still use another
 * club's crest (e.g. Heron Creek polo pointing at bb-apparel-*).
 * At most once per server instance — never on every API/page request.
 */
let apparelBackfillDone = false;

export async function backfillTenantApparelImageUrls(): Promise<void> {
  if (apparelBackfillDone) return;
  apparelBackfillDone = true;

  const listings = await prisma.listing.findMany({
    select: { id: true, imageUrl: true },
  });
  const listingUpdates = listings
    .map((row) => {
      const next = rewriteTenantApparelImageUrl(row.id, row.imageUrl);
      if (!next || next === row.imageUrl) return null;
      return prisma.listing.update({
        where: { id: row.id },
        data: { imageUrl: next },
      });
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const products = await prisma.apparelProduct.findMany({
    select: { id: true, imageUrl: true },
  });
  const productUpdates = products
    .map((row) => {
      const next = rewriteTenantApparelImageUrl(row.id, row.imageUrl);
      if (!next || next === row.imageUrl) return null;
      return prisma.apparelProduct.update({
        where: { id: row.id },
        data: { imageUrl: next },
      });
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const updates = [...listingUpdates, ...productUpdates];
  for (let i = 0; i < updates.length; i += 25) {
    await Promise.all(updates.slice(i, i + 25));
  }
}

export async function listListings(communityId?: string | null) {
  return prisma.listing.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createListing(input: {
  communityId?: string | null;
  title: string;
  description?: string;
  price: number;
  category: string;
  seller: string;
  unit: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}) {
  return prisma.listing.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      description: input.description ?? "",
      price: input.price,
      category: input.category,
      seller: input.seller,
      unit: input.unit,
      imageUrl: input.imageUrl ?? null,
      videoUrl: input.videoUrl ?? null,
    },
  });
}

/* ---------------- Blog ---------------- */

export async function listBlogPosts(communityId?: string | null) {
  return prisma.blogPost.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBlogPost(input: {
  communityId?: string | null;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
}) {
  return prisma.blogPost.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      author: input.author,
      category: input.category,
    },
  });
}

/* ---------------- Group chat ---------------- */

export async function listGroupMessages(groupId: string, communityId?: string | null) {
  return prisma.groupMessage.findMany({
    where: { groupId, communityId: scope(communityId) },
    orderBy: { createdAt: "asc" },
  });
}

export async function createGroupMessage(input: {
  communityId?: string | null;
  groupId: string;
  author: string;
  body: string;
}) {
  return prisma.groupMessage.create({
    data: {
      communityId: scope(input.communityId),
      groupId: input.groupId,
      author: input.author,
      body: input.body,
    },
  });
}

/* ---------------- Rentals ---------------- */

export async function listRentalsForMember(email: string) {
  return prisma.rental.findMany({
    where: { memberEmail: email },
    orderBy: { createdAt: "desc" },
  });
}

function findRentalCatalogItem(itemId: string): RentalItem | undefined {
  return (
    ironLakeGolfClubRentals.find((i) => i.id === itemId) ??
    rentalItems.find((i) => i.id === itemId)
  );
}

export async function getRentalFlexAvailability(input: {
  communityId?: string | null;
  itemId: string;
  startDate: string;
  days: number;
}): Promise<FlexAvailability[] | null> {
  const catalog = findRentalCatalogItem(input.itemId);
  if (!catalog?.flexOptions?.length) return null;

  const startDate = input.startDate || todayIsoDate();
  const days = Math.max(1, Math.floor(input.days || 1));
  const endDate = rentalEndDate(startDate, days);
  const communityId = scope(input.communityId);

  const rows = await prisma.rental.findMany({
    where: {
      communityId,
      itemId: input.itemId,
      status: { notIn: ["cancelled", "returned"] },
      flex: { not: null },
    },
  });

  const reservedByFlex: Record<string, number> = {};
  for (const flex of catalog.flexOptions.map((o) => o.flex)) {
    const forFlex = rows.filter((r) => r.flex === flex);
    reservedByFlex[flex] = countOverlappingFlexRentals(forFlex, startDate, endDate);
  }

  return computeFlexAvailability(catalog.flexOptions, reservedByFlex);
}

export async function createRental(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
  item: string;
  days: number;
  total: number;
  itemId?: string | null;
  flex?: string | null;
  startDate?: string | null;
}) {
  const communityId = scope(input.communityId);
  const days = Math.max(1, Math.floor(input.days || 1));
  const startDate = input.startDate?.trim() || todayIsoDate();
  const endDate = rentalEndDate(startDate, days);
  const itemId = input.itemId?.trim() || null;
  let flex: string | null = input.flex?.trim() || null;

  const catalog = itemId ? findRentalCatalogItem(itemId) : undefined;
  if (catalog?.flexOptions?.length) {
    if (!flex || !isGolfClubFlex(flex)) {
      throw new RentalConflictError("Please choose a shaft flex for this rental.");
    }
    const capacity = inventoryForFlex(catalog.flexOptions, flex);
    if (capacity == null) {
      throw new RentalConflictError("That shaft flex is not offered for this rental.");
    }
    const existing = await prisma.rental.findMany({
      where: {
        communityId,
        itemId,
        flex,
        status: { notIn: ["cancelled", "returned"] },
      },
    });
    const reserved = countOverlappingFlexRentals(existing, startDate, endDate);
    if (reserved >= capacity) {
      throw new RentalConflictError(
        `All ${capacity} ${flex} flex set${capacity === 1 ? "" : "s"} are rented for those dates.`,
      );
    }
  } else if (flex && !isGolfClubFlex(flex)) {
    flex = null;
  }

  const displayItem =
    catalog && flex
      ? `${catalog.name} — ${flex as GolfClubFlex} flex`
      : input.item;

  return prisma.rental.create({
    data: {
      communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      item: displayItem,
      itemId,
      flex,
      startDate,
      endDate,
      days,
      total: input.total,
      status: "reserved",
    },
  });
}

/* ---------------- Dining orders ---------------- */

export async function listOrdersForMember(email: string) {
  return prisma.diningOrder.findMany({
    where: { memberEmail: email },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderForMember(id: string, email: string) {
  return prisma.diningOrder.findFirst({
    where: { id, memberEmail: email },
  });
}

export async function createOrder(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
  items: string;
  total: number;
  fulfillment: string;
  address?: string | null;
  restaurant?: string | null;
  arriveDate?: string | null;
  arriveTime?: string | null;
  partySize?: number | null;
  itemCount?: number;
}) {
  const communityId = scope(input.communityId);
  const fulfillment = normalizeDiningFulfillment(input.fulfillment);

  if (fulfillment === "delivery" && !input.address?.trim()) {
    throw new Error("Delivery address required");
  }
  if (
    (fulfillment === "eat_in" || fulfillment === "takeout") &&
    (!input.arriveDate || !input.arriveTime)
  ) {
    throw new Error("Arrival date and time required");
  }
  if (fulfillment === "eat_in" && (!input.partySize || input.partySize < 1)) {
    throw new Error("Party size required for eat-in");
  }

  let itemCount = input.itemCount ?? 1;
  try {
    const parsed = JSON.parse(input.items) as unknown;
    if (Array.isArray(parsed)) {
      itemCount = parsed.reduce((sum: number, row: { qty?: number }) => {
        return sum + Math.max(1, Number(row?.qty) || 1);
      }, 0);
    }
  } catch {
    // legacy comma strings
  }

  const arriveDate = input.arriveDate ?? new Date().toISOString().slice(0, 10);
  const arriveTime = input.arriveTime ?? "18:00";
  const { readyBy } = computeReadyBy({
    fulfillment,
    arriveTime,
    itemCount,
    partySize: input.partySize,
    items: (() => {
      try {
        const parsed = JSON.parse(input.items) as DiningLineInput[];
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    })(),
  });

  let reservationId: string | null = null;
  let tableLabel: string | null = null;

  if (fulfillment === "eat_in") {
    const restaurant = input.restaurant?.trim() || "Club restaurant";
    const existing = await prisma.restaurantReservation.count({
      where: {
        communityId,
        restaurant,
        date: arriveDate,
        time: arriveTime,
        status: { not: "cancelled" },
      },
    });
    tableLabel = assignTableLabel({
      existingCount: existing,
      partySize: input.partySize ?? 2,
    });
    const reservation = await prisma.restaurantReservation.create({
      data: {
        communityId,
        memberEmail: input.memberEmail,
        memberName: input.memberName,
        restaurant,
        date: arriveDate,
        time: arriveTime,
        partySize: input.partySize ?? 2,
        tableLabel,
        notes: "Order-ahead eat-in — table held, kitchen timed to arrival",
        status: "confirmed",
      },
    });
    reservationId = reservation.id;
  }

  const order = await prisma.diningOrder.create({
    data: {
      communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      items: input.items,
      total: input.total,
      fulfillment,
      address: fulfillment === "delivery" ? (input.address ?? null) : null,
      restaurant: input.restaurant ?? null,
      arriveDate,
      arriveTime,
      partySize: fulfillment === "eat_in" ? (input.partySize ?? 2) : null,
      reservationId,
      tableLabel,
      readyBy,
      status: fulfillment === "eat_in" ? "Table held · Preparing" : "Preparing",
    },
  });

  if (reservationId) {
    await prisma.restaurantReservation.update({
      where: { id: reservationId },
      data: { orderId: order.id },
    });
  }

  await recordFbSpend({
    communityId,
    memberEmail: input.memberEmail,
    amount: input.total,
  });

  const confirm = diningConfirmationMessage({
    fulfillment,
    restaurant: input.restaurant?.trim() || "Club restaurant",
    arriveDate,
    arriveTime,
    readyBy,
    tableLabel,
    partySize: input.partySize,
  });
  await addMemberInboxItem({
    userEmail: input.memberEmail,
    title:
      fulfillment === "eat_in"
        ? "Eat-in reserved — food timed for arrival"
        : fulfillment === "takeout"
          ? "Takeout order placed"
          : "Delivery order placed",
    body: confirm,
    href: "/member/dining",
  });

  return order;
}

/* ---------------- Club apparel (vendor catalog & orders) ---------------- */

export const APPAREL_VENDOR = "Community Threads Co.";

export interface ApparelLineItem {
  productId: string;
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
}

export async function listApparelProducts(communityId?: string | null) {
  return prisma.apparelProduct.findMany({
    where: { communityId: scope(communityId), active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createApparelProduct(input: {
  communityId?: string | null;
  vendorName?: string;
  name: string;
  description?: string;
  price: number;
  sizes?: string[];
  category?: string;
  imageUrl?: string;
}) {
  return prisma.apparelProduct.create({
    data: {
      communityId: scope(input.communityId),
      vendorName: input.vendorName ?? APPAREL_VENDOR,
      name: input.name,
      description: input.description ?? "",
      price: input.price,
      sizesJson: JSON.stringify(input.sizes ?? ["S", "M", "L", "XL", "XXL"]),
      category: input.category ?? "Polo",
      imageUrl: input.imageUrl ?? null,
    },
  });
}

export async function listApparelOrders(opts: {
  communityId?: string | null;
  orderedByEmail?: string;
}) {
  return prisma.apparelOrder.findMany({
    where: {
      communityId: opts.communityId ? scope(opts.communityId) : undefined,
      orderedByEmail: opts.orderedByEmail,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApparelOrder(input: {
  communityId?: string | null;
  vendorName?: string;
  orderType: "club" | "member";
  orderedByEmail: string;
  orderedByName: string;
  items: ApparelLineItem[];
  notes?: string;
}) {
  const total = input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const order = await prisma.apparelOrder.create({
    data: {
      communityId: scope(input.communityId),
      vendorName: input.vendorName ?? APPAREL_VENDOR,
      orderType: input.orderType,
      orderedByEmail: input.orderedByEmail,
      orderedByName: input.orderedByName,
      itemsJson: JSON.stringify(input.items),
      total,
      notes: input.notes ?? null,
      status: "submitted",
    },
  });
  await logEvent({
    communityId: input.communityId,
    userName: input.orderedByName,
    action: "Apparel order",
    detail: `${input.orderType} order — $${total.toFixed(2)} to ${input.vendorName ?? APPAREL_VENDOR}`,
  });
  return order;
}

export async function updateApparelOrderStatus(id: string, status: string) {
  return prisma.apparelOrder.update({ where: { id }, data: { status } });
}

/* ---------------- Governance surveys & voting ---------------- */

export async function listSurveys(communityId?: string | null) {
  return prisma.survey.findMany({
    where: { communityId: scope(communityId) },
    include: { options: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSurvey(input: {
  communityId?: string | null;
  title: string;
  description: string;
  closes?: string | null;
  options: string[];
}) {
  return prisma.survey.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      description: input.description,
      closes: input.closes ?? null,
      options: { create: input.options.map((label) => ({ label })) },
    },
    include: { options: true },
  });
}

export async function castVote(input: {
  surveyId: string;
  optionId: string;
  voterEmail: string;
}): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.surveyVote.findUnique({
    where: { surveyId_voterEmail: { surveyId: input.surveyId, voterEmail: input.voterEmail } },
  });
  if (existing) return { ok: false, error: "You have already voted on this survey" };
  await prisma.$transaction([
    prisma.surveyVote.create({
      data: { surveyId: input.surveyId, optionId: input.optionId, voterEmail: input.voterEmail },
    }),
    prisma.surveyOption.update({
      where: { id: input.optionId },
      data: { votes: { increment: 1 } },
    }),
  ]);
  return { ok: true };
}

export async function getVotedSurveyIds(voterEmail: string): Promise<string[]> {
  const votes = await prisma.surveyVote.findMany({ where: { voterEmail } });
  return votes.map((v) => v.surveyId);
}

/* ---------------- Access logs (activity) ---------------- */

export async function logEvent(input: {
  communityId?: string | null;
  userName: string;
  action: string;
  detail: string;
}) {
  try {
    await prisma.accessLog.create({
      data: {
        communityId: input.communityId ?? null,
        userName: input.userName,
        action: input.action,
        detail: input.detail,
      },
    });
  } catch {
    // logging must never break the request
  }
}

export async function listAccessLogs(communityId?: string | null) {
  return prisma.accessLog.findMany({
    where: communityId ? { OR: [{ communityId }, { communityId: null }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/* ---------------- Profile: vehicles & pets ---------------- */

export async function listVehicles(userId: string) {
  return prisma.vehicle.findMany({ where: { userId } });
}

export async function createVehicle(input: {
  userId: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  year?: number | null;
  ownerName?: string;
  registrationUrl?: string | null;
  insuranceUrl?: string | null;
  govIdUrl?: string | null;
  verificationStatus?: string;
  verificationJson?: string;
  verifiedAt?: Date | null;
}) {
  return prisma.vehicle.create({
    data: {
      userId: input.userId,
      make: input.make,
      model: input.model,
      color: input.color,
      plate: input.plate,
      year: input.year ?? null,
      ownerName: input.ownerName ?? "",
      registrationUrl: input.registrationUrl ?? null,
      insuranceUrl: input.insuranceUrl ?? null,
      govIdUrl: input.govIdUrl ?? null,
      verificationStatus: input.verificationStatus ?? "pending",
      verificationJson: input.verificationJson ?? "{}",
      verifiedAt: input.verifiedAt ?? null,
    },
  });
}

export async function deleteVehicle(id: string, userId: string) {
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v || v.userId !== userId) return null;
  return prisma.vehicle.delete({ where: { id } });
}

export async function listPets(userId: string) {
  return prisma.pet.findMany({ where: { userId } });
}

export async function createPet(input: {
  userId: string;
  name: string;
  type: string;
  breed: string;
}) {
  return prisma.pet.create({ data: input });
}

export async function deletePet(id: string, userId: string) {
  const p = await prisma.pet.findUnique({ where: { id } });
  if (!p || p.userId !== userId) return null;
  return prisma.pet.delete({ where: { id } });
}

/* ---------------- Amenities ---------------- */

export async function listAmenities(communityId?: string | null) {
  const cid = scope(communityId);
  let rows = await prisma.amenity.findMany({
    where: { communityId: cid },
    orderBy: { name: "asc" },
  });
  if (rows.length === 0 && isFourClubDemoId(cid)) {
    await ensureFourClubDemoContent("full", cid);
    rows = await prisma.amenity.findMany({
      where: { communityId: cid },
      orderBy: { name: "asc" },
    });
  }
  return rows;
}

export async function createAmenity(input: {
  communityId?: string | null;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  kind?: string;
  unitCount?: number;
  holes?: number | null;
  surface?: string | null;
  ownership?: string;
  partnerName?: string | null;
}) {
  const ownership = input.ownership === "external" ? "external" : "club";
  return prisma.amenity.create({
    data: {
      communityId: scope(input.communityId),
      name: input.name,
      description: input.description,
      fee: input.fee,
      schedule: input.schedule,
      kind: input.kind ?? "facility",
      unitCount: input.unitCount ?? 1,
      holes: input.holes ?? null,
      surface: input.surface ?? null,
      ownership,
      partnerName: ownership === "external" ? (input.partnerName ?? null) : null,
      playable: true,
    },
  });
}

export async function setAmenityPlayability(input: {
  amenityId: string;
  playable: boolean;
  reason?: string | null;
  until?: string | null;
  authorName: string;
  communityId?: string | null;
  broadcast?: boolean;
}) {
  const amenity = await prisma.amenity.findUnique({ where: { id: input.amenityId } });
  if (!amenity) return null;

  const updated = await prisma.amenity.update({
    where: { id: input.amenityId },
    data: {
      playable: input.playable,
      unplayableReason: input.playable ? null : (input.reason?.trim() || "Temporarily unavailable"),
      unplayableUntil: input.playable ? null : (input.until?.trim() || null),
    },
  });

  if (input.broadcast !== false && !input.playable) {
    const reason = updated.unplayableReason ?? "Temporarily unavailable";
    const untilNote = updated.unplayableUntil
      ? ` Expected reopen: ${updated.unplayableUntil}.`
      : "";
    const title = `${updated.name} not playable`;
    const body = `${updated.name} is not playable right now. ${reason}.${untilNote}`;
    await createAnnouncement({
      communityId: amenity.communityId,
      title,
      body,
      author: input.authorName,
      priority: "high",
    });

    const users = await prisma.user.findMany({
      where: {
        communityId: amenity.communityId,
        role: { in: ["member", "board", "pm", "admin"] },
      },
      select: { email: true },
      take: 500,
    });
    const emails = [
      ...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean)),
    ];
    await Promise.all(
      emails.map(async (email) => {
        await addMemberInboxItem({
          userEmail: email,
          title,
          body,
          href: "/member/bookings",
        });
        await sendPushToUser(email, {
          title,
          body: reason,
          url: appPath("/member/bookings"),
        });
      }),
    );
  }

  if (input.broadcast !== false && input.playable) {
    await createAnnouncement({
      communityId: amenity.communityId,
      title: `${updated.name} is open again`,
      body: `${updated.name} is playable again.`,
      author: input.authorName,
      priority: "normal",
    });
  }

  return updated;
}

export async function getAmenityAvailability(
  amenityId: string,
  date: string,
  startTime?: string,
  endTime?: string,
) {
  const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
  if (!amenity) return null;

  const bookings = await prisma.booking.findMany({
    where: {
      date,
      status: { not: "cancelled" },
      OR: [{ amenityId: amenity.id }, { amenity: amenity.name, amenityId: null }],
    },
    orderBy: { startTime: "asc" },
  });

  const hours = parseWeeklyHours(amenity.hoursJson);
  const day = dayHoursForDate(hours, date);

  const weather = await loadCommunityWeather(amenity.communityId);
  const rainActive =
    isRainSensitiveAmenity(amenity.kind) &&
    isRainAdvisoryActive(weather, date);
  const rainMessage = rainActive ? rainClosureMessage(amenity.kind) : null;

  const baseWindows = availabilityWindows(bookings, amenity.unitCount, {
    dayStart: day?.open ?? "08:00",
    dayEnd: day?.close ?? "20:00",
    closed: day?.closed ?? [],
  });
  const windows = rainMessage
    ? baseWindows.map((w) => ({
        ...w,
        free: false,
        unitsFree: 0,
        closedReason: rainMessage,
      }))
    : baseWindows;

  if (!startTime || !endTime) {
    return {
      amenity,
      bookings,
      unitCount: amenity.unitCount,
      playable: amenity.playable,
      unplayableReason: amenity.unplayableReason,
      windows,
      closedWindows: day?.closed ?? [],
      weatherAlert: rainMessage,
    };
  }

  const unitsUsed = countOverlappingBookings(bookings, startTime, endTime);
  const capacityFull = unitsUsed >= amenity.unitCount;
  const closedHit = closedWindowForRange(hours, date, startTime, endTime);
  const outsideHours = !isOpenAt(hours, date, startTime, endTime);
  const blockedByRain = Boolean(rainMessage);
  const freeUnits =
    outsideHours || blockedByRain
      ? []
      : listFreeUnitNumbers(
          amenity.unitCount,
          bookings.map((b) => ({
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
            unitNumber: b.unitNumber,
          })),
          startTime,
          endTime,
        );
  const freeSet = new Set(freeUnits);
  const units = Array.from({ length: amenity.unitCount }, (_, i) => {
    const number = i + 1;
    return { number, free: freeSet.has(number) };
  });
  const closedReason = rainMessage
    ? rainMessage
    : closedHit
      ? closedHit.reason?.trim() ||
        `Closed ${closedHit.start}–${closedHit.end}`
      : outsideHours
        ? hoursClosedMessage(hours, date, startTime, endTime)
        : null;
  return {
    amenity,
    unitCount: amenity.unitCount,
    unitsUsed:
      outsideHours || blockedByRain ? amenity.unitCount : unitsUsed,
    unitsFree:
      outsideHours || blockedByRain
        ? 0
        : Math.max(0, amenity.unitCount - unitsUsed),
    units,
    freeUnits,
    playable: amenity.playable,
    unplayableReason: amenity.unplayableReason,
    fullyBooked:
      !amenity.playable ||
      capacityFull ||
      outsideHours ||
      blockedByRain,
    closedReason,
    closedWindows: day?.closed ?? [],
    weatherAlert: rainMessage,
    bookings,
    windows,
  };
}

export async function listBookingInvitesForMember(memberEmail: string) {
  const email = memberEmail.trim().toLowerCase();
  const invites = await prisma.bookingInvite.findMany({
    where: { memberEmail: email, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  if (invites.length === 0) return [];
  const bookingIds = [...new Set(invites.map((i) => i.bookingId))];
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
  });
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const capacityCounts = await Promise.all(
    bookingIds.map(async (bookingId) => {
      const accepted = await prisma.bookingInvite.count({
        where: { bookingId, status: "accepted" },
      });
      return [bookingId, accepted] as const;
    }),
  );
  const acceptedByBooking = new Map(capacityCounts);

  return invites.map((i) => {
    const booking = byId.get(i.bookingId);
    const accepted = acceptedByBooking.get(i.bookingId) ?? 0;
    const cap = booking?.inviteCapacity ?? null;
    const spotsLeft =
      cap == null ? null : Math.max(0, cap - accepted);
    return {
      id: i.id,
      type: "booking" as const,
      status: i.status,
      bookingId: i.bookingId,
      title: booking?.amenity ?? "Activity",
      date: booking?.date ?? "",
      time: booking
        ? `${booking.startTime} – ${booking.endTime}`
        : null,
      location: booking?.amenity ?? "",
      hostName: booking?.memberName ?? "",
      inviteCapacity: cap,
      spotsLeft,
      requirePayment: false,
      feeCents: 0,
    };
  });
}

export async function respondBookingInvite(input: {
  inviteId: string;
  memberEmail: string;
  status: "accepted" | "declined";
}) {
  const email = input.memberEmail.trim().toLowerCase();

  type TxResult =
    | { kind: "ok"; invite: Awaited<ReturnType<typeof prisma.bookingInvite.update>> }
    | { kind: "missing" }
    | { kind: "full"; message: string };

  const result = await prisma.$transaction(async (tx): Promise<TxResult> => {
    const invite = await tx.bookingInvite.findUnique({
      where: { id: input.inviteId },
    });
    if (!invite || invite.memberEmail !== email) return { kind: "missing" };
    if (invite.status !== "pending") {
      return { kind: "ok", invite };
    }

    if (input.status === "declined") {
      return {
        kind: "ok",
        invite: await tx.bookingInvite.update({
          where: { id: input.inviteId },
          data: { status: "declined" },
        }),
      };
    }

    const booking = await tx.booking.findUnique({
      where: { id: invite.bookingId },
    });
    if (!booking) return { kind: "missing" };

    if (booking.inviteCapacity != null && booking.inviteCapacity > 0) {
      const accepted = await tx.bookingInvite.count({
        where: { bookingId: booking.id, status: "accepted" },
      });
      if (accepted >= booking.inviteCapacity) {
        await tx.bookingInvite.update({
          where: { id: input.inviteId },
          data: { status: "full" },
        });
        return {
          kind: "full",
          message: `This reservation is full (${booking.inviteCapacity} spot${booking.inviteCapacity === 1 ? "" : "s"} already taken).`,
        };
      }
    }

    return {
      kind: "ok",
      invite: await tx.bookingInvite.update({
        where: { id: input.inviteId },
        data: { status: "accepted" },
      }),
    };
  });

  if (result.kind === "missing") return null;
  if (result.kind === "full") {
    throw new BookingInviteFullError(result.message);
  }
  return result.invite;
}

export async function deleteAmenity(id: string) {
  return prisma.amenity.delete({ where: { id } });
}

/** Partner / external activities (jet skis, boats) for communities that already have amenity seed. */
async function ensureExternalActivityAmenities(communityId: string) {
  const externals = [
    {
      name: "Jet Ski Rental",
      description:
        "Partner-operated jet skis on Lake Weir — book a slot and invite friends (spots fill first-come).",
      fee: 85,
      schedule: "Daily 9AM – 6PM",
      kind: "facility",
      unitCount: 4,
      ownership: "external",
      partnerName: "Lake Weir Watersports",
    },
    {
      name: "Boat Rental",
      description:
        "Partner pontoon and ski boats — not club-owned. Cap your party when you invite members.",
      fee: 220,
      schedule: "Daily 8AM – 5PM",
      kind: "facility",
      unitCount: 2,
      ownership: "external",
      partnerName: "Silver Springs Boat Co.",
    },
  ] as const;

  for (const row of externals) {
    const existing = await prisma.amenity.findFirst({
      where: { communityId, name: row.name },
    });
    if (existing) continue;
    await prisma.amenity.create({
      data: {
        communityId,
        ...row,
        playable: true,
      },
    });
  }
}

/* ---------------- Provider menu ---------------- */

export async function listMenuItems(providerEmail: string) {
  return prisma.menuItem.findMany({
    where: { providerEmail },
    orderBy: { name: "asc" },
  });
}

export async function createMenuItem(input: {
  providerEmail: string;
  name: string;
  price: number;
  category: string;
}) {
  return prisma.menuItem.create({ data: { ...input, available: true } });
}

export async function toggleMenuItem(id: string, providerEmail: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item || item.providerEmail !== providerEmail) return null;
  return prisma.menuItem.update({ where: { id }, data: { available: !item.available } });
}

export async function deleteMenuItem(id: string, providerEmail: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item || item.providerEmail !== providerEmail) return null;
  return prisma.menuItem.delete({ where: { id } });
}

/* ---------------- Financial reports ---------------- */

export interface LedgerRow {
  id: string;
  description: string;
  type: "revenue" | "commission" | "payout";
  amount: number;
  date: string;
}

export async function getFinancialReport(communityId?: string | null) {
  const cid = scope(communityId);
  const [invoices, bookings, amenities, diningOrders, memberCharges] = await Promise.all([
    prisma.invoice.findMany({ where: { communityId: cid }, orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({ where: { communityId: cid }, orderBy: { createdAt: "desc" } }),
    prisma.amenity.findMany({ where: { communityId: cid } }),
    prisma.diningOrder.findMany({ where: { communityId: cid }, orderBy: { createdAt: "desc" } }),
    prisma.memberCharge.findMany({ where: { communityId: cid, status: "paid" }, orderBy: { createdAt: "desc" } }),
  ]);

  const feeByAmenity = new Map(amenities.map((a) => [a.name, a.fee]));
  const ledger: LedgerRow[] = [];

  for (const inv of invoices) {
    const date = inv.createdAt.toISOString().slice(0, 10);
    if (inv.status === "paid") {
      ledger.push({
        id: `inv-${inv.id}`,
        description: `${inv.vendor} — ${inv.description}`,
        type: "payout",
        amount: inv.amount,
        date,
      });
    }
    ledger.push({
      id: `rev-${inv.id}`,
      description: inv.status === "paid" ? `Paid: ${inv.description}` : `Pending: ${inv.description}`,
      type: "revenue",
      amount: inv.amount,
      date,
    });
  }

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const fee = feeByAmenity.get(b.amenity) ?? 0;
    if (fee <= 0) continue;
    ledger.push({
      id: `bk-${b.id}`,
      description: `Amenity fee — ${b.amenity}`,
      type: "revenue",
      amount: fee,
      date: b.date,
    });
  }

  for (const o of diningOrders) {
    if (o.status === "cancelled") continue;
    ledger.push({
      id: `ord-${o.id}`,
      description: `Dining order — ${o.memberName}`,
      type: "revenue",
      amount: o.total,
      date: o.createdAt.toISOString().slice(0, 10),
    });
  }

  for (const c of memberCharges) {
    ledger.push({
      id: `mc-${c.id}`,
      description: c.description,
      type: "revenue",
      amount: c.amount,
      date: c.createdAt.toISOString().slice(0, 10),
    });
  }

  const serviceRevenue = ledger
    .filter((l) => l.type === "revenue" && !l.description.startsWith("Pending"))
    .reduce((s, l) => s + l.amount, 0);
  const commission = Math.round(serviceRevenue * 0.1 * 100) / 100;
  if (commission > 0) {
    ledger.unshift({
      id: "commission",
      description: "Platform commission (10%)",
      type: "commission",
      amount: commission,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  ledger.sort((a, b) => b.date.localeCompare(a.date));

  const revenue = ledger.filter((l) => l.type === "revenue").reduce((s, l) => s + l.amount, 0);
  const payouts = ledger.filter((l) => l.type === "payout").reduce((s, l) => s + l.amount, 0);

  return { revenue, commission, payouts, ledger };
}

/* ---------------- Tournaments ---------------- */

const DEMO_TENNIS_SEEDS_BY_COMMUNITY: Record<string, string[]> = {
  "golden-ocala": [
    "L. Clarizio", "G. Sherman", "M. Carter", "E. Chen",
    "J. Graffagnino", "B. Dawson", "K. Carter", "E. Bonfiglio",
  ],
  "willow-creek": [
    "P. Nair", "R. Clouse", "S. Ferguson", "C. DeClose",
    "M. McDowell", "E. Bonfiglio", "B. Dawson", "K. Carter",
  ],
  "harbor-pointe": [
    "O. Reed", "M. Lane", "G. Sherman", "M. Carter",
    "J. Graffagnino", "E. Chen", "R. Clouse", "S. Ferguson",
  ],
};

const GENERIC_TENNIS_SEEDS = [
  "A. Rivera", "M. Chen", "J. Patel", "L. Brooks",
  "S. Nguyen", "T. Walsh", "K. Ortiz", "R. Kim",
];

function demoTennisSeeds(communityId: string): string[] {
  return DEMO_TENNIS_SEEDS_BY_COMMUNITY[communityId] ?? GENERIC_TENNIS_SEEDS;
}

function demoQuarterfinalWinners(
  tournamentId: string,
  seeds: string[],
): Record<string, string> {
  return {
    [`${tournamentId}-r0-m0`]: seeds[0],
    [`${tournamentId}-r0-m1`]: seeds[3],
    [`${tournamentId}-r0-m2`]: seeds[5],
    [`${tournamentId}-r0-m3`]: seeds[6],
  };
}

function demoTournamentScores(tournamentId: string): TournamentScoresData {
  const matches: TournamentScoresData["matches"] = {};
  matches[`${tournamentId}-r0-m0`] = {
    sets: { p1: ["6", "6", ""], p2: ["4", "3", ""] },
    score: "6-4, 6-3",
  };
  matches[`${tournamentId}-r0-m1`] = {
    sets: { p1: ["4", "6", ""], p2: ["6", "4", ""] },
    score: "4-6, 6-4",
  };
  matches[`${tournamentId}-r0-m2`] = {
    sets: { p1: ["7", "6", ""], p2: ["5", "4", ""] },
    score: "7-5, 6-4",
  };
  matches[`${tournamentId}-r0-m3`] = {
    sets: { p1: ["6", "3", ""], p2: ["2", "6", ""] },
    score: "6-2, 3-6",
  };
  return { matches, leaderboard: {} };
}

async function backfillTournamentPlayersFromSeeds(): Promise<void> {
  const tournaments = await prisma.tournament.findMany({
    where: { seedsJson: { not: null } },
    include: { players: true },
  });
  for (const t of tournaments) {
    if (t.players.length > 0) continue;
    const seeds = JSON.parse(t.seedsJson!) as string[];
    await prisma.tournamentPlayer.createMany({
      data: seeds
        .filter((name) => name && !name.startsWith("BYE"))
        .map((name) => ({
          tournamentId: t.id,
          name,
          paid: true,
        })),
    });
  }
}

async function backfillDemoTournamentScores(): Promise<void> {
  const tournaments = await prisma.tournament.findMany({
    where: {
      sport: "Tennis",
      seedsJson: { not: null },
      // IronCrest seed owns its own bracket schedule — don't auto-fill QF winners.
      communityId: { not: "iron-lake" },
    },
  });
  for (const t of tournaments) {
    const scores = parseScoresJson(t.scoresJson);
    if (Object.keys(scores.matches).length > 0) continue;
    const seeds = JSON.parse(t.seedsJson!) as string[];
    const winners = JSON.parse(t.winnersJson) as Record<string, string>;
    const hasWinners = Object.keys(winners).length > 0;
    const demoScores = demoTournamentScores(t.id);
    await prisma.tournament.update({
      where: { id: t.id },
      data: {
        scoresJson: JSON.stringify(demoScores),
        winnersJson: hasWinners
          ? t.winnersJson
          : JSON.stringify(demoQuarterfinalWinners(t.id, seeds)),
      },
    });
  }
}

async function ensureDemoTournamentsForCommunity(communityId: string): Promise<void> {
  // HOA /go demos (not Spanish Wells golf club) should never plant a golf scramble.
  const hoaDemoIds = new Set(["harbor-pointe", "willow-creek", "alliant"]);
  if (hoaDemoIds.has(communityId)) {
    await prisma.tournament.deleteMany({
      where: {
        communityId,
        sport: "Golf",
        title: "Member Golf Scramble",
      },
    });
  }

  const count = await prisma.tournament.count({ where: { communityId } });
  if (count > 0) return;

  const seeds = demoTennisSeeds(communityId);
  const tennis = await prisma.tournament.create({
    data: {
      communityId,
      title: "Summer Tennis Open",
      sport: "Tennis",
      courtSurface: "green_clay",
      date: "2026-07-11",
      startTime: "09:00",
      scoringFormat: "Standard",
      eventType: "Singles",
      entryFee: 25,
      participants: 8,
      seedsJson: JSON.stringify(seeds),
      winnersJson: "{}",
    },
  });
  await prisma.tournament.update({
    where: { id: tennis.id },
    data: {
      winnersJson: JSON.stringify(demoQuarterfinalWinners(tennis.id, seeds)),
      scoresJson: JSON.stringify(demoTournamentScores(tennis.id)),
    },
  });
  await prisma.tournamentPlayer.createMany({
    data: seeds
      .filter((name) => name && !name.startsWith("BYE"))
      .map((name) => ({ tournamentId: tennis.id, name, paid: true })),
  });

  if (hoaDemoIds.has(communityId)) return;

  await prisma.tournament.create({
    data: {
      communityId,
      title: "Member Golf Scramble",
      sport: "Golf",
      date: "2026-08-02",
      startTime: "08:00",
      entryFee: 40,
      participants: 18,
      seedsJson: null,
      winnersJson: "{}",
    },
  });
}

async function backfillDemoTournaments(): Promise<void> {
  const communities = await prisma.community.findMany({ select: { id: true } });
  for (const { id: communityId } of communities) {
    await ensureDemoTournamentsForCommunity(communityId);
  }
}

export async function listTournaments(communityId?: string | null) {
  const cid = scope(communityId);
  let rows = await prisma.tournament.findMany({
    where: { communityId: cid },
    include: { players: { orderBy: { createdAt: "asc" } } },
    orderBy: { date: "asc" },
  });
  if (rows.length === 0) {
    if (isFourClubDemoId(cid)) {
      await ensureFourClubDemoContent("full", cid);
    }
    await ensureDemoTournamentsForCommunity(cid);
    rows = await prisma.tournament.findMany({
      where: { communityId: cid },
      include: { players: { orderBy: { createdAt: "asc" } } },
      orderBy: { date: "asc" },
    });
  }
  return rows;
}

export async function createTournament(input: {
  communityId?: string | null;
  title: string;
  sport: string;
  date: string;
  startTime?: string;
  entryFee?: number;
  participants: number;
  scoringFormat?: string;
  eventType?: string;
  courtSurface?: string | null;
  tiebreakers?: TiebreakerCriterion[];
  noStartDefault?: NoStartDefault;
}) {
  const tiebreakers = input.tiebreakers?.length
    ? input.tiebreakers
    : DEFAULT_TIEBREAKERS;
  return prisma.tournament.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      sport: input.sport,
      courtSurface: input.courtSurface ?? null,
      date: input.date,
      startTime: input.startTime ?? null,
      entryFee: input.entryFee ?? 25,
      participants: input.participants,
      scoringFormat: input.scoringFormat ?? "Standard",
      eventType: input.eventType ?? "Singles",
      format: "Single elimination",
      seedsJson: null,
      winnersJson: "{}",
      scheduleJson: "{}",
      scoresJson: "{}",
      tiebreakersJson: serializeTiebreakers(tiebreakers),
      noStartDefault: input.noStartDefault ?? DEFAULT_NO_START_POLICY,
    },
    include: { players: true },
  });
}

export async function updateTournament(
  id: string,
  data: {
    seedsJson?: string | null;
    winnersJson?: string;
    scheduleJson?: string;
    scoresJson?: string;
    participants?: number;
  },
) {
  return prisma.tournament.update({ where: { id }, data });
}

export async function resyncTournamentSchedule(
  tournamentId: string,
  winners: Record<string, string>,
) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament?.seedsJson) return null;
  const seeds = JSON.parse(tournament.seedsJson) as string[];
  const schedule = await scheduleTournamentMatches({
    tournamentId,
    communityId: tournament.communityId,
    sport: tournament.sport,
    courtSurface: tournament.courtSurface,
    date: tournament.date,
    startTime: tournament.startTime ?? "09:00",
    seeds,
    winners,
    preserveExisting: true,
    existingScheduleJson: tournament.scheduleJson,
  });
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      scheduleJson: JSON.stringify(schedule),
      winnersJson: JSON.stringify(winners),
    },
    include: { players: true },
  }).then(async (updated) => {
    const courtBookings = await syncTournamentCourtBookings(tournamentId);
    return { updated, courtBookings };
  });
}

export async function listTournamentPlayers(tournamentId: string) {
  return prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    orderBy: [{ utrRating: "desc" }, { name: "asc" }],
  });
}

export async function addTournamentPlayer(
  tournamentId: string,
  input: {
    name: string;
    memberEmail?: string;
    ustaRating?: string;
    utrRating?: number;
    handicap?: number;
    partnerName?: string;
    partnerEmail?: string;
    paid?: boolean;
  },
) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new Error("Tournament not found");

  let chargeId: string | null = null;
  if (tournament.entryFee > 0) {
    const charge = await createMemberCharge({
      communityId: tournament.communityId,
      memberEmail: input.memberEmail ?? null,
      memberName: input.name,
      category: "tournament",
      description: `${tournament.title} — entry fee`,
      amount: tournament.entryFee,
      status: input.paid ? "paid" : "due",
      dueDate: tournament.date,
      referenceType: "tournament_player",
      referenceId: tournamentId,
    });
    chargeId = charge.id;
    await logEvent({
      communityId: tournament.communityId,
      userName: input.name,
      action: "Tournament",
      detail: `Entry fee $${tournament.entryFee} — ${input.paid ? "paid" : "due"}`,
    });
  }

  const player = await prisma.tournamentPlayer.create({
    data: {
      tournamentId,
      name: input.name,
      memberEmail: input.memberEmail ?? null,
      ustaRating: input.ustaRating ?? null,
      utrRating: input.utrRating ?? null,
      handicap: input.handicap ?? null,
      partnerName: input.partnerName ?? null,
      partnerEmail: input.partnerEmail?.trim().toLowerCase() || null,
      paid: input.paid ?? false,
      chargeId,
    },
  });
  return player;
}

export async function removeTournamentPlayer(id: string) {
  const player = await prisma.tournamentPlayer.findUnique({ where: { id } });
  if (!player) return false;
  await prisma.tournamentPlayer.delete({ where: { id } });
  return true;
}

function displayName(
  player: { name: string; partnerName: string | null },
  eventType: string,
): string {
  if (eventType !== "Singles" && player.partnerName) {
    return `${player.name} / ${player.partnerName}`;
  }
  return player.name;
}

export async function buildBracketFromPlayers(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!tournament || tournament.players.length < 2) return null;

  const seededPlayers = sortPlayersForSeeding(tournament.sport, tournament.players);
  const seeds = seededPlayers.map((p) => displayName(p, tournament.eventType));
  const size = Math.min(16, Math.max(2, 2 ** Math.floor(Math.log2(seeds.length))));
  const bracketSeeds = seeds.slice(0, size);
  while (bracketSeeds.length < size) {
    bracketSeeds.push(`BYE ${bracketSeeds.length + 1}`);
  }

  const smartSchedule = await scheduleTournamentMatches({
    tournamentId,
    communityId: tournament.communityId,
    sport: tournament.sport,
    courtSurface: tournament.courtSurface,
    date: tournament.date,
    startTime: tournament.startTime ?? "09:00",
    seeds: bracketSeeds,
    winners: {},
  });

  return prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      seedsJson: JSON.stringify(bracketSeeds),
      winnersJson: "{}",
      scheduleJson: JSON.stringify(smartSchedule),
      scoresJson: "{}",
    },
    include: { players: true },
  }).then(async (updated) => {
    await syncTournamentCourtBookings(tournamentId);
    return updated;
  });
}

/* ---------------- Content templates ---------------- */

export async function listTemplates() {
  return prisma.contentTemplate.findMany({ orderBy: { name: "asc" } });
}

export async function createTemplate(input: { name: string; channel: string; subject: string }) {
  return prisma.contentTemplate.create({ data: input });
}

/* ---------------- Rewards ---------------- */

export const REWARD_PERKS = [
  { id: "pk1", label: "10% off amenity fees", cost: 500 },
  { id: "pk2", label: "Free clubhouse hour", cost: 800 },
  { id: "pk3", label: "Priority booking window", cost: 1200 },
] as const;

const TIER_THRESHOLDS = [
  { tier: "Platinum", min: 1500 },
  { tier: "Gold", min: 1000 },
  { tier: "Silver", min: 500 },
  { tier: "Bronze", min: 0 },
];

function tierForPoints(points: number) {
  return [...TIER_THRESHOLDS].sort((a, b) => b.min - a.min).find((t) => points >= t.min)?.tier ?? "Bronze";
}

function nextTierInfo(points: number) {
  const sorted = [...TIER_THRESHOLDS].sort((a, b) => a.min - b.min);
  const next = sorted.find((t) => t.min > points);
  if (!next) return { nextTier: "Platinum", toNext: 0 };
  return { nextTier: next.tier, toNext: next.min - points };
}

export async function getRewardAccount(userEmail: string) {
  let account = await prisma.rewardAccount.findUnique({ where: { userEmail } });
  if (!account) {
    account = await prisma.rewardAccount.create({
      data: { userEmail, points: 1240, tier: "Gold" },
    });
    await prisma.rewardTransaction.createMany({
      data: [
        { userEmail, label: "Online dues payment", points: 50 },
        { userEmail, label: "Booked Clubhouse", points: 75 },
        { userEmail, label: "Referred a neighbor", points: 200 },
      ],
    });
  }
  const history = await prisma.rewardTransaction.findMany({
    where: { userEmail },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const { nextTier, toNext } = nextTierInfo(account.points);
  return {
    points: account.points,
    tier: tierForPoints(account.points),
    nextTier,
    toNext: Math.max(0, toNext),
    history,
    perks: REWARD_PERKS,
  };
}

export async function redeemReward(userEmail: string, perkId: string) {
  const perk = REWARD_PERKS.find((p) => p.id === perkId);
  if (!perk) return { error: "Invalid perk" as const };
  const account = await prisma.rewardAccount.findUnique({ where: { userEmail } });
  if (!account || account.points < perk.cost) return { error: "Insufficient points" as const };
  const newPoints = account.points - perk.cost;
  await prisma.$transaction([
    prisma.rewardAccount.update({
      where: { userEmail },
      data: { points: newPoints, tier: tierForPoints(newPoints) },
    }),
    prisma.rewardTransaction.create({
      data: { userEmail, label: `Redeemed: ${perk.label}`, points: -perk.cost },
    }),
  ]);
  return { ok: true as const, points: newPoints };
}

/* ---------------- PM check-ins & registrations ---------------- */

export async function listCheckins(communityId?: string | null) {
  return prisma.checkin.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCheckin(input: {
  communityId?: string | null;
  name: string;
  type: string;
  host: string;
  unit?: string;
  photoUrl?: string;
  status?: string;
}) {
  return prisma.checkin.create({
    data: {
      communityId: scope(input.communityId),
      name: input.name,
      type: input.type,
      host: input.host,
      unit: input.unit ?? "—",
      status: input.status ?? "checked_in",
      photoUrl: input.photoUrl,
    },
  });
}

export async function updateCheckinStatus(id: string, status: string) {
  return prisma.checkin.update({ where: { id }, data: { status } });
}

export async function listRegistrations(communityId?: string | null) {
  return prisma.registrationChecklist.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { resident: "asc" },
  });
}

export async function updateRegistration(
  id: string,
  field: "vehicle" | "pet" | "fingerprint",
  value: boolean,
) {
  return prisma.registrationChecklist.update({
    where: { id },
    data: { [field]: value },
  });
}

/* ---------------- Provider promotions ---------------- */

/** Price to appear on the member home Featured row (cents). */
export const FEATURED_PLACEMENT_CENTS = 4900;

export async function listPromotions(providerEmail: string) {
  return prisma.promotion.findMany({
    where: { providerEmail },
    orderBy: { title: "asc" },
  });
}

export async function createPromotion(input: {
  providerEmail: string;
  communityId?: string | null;
  title: string;
  type: string;
  detail: string;
  status?: string;
  imageUrl?: string | null;
  href?: string | null;
  subtitle?: string | null;
  rating?: string | null;
  priceLabel?: string | null;
  /** Featured placements must be paid — defaults to FEATURED_PLACEMENT_CENTS when type is featured. */
  paidCents?: number;
}) {
  const isFeatured = input.type === "featured";
  const paidCents = isFeatured
    ? input.paidCents && input.paidCents > 0
      ? input.paidCents
      : FEATURED_PLACEMENT_CENTS
    : (input.paidCents ?? 0);

  return prisma.promotion.create({
    data: {
      providerEmail: input.providerEmail,
      communityId: input.communityId ?? null,
      title: input.title,
      type: input.type,
      detail: input.detail,
      status: input.status ?? "active",
      redemptions: 0,
      imageUrl: input.imageUrl || null,
      href: input.href || null,
      subtitle: input.subtitle || null,
      rating: input.rating || null,
      priceLabel: input.priceLabel || null,
      paidCents,
    },
  });
}

export type PaidFeaturedTile = {
  key: string;
  label: string;
  sub: string;
  rating: string;
  price: string;
  image: string;
  href: string;
  sponsored: true;
};

/** Only paid featured placements (paidCents > 0) appear on member home. */
export async function listPaidFeaturedTiles(
  communityId: string,
): Promise<PaidFeaturedTile[]> {
  const rows = await prisma.promotion.findMany({
    where: {
      type: "featured",
      status: "active",
      paidCents: { gt: 0 },
      communityId,
    },
    orderBy: { title: "asc" },
    take: 12,
  });

  return rows.map((row) => ({
    key: row.id,
    label: row.title,
    sub: row.subtitle || row.detail,
    rating: row.rating || "4.5",
    price: row.priceLabel || "$$",
    image: row.imageUrl || brandAssets.featuredDining,
    href: row.href || "/member/dining",
    sponsored: true as const,
  }));
}

/** Demo seed: convert static featured tiles into paid placements so demos stay non-empty. */
export async function ensureDemoPaidFeatured(communityId: string): Promise<void> {
  if (!isDemoSeedAllowed()) return;

  const tiles =
    communityId === "heritage-bay"
      ? heritageBayFeaturedTiles
      : communityId === "spanish-wells"
        ? spanishWellsFeaturedTiles
        : isFourClubDemoId(communityId)
          ? genericClubFeaturedTiles
          : homeFeaturedTiles;

  const featuredDomain = `${communityId.replace(/-/g, "")}.demo`;
  const providerEmail = `featured.${communityId}@${featuredDomain}`;

  await prisma.promotion.updateMany({
    where: {
      communityId,
      type: "featured",
      providerEmail: { endsWith: "@demo.easylife" },
    },
    data: { providerEmail },
  });

  const existing = await prisma.promotion.findMany({
    where: { type: "featured", communityId, paidCents: { gt: 0 } },
    select: { id: true, title: true },
  });

  // Spanish Wells warm DBs may still have generic dining+tennis — rebuild to include golf.
  if (communityId === "spanish-wells") {
    const want = new Set<string>(tiles.map((t) => t.label));
    const hasGolf = existing.some((r) => /golf|championship|course/i.test(r.title));
    const titlesMatch =
      existing.length === tiles.length && existing.every((r) => want.has(r.title));
    if (existing.length > 0 && (!hasGolf || !titlesMatch)) {
      await prisma.promotion.deleteMany({
        where: { type: "featured", communityId, paidCents: { gt: 0 } },
      });
    } else if (existing.length > 0) {
      return;
    }
  } else if (existing.length > 0) {
    return;
  }

  await prisma.promotion.createMany({
    data: tiles.map((tile) => ({
      providerEmail,
      communityId,
      title: tile.label,
      type: "featured",
      detail: "Paid featured placement",
      status: "active",
      redemptions: 0,
      imageUrl: tile.image,
      href: tile.href,
      subtitle: tile.sub,
      rating: tile.rating,
      priceLabel: tile.price,
      paidCents: FEATURED_PLACEMENT_CENTS,
    })),
  });
}

/* ---------------- Roles matrix ---------------- */

const DEFAULT_ROLE_MATRIX: Record<string, string[]> = {
  "View directory": ["Member", "Board", "Property Mgr", "Provider", "Admin"],
  "Book amenities": ["Member", "Board", "Admin"],
  "Pay dues": ["Member", "Board", "Admin"],
  "Manage documents": ["Board", "Property Mgr", "Admin"],
  "Approve invoices": ["Board", "Admin"],
  "Manage communities": ["Admin"],
  "Manage users & roles": ["Admin"],
  "View financial reports": ["Board", "Admin"],
  "Front desk check-in": ["Property Mgr", "Admin"],
};

export async function getRoleMatrix(): Promise<Record<string, string[]>> {
  const rows = await prisma.rolePermission.findMany();
  if (rows.length === 0) return DEFAULT_ROLE_MATRIX;
  const matrix: Record<string, string[]> = {};
  for (const row of rows) {
    matrix[row.permission] = JSON.parse(row.rolesJson) as string[];
  }
  return matrix;
}

export async function saveRoleMatrix(matrix: Record<string, string[]>) {
  await prisma.$transaction(
    Object.entries(matrix).map(([permission, roles]) =>
      prisma.rolePermission.upsert({
        where: { permission },
        create: { permission, rolesJson: JSON.stringify(roles) },
        update: { rolesJson: JSON.stringify(roles) },
      }),
    ),
  );
}

/* ---------------- Help desk & contact ---------------- */

export async function createHelpTicket(input: {
  communityId?: string | null;
  userName: string;
  email: string;
  subject: string;
  priority?: string;
  message: string;
}) {
  return prisma.helpTicket.create({
    data: {
      communityId: input.communityId ?? null,
      userName: input.userName,
      email: input.email,
      subject: input.subject,
      priority: input.priority ?? "Medium",
      message: input.message,
    },
  });
}

export async function listHelpTickets(communityId?: string | null) {
  return prisma.helpTicket.findMany({
    where: communityId ? { OR: [{ communityId }, { communityId: null }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createContactMessage(input: {
  communityId?: string | null;
  senderName: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  message: string;
}) {
  return prisma.contactMessage.create({
    data: {
      communityId: scope(input.communityId),
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      recipient: input.recipient,
      subject: input.subject,
      message: input.message,
    },
  });
}

export async function listContactMessagesForProvider(recipient: string) {
  return prisma.contactMessage.findMany({
    where: { recipient: { equals: recipient } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listContactMessagesForProviderInbox(providerEmail: string) {
  return prisma.contactMessage.findMany({
    where: {
      OR: [
        { recipient: { equals: providerEmail } },
        { senderEmail: { equals: providerEmail } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function markContactMessageRead(id: string, recipient: string) {
  const row = await prisma.contactMessage.findFirst({
    where: {
      id,
      recipient: { equals: recipient },
    },
    select: { id: true, status: true },
  });
  if (!row || row.status === "read") return row;
  return prisma.contactMessage.update({
    where: { id },
    data: { status: "read" },
  });
}

export async function markContactThreadRead(
  providerEmail: string,
  messageIds: string[],
) {
  if (messageIds.length === 0) return { count: 0 };
  return prisma.contactMessage.updateMany({
    where: {
      id: { in: messageIds },
      recipient: { equals: providerEmail },
      status: "delivered",
    },
    data: { status: "read" },
  });
}

export async function markContactThreadUnread(
  providerEmail: string,
  messageIds: string[],
) {
  if (messageIds.length === 0) return { count: 0 };
  return prisma.contactMessage.updateMany({
    where: {
      id: { in: messageIds },
      recipient: { equals: providerEmail },
      status: "read",
    },
    data: { status: "delivered" },
  });
}

/* ---------------- Private messages (board / PM) ---------------- */

export async function listPrivateMessages(
  channel: string,
  communityId?: string | null,
) {
  return prisma.privateMessage.findMany({
    where: { channel, communityId: scope(communityId) },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function createPrivateMessage(input: {
  communityId?: string | null;
  channel: string;
  author: string;
  body: string;
}) {
  return prisma.privateMessage.create({
    data: {
      communityId: scope(input.communityId),
      channel: input.channel,
      author: input.author,
      body: input.body,
    },
  });
}

/* ---------------- Community events & RSVP ---------------- */

export async function listCommunityEvents(communityId?: string | null) {
  const cid = scope(communityId);
  let rows = await prisma.communityEvent.findMany({
    where: { communityId: cid },
    include: { rsvps: true },
    orderBy: { date: "asc" },
  });
  if (rows.length === 0 && isFourClubDemoId(cid)) {
    await ensureFourClubDemoContent("full", cid);
    rows = await prisma.communityEvent.findMany({
      where: { communityId: cid },
      include: { rsvps: true },
      orderBy: { date: "asc" },
    });
  }
  return rows;
}

export async function createCommunityEvent(input: {
  communityId?: string | null;
  title: string;
  description?: string;
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  category?: string;
  isPromoted?: boolean;
  capacity?: number | null;
  requirePayment?: boolean;
  feeCents?: number;
  createdBy: string;
}) {
  return prisma.communityEvent.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      description: input.description ?? "",
      date: input.date,
      time: input.time,
      endTime: input.endTime,
      location: input.location ?? "",
      category: input.category ?? "community",
      isPromoted: input.isPromoted ?? false,
      capacity: input.capacity ?? null,
      requirePayment: input.requirePayment ?? false,
      feeCents: input.feeCents ?? 0,
      createdBy: input.createdBy,
    },
  });
}

export async function toggleEventRsvp(input: {
  eventId: string;
  memberEmail: string;
  memberName: string;
}) {
  const existing = await prisma.eventRsvp.findUnique({
    where: {
      eventId_memberEmail: { eventId: input.eventId, memberEmail: input.memberEmail },
    },
  });
  if (existing) {
    await prisma.eventRsvp.delete({ where: { id: existing.id } });
    return { rsvped: false };
  }
  await prisma.eventRsvp.create({
    data: {
      eventId: input.eventId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
    },
  });
  return { rsvped: true };
}

/* ---------------- Documents ---------------- */

export async function listDocuments(opts: {
  communityId?: string | null;
  audience?: string;
}) {
  const cid = scope(opts.communityId);
  let docs = await prisma.communityDocument.findMany({
    where: {
      communityId: cid,
      ...(opts.audience ? { audience: opts.audience } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (docs.length === 0) {
    try {
      if (cid === "hunters-ridge") {
        await ensureHuntersRidgeDemoSeeded();
      } else if (cid === "bonita-bay") {
        await ensureBonitaBayDemoSeeded();
      } else if (cid === "shadow-wood") {
        await ensureShadowWoodDemoSeeded();
      } else if (cid === "heron-creek") {
        await ensureHeronCreekDemoSeeded();
      } else if (cid === "debary") {
        await ensureDebaryDemoSeeded();
      } else if (cid === "jacaranda") {
        await ensureJacarandaDemoSeeded();
      } else if (cid === "the-dunes") {
        await ensureTheDunesDemoSeeded();
      } else if (cid === "the-nest") {
        await ensureTheNestDemoSeeded();
      } else if (cid === "martin-downs") {
        await ensureMartinDownsDemoSeeded();
      } else if (cid === "seagate") {
        await ensureSeagateDemoSeeded();
      } else if (cid === "copperleaf") {
        await ensureCopperleafDemoSeeded();
      } else if (cid === "club-renaissance") {
        await ensureClubRenaissanceDemoSeeded();
      } else if (cid === "falls-club") {
        await ensureFallsClubDemoSeeded();
      } else if (cid === "estero") {
        await ensureEsteroDemoSeeded();
      } else if (cid === "wildcat-run") {
        await ensureWildcatRunDemoSeeded();
      } else if (cid === "highland-woods") {
        await ensureHighlandWoodsDemoSeeded();
      } else if (cid === "bonita-national") {
        await ensureBonitaNationalDemoSeeded();
      } else if (cid === "carrollwood") {
        await ensureCarrollwoodDemoSeeded();
      } else if (cid === "windsor") {
        await ensureWindsorDemoSeeded();
      } else if (cid === "worthington") {
        await ensureWorthingtonDemoSeeded();
      } else if (cid === "spanish-wells") {
        await ensureSpanishWellsDemoSeeded();
      } else if (cid === "harbor-pointe") {
        await ensureHarborPointeDemoSeeded();
      } else if (cid === "willow-creek") {
        await ensureWillowCreekDemoSeeded();
      } else if (cid === "alliant") {
        await ensureAlliantDemoSeeded();
      } else if (cid === "heritage-bay") {
        await ensureHeritageBayDemoSeeded();
      } else if (cid === "iron-lake") {
        await ensureIronLakeDemoSeeded();
      }
    } catch (err) {
      console.error("[listDocuments] demo documents seed failed", err);
    }
    docs = await prisma.communityDocument.findMany({
      where: {
        communityId: cid,
        ...(opts.audience ? { audience: opts.audience } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return docs;
}

export async function createDocument(input: {
  communityId?: string | null;
  title: string;
  category: string;
  url?: string;
  sizeLabel?: string;
  audience?: string;
  uploadedBy: string;
}) {
  return prisma.communityDocument.create({
    data: {
      communityId: scope(input.communityId),
      title: input.title,
      category: input.category,
      url: input.url ?? "#",
      sizeLabel: input.sizeLabel ?? "PDF",
      audience: input.audience ?? "member",
      uploadedBy: input.uploadedBy,
    },
  });
}

/* ---------------- Restaurant reservations ---------------- */

export async function listReservationsForMember(email: string) {
  return prisma.restaurantReservation.findMany({
    where: { memberEmail: email },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReservation(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
  restaurant: string;
  date: string;
  time: string;
  partySize: number;
}) {
  return prisma.restaurantReservation.create({
    data: {
      communityId: scope(input.communityId),
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      restaurant: input.restaurant,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
    },
  });
}

/* ---------------- Board budget & bids ---------------- */

export async function listBudgetLines(communityId?: string | null) {
  return prisma.budgetLine.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { category: "asc" },
  });
}

export async function listBids(communityId?: string | null) {
  return prisma.bid.findMany({
    where: { communityId: scope(communityId) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBid(input: {
  communityId?: string | null;
  project: string;
  vendor: string;
  amount: number;
  status?: string;
}) {
  return prisma.bid.create({
    data: {
      communityId: scope(input.communityId),
      project: input.project,
      vendor: input.vendor,
      amount: input.amount,
      status: input.status ?? "received",
    },
  });
}

/* ---------------- Calendar ads / sponsorship ---------------- */

export async function listCalendarAds(communityId?: string | null) {
  return prisma.calendarAd.findMany({
    where: { communityId: scope(communityId), active: true },
    orderBy: { startsOn: "asc" },
  });
}

/* ---------------- Directory & vendors ---------------- */

export async function listResidentDirectory(communityId?: string | null) {
  const cid = scope(communityId);
  const [members, users, profiles] = await Promise.all([
    prisma.communityMember.findMany({ where: { communityId: cid } }),
    prisma.user.findMany({ where: { communityId: cid } }),
    prisma.memberProfileExt.findMany(),
  ]);
  const profilesByEmail = new Map(profiles.map((profile) => [profile.userEmail, profile]));
  const rows = members.map((member) => {
    const user = users.find((candidate) => candidate.name === member.name);
    const profile = user ? profilesByEmail.get(user.email) : undefined;
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      unit: profile?.unit ?? (member.isManagement ? "Mgmt" : "—"),
      visible: profile?.directoryVisible ?? true,
      email: user?.email ?? "",
    };
  });
  for (const u of users) {
    if (!rows.some((r) => r.name === u.name)) {
      const profile = profilesByEmail.get(u.email);
      rows.push({
        id: u.id,
        name: u.name,
        role: u.role === "member" ? "Member" : u.role,
        unit: profile?.unit ?? "—",
        visible: profile?.directoryVisible ?? true,
        email: u.email,
      });
    }
  }
  return rows;
}

/** Member Vendors directory: club services + lesson pros — not Local Pros or club dining. */
export async function listVendorDirectory(communityId?: string | null) {
  return prisma.provider.findMany({
    where: {
      communityId: scope(communityId),
      listingKind: { not: "local_pro" },
      // Club restaurants live under Dining — never list them as vendors.
      NOT: {
        OR: [
          { category: { contains: "Dining" } },
          { category: { contains: "dining" } },
          { category: { contains: "Food" } },
          { category: { contains: "food" } },
          { category: { contains: "Restaurant" } },
          { category: { contains: "restaurant" } },
          { name: { contains: "Dining" } },
          { name: { contains: "Restaurant" } },
        ],
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listNotificationFeed(communityId?: string | null) {
  const logs = await listAccessLogs(communityId);
  return logs.slice(0, 50).map((l) => ({
    id: l.id,
    title: l.action,
    detail: l.detail,
    date: l.createdAt.toISOString(),
    read: false,
  }));
}

/* ---------------- One-time seed for demo realism ---------------- */

let seedPromise: Promise<void> | null = null;
/** After a successful seed on this instance, skip all further work. */
let seedReady = false;

async function ensureClubSportsInventory(communityId: string) {
  await ensureMembershipTiersSeeded(communityId);
  await ensureClubStaffSeeded(communityId);
  await ensureGrabGoSeeded(communityId);
  await ensureDemoDependents(communityId);
  await ensureDemoRejoinCase(communityId);

  const hoursPresets = {
    courts: weekdayHours("07:00", "21:00", "07:00", "20:00"),
    golf: weekdayHours("06:00", "19:00", "06:00", "18:30"),
    range: defaultDailyHours("06:00", "19:00"),
    spa: weekdayHours("09:00", "19:00", "09:00", "17:00"),
    clubhouse: weekdayHours("08:00", "22:00", "08:00", "23:00"),
    dining: weekdayHours("11:00", "21:00", "10:00", "22:00"),
    store: weekdayHours("08:00", "18:00", "08:00", "17:00"),
    gym: defaultDailyHours("05:00", "22:00"),
  };

  async function upsertAmenity(data: {
    name: string;
    description: string;
    fee: number;
    kind: string;
    unitCount: number;
    hours: ReturnType<typeof defaultDailyHours>;
    holes?: number;
    surface?: string;
  }) {
    const existing = await prisma.amenity.findFirst({
      where: { communityId, name: data.name },
    });
    const schedule = formatHoursSummary(data.hours);
    const hoursJson = JSON.stringify(data.hours);
    if (existing) {
      await prisma.amenity.update({
        where: { id: existing.id },
        data: {
          schedule,
          hoursJson,
          kind: data.kind,
          unitCount: Math.max(existing.unitCount, data.unitCount),
        },
      });
      return;
    }
    await prisma.amenity.create({
      data: {
        communityId,
        name: data.name,
        description: data.description,
        fee: data.fee,
        schedule,
        hoursJson,
        kind: data.kind,
        unitCount: data.unitCount,
        holes: data.holes ?? null,
        surface: data.surface ?? null,
      },
    });
  }

  // Sync hours onto existing courts / golf / range
  const amenities = await prisma.amenity.findMany({ where: { communityId } });
  for (const a of amenities) {
    let hours = parseWeeklyHours(a.hoursJson);
    if (!hours) {
      if (a.kind === "court") hours = hoursPresets.courts;
      else if (a.kind === "golf_course") hours = hoursPresets.golf;
      else if (a.kind === "driving_range") hours = hoursPresets.range;
      else if (a.kind === "gym") hours = hoursPresets.gym;
      else if (a.name.toLowerCase().includes("clubhouse")) hours = hoursPresets.clubhouse;
      else continue;
      await prisma.amenity.update({
        where: { id: a.id },
        data: {
          hoursJson: JSON.stringify(hours),
          schedule: formatHoursSummary(hours, a.schedule),
        },
      });
    }
  }

  const drivingRange = await prisma.amenity.findFirst({
    where: { communityId, kind: "driving_range" },
  });
  if (!drivingRange) {
    await upsertAmenity({
      name: "Driving Range",
      description: "Practice range with bay lanes for warm-ups and golf lessons.",
      fee: 20,
      kind: "driving_range",
      unitCount: 12,
      hours: hoursPresets.range,
    });
  }

  const golf = await prisma.amenity.findFirst({
    where: { communityId, kind: "golf_course" },
  });
  if (golf && golf.unitCount < 4) {
    await prisma.amenity.update({
      where: { id: golf.id },
      data: { unitCount: 4 },
    });
  }

  await prisma.amenity.updateMany({
    where: {
      communityId,
      OR: [{ name: { contains: "Fitness" } }, { name: { contains: "Gym" } }],
    },
    data: { kind: "gym" },
  });

  await upsertAmenity({
    name: "Clubhouse",
    description: "Main clubhouse — events, lounge, and member services.",
    fee: 0,
    kind: "clubhouse",
    unitCount: 1,
    hours: hoursPresets.clubhouse,
  });

  await upsertAmenity({
    name: "Spa & Wellness",
    description: "Massage, facials, and wellness treatments — reserve a treatment room.",
    fee: 95,
    kind: "spa",
    unitCount: 4,
    hours: hoursPresets.spa,
  });

  await upsertAmenity({
    name: "The Terrace Restaurant",
    description: "Clubhouse fine dining with seasonal menus.",
    fee: 0,
    kind: "restaurant",
    unitCount: 1,
    hours: hoursPresets.dining,
  });

  await upsertAmenity({
    name: "Poolside Grill",
    description: "Casual poolside dining and bar service.",
    fee: 0,
    kind: "restaurant",
    unitCount: 1,
    hours: weekdayHours("11:00", "19:00", "11:00", "20:00"),
  });

  await upsertAmenity({
    name: "Golf Pro Shop",
    description: "Apparel, equipment, and golf sundries.",
    fee: 0,
    kind: "store",
    unitCount: 1,
    hours: hoursPresets.store,
  });

  await upsertAmenity({
    name: "Tennis Pro Shop",
    description: "Racquets, restringing, and court apparel.",
    fee: 0,
    kind: "store",
    unitCount: 1,
    hours: hoursPresets.store,
  });

  const tennisPro = await prisma.provider.findFirst({
    where: { communityId, category: { contains: "tennis" } },
  });
  if (!tennisPro) {
    await prisma.provider.create({
      data: {
        communityId,
        name: "Alex Rivera — Tennis Pro",
        category: "tennis",
        type: "pro",
        description: "USTA certified private and semi-private tennis lessons.",
        rating: 4.9,
        listingKind: "club",
        email: `tennis.pro@${communityId.replace(/-/g, "")}.demo`,
      },
    });
  }

  const golfPro = await prisma.provider.findFirst({
    where: { communityId, category: { contains: "golf" } },
  });
  if (!golfPro) {
    await prisma.provider.create({
      data: {
        communityId,
        name: "Jordan Blake — Golf Pro",
        category: "golf",
        type: "pro",
        description: "PGA teaching professional — range and on-course lessons.",
        rating: 4.8,
        listingKind: "club",
        email: `golf.pro@${communityId.replace(/-/g, "")}.demo`,
      },
    });
  }

  // Demo member defaults
  for (const row of [
    {
      email: "sarah.mitchell@oceanside.com",
      tier: "national",
      residencyStatus: "resident",
      paysHoa: true,
      unit: "204B",
    },
    {
      email: "superadmin@gmail.com",
      tier: "national",
      residencyStatus: "resident",
      paysHoa: true,
      unit: "Admin",
    },
  ] as const) {
    await prisma.memberProfileExt.upsert({
      where: { userEmail: row.email },
      create: {
        userEmail: row.email,
        membershipTier: row.tier,
        residencyStatus: row.residencyStatus,
        paysHoa: row.paysHoa,
        unit: row.unit,
      },
      update: {
        residencyStatus: row.residencyStatus,
        paysHoa: row.paysHoa,
      },
    });
  }
}

/**
 * Runtime seed / repair for demo DBs.
 * Hot-path rules for Vercel:
 * - No-op after first success on this serverless instance
 * - Apparel backfill at most once (not before every await)
 * - If communities already exist (build-time seed), skip multi-club walk
 */
export async function ensureRecordsSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (seedReady) return;

  if (!seedPromise) {
    seedPromise = (async () => {
      try {
      // Build-time / prior deploys already populated Postgres — don't re-walk
      // every demo club (or scan apparel) on each cold start.
      const communityCount = await prisma.community.count();
      if (communityCount >= 3) {
        seedReady = true;
        apparelBackfillDone = true;
        return;
      }

      try {
        await backfillTenantApparelImageUrls();
      } catch (err) {
        console.error("[ensureRecordsSeeded] apparel image backfill failed", err);
      }

      const cid = GOLDEN_OCALA_COMMUNITY;
      try {
        await ensureClubSportsInventory(cid);
      } catch (err) {
        console.error("[ensureRecordsSeeded] club sports inventory failed", err);
      }
      try {
        await ensureIronLakeDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] iron-lake seed failed", err);
      }
      try {
        await ensureHeritageBayDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] heritage-bay seed failed", err);
      }
      try {
        await ensureHuntersRidgeDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] hunters-ridge seed failed", err);
      }
      try {
        await ensureBonitaBayDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] bonita-bay seed failed", err);
      }
      try {
        await ensureShadowWoodDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] shadow-wood seed failed", err);
      }
      try {
        await ensureHeronCreekDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] heron-creek seed failed", err);
      }
      try {
        await ensureDebaryDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] debary seed failed", err);
      }
      try {
        await ensureJacarandaDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] jacaranda seed failed", err);
      }
      try {
        await ensureTheDunesDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] the-dunes seed failed", err);
      }

      try {
        await ensureTheNestDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] the-nest seed failed", err);
      }
      try {
        await ensureMartinDownsDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] martin-downs seed failed", err);
      }
      try {
        await ensureSeagateDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] seagate seed failed", err);
      }
      try {
        await ensureCopperleafDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] copperleaf seed failed", err);
      }
      try {
        await ensureClubRenaissanceDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] club-renaissance seed failed", err);
      }
      try {
        await ensureFallsClubDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] falls-club seed failed", err);
      }
      try {
        await ensureEsteroDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] estero seed failed", err);
      }
      try {
        await ensureWildcatRunDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] wildcat-run seed failed", err);
      }
      try {
        await ensureHighlandWoodsDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] highland-woods seed failed", err);
      }
      try {
        await ensureBonitaNationalDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] bonita-national seed failed", err);
      }
      try {
        await ensureCarrollwoodDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] carrollwood seed failed", err);
      }
      try {
        await ensureWindsorDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] windsor seed failed", err);
      }
      try {
        await ensureWorthingtonDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] worthington seed failed", err);
      }
      try {
        await ensureSpanishWellsDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] spanish-wells seed failed", err);
      }
      try {
        await ensureHarborPointeDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] harbor-pointe seed failed", err);
      }
      try {
        await ensureWillowCreekDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] willow-creek seed failed", err);
      }
      try {
        await ensureAlliantDemoSeeded();
      } catch (err) {
        console.error("[ensureRecordsSeeded] alliant seed failed", err);
      }

      // Production stays empty unless ALLOW_DEMO_SEED=1 (staging demos).
      if (!isDemoSeedAllowed()) {
        seedReady = true;
        return;
      }

      // Link Cassie provider listing to the provider login email (message routing)
      await prisma.provider.updateMany({
        where: {
          name: "Cassie's Meticulous Touch",
          OR: [{ email: null }, { email: "" }],
        },
        data: { email: "cassiesmeticuloustouch@gmail.com" },
      });

      if ((await prisma.announcement.count()) === 0) {
        await prisma.announcement.createMany({
          data: [
            { communityId: cid, title: "Pool deck resurfacing — July 6–8", body: "The pool will be closed for resurfacing July 6–8. The spa remains open.", author: "Property Management", priority: "important" },
            { communityId: cid, title: "New gate access codes next week", body: "Gate codes rotate Monday. Updated codes have been emailed to residents.", author: "Golden Ocala Board", priority: "normal" },
          ],
        });
      }
      if ((await prisma.serviceRequest.count()) === 0) {
        await prisma.serviceRequest.createMany({
          data: [
            { communityId: cid, memberEmail: "sarah.mitchell@oceanside.com", memberName: "Sarah Mitchell", unit: "Unit 204B", title: "Kitchen faucet leak", category: "Plumbing", description: "Slow drip under the kitchen sink.", status: "in_progress" },
          ],
        });
      }
      if ((await prisma.maintenanceTask.count()) === 0) {
        await prisma.maintenanceTask.createMany({
          data: [
            { communityId: cid, title: "Replace lobby light fixtures", area: "Lobby", assignedTo: "J. Alvarez", status: "in_progress", due: "2026-06-26" },
            { communityId: cid, title: "Pool pump inspection", area: "Pool", assignedTo: "BlueWave", status: "open", due: "2026-06-28" },
            { communityId: cid, title: "Gate motor lubrication", area: "Entrance", assignedTo: "J. Alvarez", status: "done", due: "2026-06-18" },
            { communityId: cid, title: "Member request: faucet leak 204B", area: "Unit 204B", assignedTo: "Unassigned", status: "open", due: "2026-06-27" },
          ],
        });
      }
      if ((await prisma.invoice.count()) === 0) {
        await prisma.invoice.createMany({
          data: [
            { communityId: cid, vendor: "Greenscape Lawn Care", description: "June landscaping", amount: 3400, submittedBy: "Michael Thompson", status: "pending" },
            { communityId: cid, vendor: "BlueWave Pool Service", description: "Pool maintenance Q2", amount: 2100, submittedBy: "Michael Thompson", status: "pending" },
          ],
        });
      }
      if ((await prisma.booking.count()) === 0) {
        await prisma.booking.create({
          data: {
            communityId: cid,
            memberEmail: "sarah.mitchell@oceanside.com",
            memberName: "Sarah Mitchell",
            amenity: "Tennis Courts",
            unitNumber: 1,
            date: "2026-06-24",
            startTime: "10:00",
            endTime: "11:00",
            status: "confirmed",
          },
        });
      }
      if ((await prisma.listing.count()) === 0) {
        await prisma.listing.createMany({
          data: [
            {
              communityId: cid,
              title: "Peloton Bike (like new)",
              description:
                "Peloton Bike+ with rotating screen. Less than 200 rides, always kept in climate-controlled room. Includes shoes (size 9) and weights. Pick up from unit 305C.",
              price: 650,
              category: "Fitness",
              seller: "Emily Chen",
              unit: "305C",
              imageUrl: "/brand/marketplace-peloton.jpg",
            },
            {
              communityId: cid,
              title: "Patio dining set, 6 chairs",
              description:
                "Teak dining table with six matching chairs. Some sun fading on cushions — covers included. Must pick up; will help load into SUV.",
              price: 320,
              category: "Furniture",
              seller: "Greg Sherman",
              unit: "210A",
              imageUrl: "/brand/marketplace-patio-set.jpg",
            },
          ],
        });
      }
      if ((await prisma.blogPost.count()) === 0) {
        await prisma.blogPost.createMany({
          data: [
            { communityId: cid, title: "5 ways to make the most of summer at Oceanside", excerpt: "From sunrise tennis to poolside movie nights, here's how neighbors enjoy the season.", body: "", author: "Social Committee", category: "Lifestyle" },
            { communityId: cid, title: "Meet your 2026 Board members", excerpt: "Get to know the volunteers steering the community this year.", body: "", author: "Golden Ocala Board", category: "Community" },
          ],
        });
      }
      if ((await prisma.groupMessage.count()) === 0) {
        await prisma.groupMessage.createMany({
          data: [
            { communityId: cid, groupId: "gr1", author: "James Rodriguez", body: "Court 2 is open Saturday at 9 — who's in?" },
            { communityId: cid, groupId: "gr1", author: "Emily Chen", body: "I'm in! Bringing extra balls." },
            { communityId: cid, groupId: "gr2", author: "Lisa Park", body: "This month's pick: 'The Midnight Library'." },
          ],
        });
      }
      if ((await prisma.amenity.count()) === 0) {
        await prisma.amenity.createMany({
          data: [
            {
              communityId: cid,
              name: "Tennis — Green Clay",
              description: "Twelve green clay courts for league and tournament play.",
              fee: 15,
              schedule: "Daily 7AM – 9PM",
              kind: "court",
              unitCount: 12,
              surface: "green_clay",
            },
            {
              communityId: cid,
              name: "Tennis — Hard Court",
              description: "Eight hard courts — open for member bookings during events.",
              fee: 15,
              schedule: "Daily 7AM – 9PM",
              kind: "court",
              unitCount: 8,
              surface: "hard_court",
            },
            {
              communityId: cid,
              name: "Tennis — Red Clay",
              description: "Four red clay courts.",
              fee: 15,
              schedule: "Daily 7AM – 9PM",
              kind: "court",
              unitCount: 4,
              surface: "red_clay",
            },
            {
              communityId: cid,
              name: "Pickleball Courts",
              description: "Two dedicated pickleball courts.",
              fee: 10,
              schedule: "Daily 7AM – 9PM",
              kind: "court",
              unitCount: 2,
            },
            {
              communityId: cid,
              name: "Championship Golf Course",
              description: "18-hole par 72 course with practice range.",
              fee: 45,
              schedule: "Daily 6AM – 7PM",
              kind: "golf_course",
              unitCount: 4,
              holes: 18,
            },
            {
              communityId: cid,
              name: "Driving Range",
              description: "Practice range with bay lanes.",
              fee: 20,
              schedule: "Daily 6AM – 7PM",
              kind: "driving_range",
              unitCount: 12,
            },
            {
              communityId: cid,
              name: "Clubhouse",
              description: "Private event space for up to 50 guests.",
              fee: 75,
              schedule: "Reservations required",
              kind: "facility",
              unitCount: 1,
            },
            {
              communityId: cid,
              name: "Fitness Center",
              description: "Cardio & strength equipment, fob access.",
              fee: 0,
              schedule: "24/7 for residents",
              kind: "gym",
              unitCount: 1,
            },
            {
              communityId: cid,
              name: "Pool & Spa",
              description: "Heated pool and spa with lounge seating.",
              fee: 0,
              schedule: "Daily 6AM – 10PM",
              kind: "facility",
              unitCount: 1,
              ownership: "club",
            },
            {
              communityId: cid,
              name: "Jet Ski Rental",
              description: "Partner-operated jet skis on Lake Weir — book a slot and invite friends (spots fill first-come).",
              fee: 85,
              schedule: "Daily 9AM – 6PM",
              kind: "facility",
              unitCount: 4,
              ownership: "external",
              partnerName: "Lake Weir Watersports",
            },
            {
              communityId: cid,
              name: "Boat Rental",
              description: "Partner pontoon and ski boats — not club-owned. Cap your party when you invite members.",
              fee: 220,
              schedule: "Daily 8AM – 5PM",
              kind: "facility",
              unitCount: 2,
              ownership: "external",
              partnerName: "Silver Springs Boat Co.",
            },
          ],
        });
      }
      await ensureExternalActivityAmenities(cid);
      if ((await prisma.menuItem.count()) === 0) {
        await prisma.menuItem.createMany({
          data: [
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Clubhouse Burger", price: 16, category: "Mains", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Caesar Salad", price: 12, category: "Starters", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Grilled Salmon", price: 24, category: "Mains", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Tomato Bisque", price: 9, category: "Starters", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Chicken Club Sandwich", price: 15, category: "Mains", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Key Lime Pie", price: 10, category: "Desserts", available: true },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", name: "Iced Tea", price: 4, category: "Drinks", available: true },
          ],
        });
      }
      if ((await prisma.survey.count()) === 0) {
        await prisma.survey.create({
          data: {
            communityId: cid,
            title: "Reserve fund allocation for 2027",
            description: "Vote on the proposed reserve contribution increase.",
            closes: "2026-07-15",
            options: {
              create: [
                { label: "Approve 3% increase", votes: 52 },
                { label: "Approve 5% increase", votes: 21 },
                { label: "No increase", votes: 13 },
              ],
            },
          },
        });
        await prisma.survey.create({
          data: {
            communityId: cid,
            title: "New pool hours",
            description: "Should the pool stay open until 11pm in summer?",
            closes: "2026-07-08",
            options: {
              create: [
                { label: "Yes, extend hours", votes: 41 },
                { label: "No, keep current", votes: 23 },
              ],
            },
          },
        });
      }
      await backfillDemoTournaments();
      await backfillTournamentPlayersFromSeeds();
      await backfillDemoTournamentScores();
      await backfillMarketplaceListingImages();
      if ((await prisma.contentTemplate.count()) === 0) {
        await prisma.contentTemplate.createMany({
          data: [
            { name: "Welcome / onboarding", channel: "email", subject: "Welcome to your club!" },
            { name: "Booking confirmation", channel: "email", subject: "Your booking is confirmed" },
            { name: "Reservation reminder (3h)", channel: "sms", subject: "Reminder: your reservation is soon" },
            { name: "Dues due notice", channel: "email", subject: "Your HOA dues are due" },
            { name: "New announcement", channel: "push", subject: "New community announcement" },
          ],
        });
      }
      if ((await prisma.checkin.count()) === 0) {
        await prisma.checkin.createMany({
          data: [
            { communityId: cid, name: "Greenscape Crew", type: "vendor", host: "Management", unit: "Common", status: "checked_in" },
            { communityId: cid, name: "Amanda Reyes", type: "guest", host: "Sarah Mitchell", unit: "204B", status: "expected" },
            { communityId: cid, name: "FedEx Delivery", type: "vendor", host: "Front Desk", unit: "Lobby", status: "checked_out" },
          ],
        });
      }
      if ((await prisma.registrationChecklist.count()) === 0) {
        await prisma.registrationChecklist.createMany({
          data: [
            { communityId: cid, resident: "Sarah Mitchell", unit: "204B", vehicle: true, pet: true, fingerprint: false },
            { communityId: cid, resident: "Emily Chen", unit: "305C", vehicle: true, pet: true, fingerprint: true },
            { communityId: cid, resident: "Greg Sherman", unit: "210A", vehicle: false, pet: false, fingerprint: false },
          ],
        });
      }
      if ((await prisma.promotion.count()) === 0) {
        await prisma.promotion.createMany({
          data: [
            { providerEmail: "cassiesmeticuloustouch@gmail.com", title: "20% off first deep clean", type: "coupon", detail: "Code: FRESH20", status: "active", redemptions: 18 },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", title: "Summer move-out special", type: "coupon", detail: "Code: MOVE50", status: "scheduled", redemptions: 0 },
            { providerEmail: "cassiesmeticuloustouch@gmail.com", title: "Featured listing — Golden Ocala", type: "ppc", detail: "$1.20 / click · $200 budget", status: "active", redemptions: 142 },
          ],
        });
      }
      if ((await prisma.apparelProduct.count()) === 0) {
        await prisma.apparelProduct.createMany({
          data: [
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Club Polo — Navy", description: "Moisture-wicking polo with embroidered club logo.", price: 42, category: "Polo", sizesJson: '["S","M","L","XL","XXL"]' },
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Club Polo — White", description: "Classic white polo for tournaments and events.", price: 42, category: "Polo", sizesJson: '["S","M","L","XL","XXL"]' },
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Staff Quarter-Zip", description: "Lightweight layer for front desk and pro shop staff.", price: 58, category: "Outerwear", sizesJson: '["S","M","L","XL","XXL","2XL"]' },
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Performance Cap", description: "Structured cap with club logo — one size.", price: 24, category: "Accessories", sizesJson: '["One Size"]' },
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Tennis Skirt", description: "Built-in shorts, club colors.", price: 48, category: "Athletic", sizesJson: '["XS","S","M","L","XL"]' },
            { communityId: cid, vendorName: APPAREL_VENDOR, name: "Member T-Shirt", description: "Soft cotton tee for community events.", price: 22, category: "T-Shirt", sizesJson: '["S","M","L","XL","XXL"]' },
          ],
        });
      }
      if ((await prisma.communityDocument.count()) === 0) {
        const demoPdf =
          "/brand/docs/sample-document.pdf";
        await prisma.communityDocument.createMany({
          data: [
            { communityId: cid, title: "Declaration of Covenants", category: "legal", url: demoPdf, audience: "member", uploadedBy: "Board Secretary" },
            { communityId: cid, title: "Community Bylaws", category: "legal", url: demoPdf, audience: "member", uploadedBy: "Board Secretary" },
            { communityId: cid, title: "May 2026 Board Minutes", category: "minutes", url: demoPdf, audience: "board", uploadedBy: "Board Secretary" },
            { communityId: cid, title: "2026 Operating Budget", category: "financial", url: demoPdf, audience: "board", uploadedBy: "Treasurer" },
            { communityId: cid, title: "Pool & Spa Rules", category: "policy", url: demoPdf, audience: "member", uploadedBy: "Property Management" },
            { communityId: cid, title: "Community Rules & Regulations", category: "rules", url: demoPdf, audience: "member", uploadedBy: "Property Management" },
            { communityId: cid, title: "Hurricane Emergency Procedures", category: "emergency", url: demoPdf, audience: "member", uploadedBy: "Property Management" },
          ],
        });
      }
      if ((await prisma.communityEvent.count()) === 0) {
        const tennisSocial = await prisma.communityEvent.create({
          data: {
            communityId: cid,
            title: "Tennis Social",
            description: "Round-robin mixer on courts 1–4. All skill levels welcome.",
            date: "2026-07-04",
            time: "5:00 PM",
            location: "Tennis Center",
            category: "social",
            isPromoted: true,
            createdBy: "Social Committee",
          },
        });
        await prisma.eventRsvp.createMany({
          data: [
            { eventId: tennisSocial.id, memberEmail: "sarah.mitchell@oceanside.com", memberName: "Sarah Mitchell" },
            { eventId: tennisSocial.id, memberEmail: "emily.chen@goldenocala.com", memberName: "Emily Chen" },
          ],
        });
        await prisma.communityEvent.createMany({
          data: [
            { communityId: cid, title: "Board Meeting", description: "Monthly board session — open forum first 15 minutes.", date: "2026-07-10", time: "6:00 PM", location: "Clubhouse", category: "board", createdBy: "Board President" },
            { communityId: cid, title: "Pool Deck Resurfacing", description: "Pool closed July 6–8 for maintenance.", date: "2026-07-06", time: "All day", location: "Pool", category: "maintenance", createdBy: "Property Management" },
            { communityId: cid, title: "Summer BBQ", description: "Committee-hosted cookout with live music.", date: "2026-08-15", time: "6:00 PM", location: "Amphitheater", category: "social", createdBy: "Social Committee" },
          ],
        });
      }
      if ((await prisma.budgetLine.count()) === 0) {
        await prisma.budgetLine.createMany({
          data: [
            { communityId: cid, category: "Landscaping", budgeted: 120000, spent: 54000 },
            { communityId: cid, category: "Pool & Spa", budgeted: 85000, spent: 38000 },
            { communityId: cid, category: "Security", budgeted: 95000, spent: 42000 },
            { communityId: cid, category: "Reserve Fund", budgeted: 200000, spent: 75000 },
            { communityId: cid, category: "Utilities", budgeted: 110000, spent: 51000 },
          ],
        });
      }
      if ((await prisma.bid.count()) === 0) {
        await prisma.bid.createMany({
          data: [
            { communityId: cid, project: "Roof replacement — Building C", vendor: "Summit Roofing", amount: 142000, status: "under_review" },
            { communityId: cid, project: "Elevator modernization", vendor: "Otis Elevator Co.", amount: 89000, status: "received" },
            { communityId: cid, project: "Parking lot sealcoat", vendor: "Asphalt Pro", amount: 18500, status: "accepted" },
          ],
        });
      }
      if ((await prisma.privateMessage.count()) === 0) {
        await prisma.privateMessage.createMany({
          data: [
            { communityId: cid, channel: "board", author: "Lisa Park", body: "Please review the roof bid before Friday's meeting." },
            { communityId: cid, channel: "board", author: "James Rodriguez", body: "Reserve fund allocation survey closes next week." },
            { communityId: cid, channel: "pm", author: "Michael Thompson", body: "Vendor invoices for June are uploaded for board review." },
          ],
        });
      }
      if ((await prisma.contactMessage.count()) === 0) {
        await prisma.contactMessage.createMany({
          data: [
            {
              communityId: cid,
              senderName: "Sarah Mitchell",
              senderEmail: "sarah.mitchell@oceanside.com",
              recipient: "cassiesmeticuloustouch@gmail.com",
              subject: "House cleaning next week",
              message:
                "Hi! I am reaching out because I need my house to be cleaned next week. Do you have any availability for then?",
            },
            {
              communityId: cid,
              senderName: "Lisa Clarizio",
              senderEmail: "lisa.clarizio@oceanside.com",
              recipient: "cassiesmeticuloustouch@gmail.com",
              subject: "Reschedule cleaning",
              message: "Hi! Could we move the cleaning to the afternoon instead?",
            },
            {
              communityId: cid,
              senderName: "Cassie's Meticulous Touch",
              senderEmail: "cassiesmeticuloustouch@gmail.com",
              recipient: "lisa.clarizio@oceanside.com",
              subject: "Re: Reschedule cleaning",
              message: "Afternoon works great — I can do 2 PM if that suits you.",
            },
            {
              communityId: cid,
              senderName: "Lisa Clarizio",
              senderEmail: "lisa.clarizio@oceanside.com",
              recipient: "cassiesmeticuloustouch@gmail.com",
              subject: "Re: Reschedule cleaning",
              message: "2 PM is perfect. See you then!",
            },
            {
              communityId: cid,
              senderName: "Golden Ocala Management",
              senderEmail: "management@goldenocala.com",
              recipient: "cassiesmeticuloustouch@gmail.com",
              subject: "Gate access",
              message: "Reminder: gate access code changes next week.",
            },
            {
              communityId: cid,
              senderName: "Michael Carter",
              senderEmail: "michael.carter@oceanside.com",
              recipient: "cassiesmeticuloustouch@gmail.com",
              subject: "Thank you",
              message: "Thanks for the great work last time!",
            },
          ],
        });
      }

      // Figma Message Conversation (4616:17866) — ensure booking-request demo exists on existing DBs
      const figmaBookingBody =
        "Hi! I am reaching out because I need my house to be cleaned next week. Do you have any availability for then?";
      const hasFigmaBooking = await prisma.contactMessage.findFirst({
        where: {
          recipient: "cassiesmeticuloustouch@gmail.com",
          message: figmaBookingBody,
        },
      });
      if (!hasFigmaBooking) {
        await prisma.contactMessage.create({
          data: {
            communityId: cid,
            senderName: "Sarah Mitchell",
            senderEmail: "sarah.mitchell@oceanside.com",
            recipient: "cassiesmeticuloustouch@gmail.com",
            subject: "House cleaning next week",
            message: figmaBookingBody,
          },
        });
      }
      if ((await prisma.calendarAd.count()) === 0) {
        await prisma.calendarAd.createMany({
          data: [
            { communityId: cid, title: "Pro Shop Summer Sale", sponsor: "Golden Ocala Pro Shop", startsOn: "2026-06-01", endsOn: "2026-08-31", linkUrl: "/member/apparel" },
            { communityId: cid, title: "Tennis Social — RSVP Today", sponsor: "Social Committee", startsOn: "2026-06-15", endsOn: "2026-07-04", linkUrl: "/member/calendar" },
          ],
        });
      }
      if ((await prisma.newsletter.count()) === 0) {
        await prisma.newsletter.createMany({
          data: [
            { communityId: cid, title: "Golden Ocala Monthly — June 2026", summary: "Pool party details, new vendors, and committee updates.", body: "Full newsletter content for June." },
            { communityId: cid, title: "Golden Ocala Monthly — May 2026", summary: "Spring cleanup recap and budget highlights.", body: "Full newsletter content for May." },
            { communityId: cid, title: "Golden Ocala Monthly — April 2026", summary: "New fitness equipment and tennis ladder kickoff.", body: "Full newsletter content for April." },
          ],
        });
      }
      if ((await prisma.realEstateListing.count()) === 0) {
        await prisma.realEstateListing.createMany({
          data: [
            {
              communityId: cid,
              title: "Lakeview 2BR Condo",
              description:
                "Bright corner unit with lake views from the living room and primary suite. Updated kitchen, in-unit laundry, and one covered parking space. Walk to clubhouse and pool.",
              type: "sale",
              price: 415000,
              beds: 2,
              baths: 2,
              sqft: 1180,
              unit: "Unit 612",
              color: "from-brand-400 to-brand-600",
              imagesJson: JSON.stringify([
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80",
              ]),
            },
            {
              communityId: cid,
              title: "Garden Villa 3BR",
              description:
                "Single-level villa with private courtyard and golf-cart garage. Open floor plan, impact windows, and recently resurfaced pool deck access via community gate.",
              type: "sale",
              price: 529000,
              beds: 3,
              baths: 2,
              sqft: 1620,
              unit: "Villa 14",
              color: "from-emerald-400 to-teal-600",
              imagesJson: JSON.stringify([
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80",
              ]),
            },
            {
              communityId: cid,
              title: "Furnished 1BR — seasonal",
              description:
                "Turnkey seasonal rental, fully furnished. Utilities included. Minimum 3-month lease; ideal for snowbirds. Steps from fitness center.",
              type: "rent",
              price: 2400,
              beds: 1,
              baths: 1,
              sqft: 720,
              unit: "Unit 305",
              color: "from-amber-400 to-orange-600",
              imagesJson: JSON.stringify([
                "https://images.unsplash.com/photo-1493809842364-78817a7cae94?w=900&q=80",
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80",
              ]),
            },
            {
              communityId: cid,
              title: "Penthouse 3BR, ocean view",
              description:
                "Top-floor penthouse with wraparound terrace and panoramic views. Chef's kitchen, smart home package, and two reserved parking spaces.",
              type: "rent",
              price: 4800,
              beds: 3,
              baths: 3,
              sqft: 2100,
              unit: "PH-2",
              color: "from-sky-400 to-indigo-600",
              imagesJson: JSON.stringify([
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",
              ]),
            },
          ],
        });
      }
      if ((await prisma.communityGroup.count()) === 0) {
        const g1 = await prisma.communityGroup.create({
          data: { communityId: cid, name: "Tennis Club", description: "Matches, ladders, and social play.", members: 2, color: "from-emerald-400 to-teal-600" },
        });
        const g2 = await prisma.communityGroup.create({
          data: { communityId: cid, name: "Book Club", description: "Monthly reads and discussion.", members: 1, color: "from-brand-400 to-brand-600" },
        });
        await prisma.communityGroup.createMany({
          data: [
            { communityId: cid, name: "Garden Committee", description: "Community garden plots and tips.", members: 12, color: "from-lime-400 to-green-600" },
            { communityId: cid, name: "Pickleball Crew", description: "Open play most mornings.", members: 41, color: "from-amber-400 to-orange-600" },
          ],
        });
        await prisma.groupMembership.createMany({
          data: [
            { groupId: g1.id, userEmail: "sarah.mitchell@oceanside.com" },
            { groupId: g2.id, userEmail: "sarah.mitchell@oceanside.com" },
          ],
        });
      }
      if ((await prisma.memberFavorite.count()) === 0) {
        await prisma.memberFavorite.createMany({
          data: [
            { userEmail: "sarah.mitchell@oceanside.com", label: "Pay HOA dues", href: "/member/payments" },
            { userEmail: "sarah.mitchell@oceanside.com", label: "Book Tennis Court", href: "/member/bookings" },
            { userEmail: "sarah.mitchell@oceanside.com", label: "Submit service request", href: "/member/service-requests" },
            { userEmail: "sarah.mitchell@oceanside.com", label: "Community calendar", href: "/member/calendar" },
          ],
        });
      }
      if ((await prisma.memberProperty.count()) === 0) {
        await prisma.memberProperty.createMany({
          data: [
            { userEmail: "sarah.mitchell@oceanside.com", address: "Unit 204B — Golden Ocala", type: "Primary residence", owner: true },
            { userEmail: "sarah.mitchell@oceanside.com", address: "Unit 511 — Harbor Pointe", type: "Rental", owner: true },
          ],
        });
      }
      await prisma.memberProfileExt.upsert({
        where: { userEmail: "sarah.mitchell@oceanside.com" },
        create: {
          userEmail: "sarah.mitchell@oceanside.com",
          phone: "(555) 234-8901",
          unit: "Unit 204B",
          joined: "2022-03-15",
          directoryVisible: true,
          householdRole: "owner",
        },
        update: {},
      });
      seedReady = true;
      } catch (err) {
        // Allow the next request to retry, but never reject awaiting pages with a 500.
        seedPromise = null;
        console.error("[ensureRecordsSeeded] failed", err);
      }
    })();
  }
  return seedPromise;
}
