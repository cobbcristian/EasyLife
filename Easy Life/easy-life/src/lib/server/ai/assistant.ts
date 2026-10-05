import { prisma } from "@/lib/server/prisma";
import { openAiChat, isOpenAiConfigured } from "@/lib/server/ai/openai";
import type { AiAction, AssistantReply } from "@/lib/server/ai/types";
import { ensureDependentPolicy } from "@/lib/server/dependent-membership";
import { ensureRejoinPolicy } from "@/lib/server/membership-rejoin";
import {
  BookingConflictError,
  createBooking,
  listAmenities,
} from "@/lib/server/records";
import { MembershipAccessError } from "@/lib/server/membership";
import {
  createLessonBooking,
  ensureLessonProsForCommunity,
  LessonConflictError,
  listClubPros,
  type LessonSport,
} from "@/lib/server/lessons";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateHint(message: string, now = new Date()): string {
  const m = message.toLowerCase();
  if (/\btoday\b/.test(m)) return isoDate(now);
  if (/\btomorrow\b/.test(m)) return isoDate(addDays(now, 1));
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < weekdays.length; i++) {
    if (m.includes(weekdays[i]!)) {
      const delta = (i - now.getDay() + 7) % 7 || 7;
      return isoDate(addDays(now, delta));
    }
  }
  const ymd = m.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (ymd) return ymd[1]!;
  const md = m.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  if (md) {
    const year = md[3] ? Number(md[3]) : now.getFullYear();
    const month = String(Number(md[1])).padStart(2, "0");
    const day = String(Number(md[2])).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return isoDate(addDays(now, 1));
}

function parseStartTime(message: string): string {
  const m = message.toLowerCase();
  const ampm = m.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = ampm[2] ?? "00";
    const ap = ampm[3]!.startsWith("p") ? "pm" : "am";
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }
  const twentyFour = m.match(/\bat\s+(\d{1,2}):(\d{2})\b/);
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, "0")}:${twentyFour[2]}`;
  }
  const hourOnly = m.match(/\bat\s+(\d{1,2})\b/);
  if (hourOnly) {
    let h = Number(hourOnly[1]);
    if (h < 7) h += 12; // "at 10" → 10:00; "at 3" → 15:00
    return `${String(h).padStart(2, "0")}:00`;
  }
  return "10:00";
}

function addHour(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const nh = ((h ?? 10) + 1) % 24;
  return `${String(nh).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

function isVendorIntent(message: string): boolean {
  return /vendor|pro\b|instructor|coach|lesson|private lesson|teaching pro/.test(
    message.toLowerCase(),
  );
}

function detectSport(message: string): LessonSport | null {
  const m = message.toLowerCase();
  if (/pickle/.test(m)) return "pickleball";
  if (/golf|tee|pga/.test(m) && !/grill|simulat/.test(m)) return "golf";
  if (/tennis/.test(m)) return "tennis";
  return null;
}

const AMENITY_STOP = new Set([
  "the",
  "and",
  "room",
  "for",
  "book",
  "reserve",
  "reservation",
  "schedule",
  "please",
  "tomorrow",
  "today",
  "with",
]);

/** Book and reserve are the same action. Match the amenity the member named. */
function scoreAmenityMatch(
  message: string,
  amenity: { name: string; kind: string },
): number {
  const msg = message.toLowerCase();
  const name = amenity.name.toLowerCase();
  const blob = `${name} ${amenity.kind}`.toLowerCase();
  let score = 0;
  if (name.length > 2 && msg.includes(name)) score += 30;
  for (const word of name.split(/[^a-z0-9]+/)) {
    if (word.length < 4 || AMENITY_STOP.has(word)) continue;
    if (msg.includes(word)) score += 8;
  }
  const aliases: Array<[RegExp, RegExp]> = [
    [/billiard|billiards|pool table|poolroom|pool room/, /billiard/],
    [/theatre|theater|movie|cinema/, /theat|cinema|movie/],
    [/grill|bbq|barbecue/, /grill/],
    [/simulat|golf sim/, /simulat/],
    [/wine|vault/, /wine|vault/],
    [/sports lounge|lounge/, /lounge/],
    [/board ?room|conference/, /board/],
    [/club ?room/, /club room|clubhouse/],
    [/massage/, /massage|spa/],
    [/fitness|gym/, /fitness|gym/],
    [/tennis|hard court/, /tennis/],
    [/pickle/, /pickle/],
    [/spa(?!ce)/, /spa|massage/],
    [/swimming|lap pool|(?<!pool )pool(?! table)/, /pool|swim/],
  ];
  for (const [msgRe, nameRe] of aliases) {
    if (msgRe.test(msg) && nameRe.test(blob)) score += 10;
  }
  return score;
}

async function findAmenityCandidates(communityId: string, message: string) {
  const amenities = await listAmenities(communityId);
  const playable = amenities.filter((a) => a.playable);
  const scored = playable
    .map((a) => ({ a, score: scoreAmenityMatch(message, a) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
  if (scored.length === 0) return [];
  const top = scored[0]!.score;
  return scored.filter((x) => x.score >= top - 2).map((x) => x.a);
}

async function executeAmenityBook(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  amenityId: string;
  amenityName: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<AssistantReply> {
  try {
    const booking = await createBooking({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      amenity: input.amenityName,
      amenityId: input.amenityId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });
    const summary = `${booking.amenity} on ${booking.date} from ${booking.startTime} to ${booking.endTime}`;
    return {
      reply: `Confirmed — I booked ${summary} for you. It’s on your calendar and in Bookings.`,
      actions: [
        {
          type: "booked",
          label: "View booking",
          href: "/member/bookings",
          summary,
        },
        { type: "open", label: "See calendar", href: "/member/calendar" },
      ],
      provider: "heuristic",
      speak: true,
    };
  } catch (err) {
    const msg =
      err instanceof BookingConflictError || err instanceof MembershipAccessError
        ? err.message
        : "I couldn’t complete that booking.";
    return {
      reply: `I tried to book ${input.amenityName}, but ${msg} Pick another time in Bookings.`,
      actions: [{ type: "open", label: "Open Bookings", href: "/member/bookings" }],
      provider: "heuristic",
      speak: true,
    };
  }
}

async function executeVendorBook(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  providerId: string;
  providerName: string;
  sport: LessonSport;
  date: string;
  startTime: string;
  durationMinutes?: number;
}): Promise<AssistantReply> {
  try {
    await createLessonBooking({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      providerId: input.providerId,
      sport: input.sport,
      date: input.date,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes ?? 60,
    });
    const summary = `${input.sport} lesson with ${input.providerName} on ${input.date} at ${input.startTime}`;
    return {
      reply: `Confirmed — I booked your ${summary}. This is an in-app club vendor (club pro), not an outside contractor. See it under Lessons / Vendors.`,
      actions: [
        {
          type: "booked",
          label: "View lesson",
          href: "/member/vendors",
          summary,
        },
        { type: "open", label: "See calendar", href: "/member/calendar" },
      ],
      provider: "heuristic",
      speak: true,
    };
  } catch (err) {
    const msg =
      err instanceof LessonConflictError || err instanceof MembershipAccessError
        ? err.message
        : "I couldn’t complete that vendor booking.";
    return {
      reply: `I tried to book ${input.providerName} (in-app vendor), but ${msg}`,
      actions: [{ type: "open", label: "Open Vendors", href: "/member/vendors" }],
      provider: "heuristic",
      speak: true,
    };
  }
}

async function handleVendorBookingIntent(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  message: string;
}): Promise<AssistantReply> {
  await ensureLessonProsForCommunity(input.communityId);
  const sport = detectSport(input.message);
  if (!sport) {
    return {
      reply:
        "I can book a lesson with a club pro. Tell me the sport — tennis, golf, or pickleball — and the day and time.",
      actions: [
        { type: "open", label: "Open lessons", href: "/member/lessons" },
        { type: "open", label: "Browse vendors", href: "/member/vendors" },
      ],
      provider: "heuristic",
      speak: true,
    };
  }
  const pros = await listClubPros(input.communityId, sport);
  const date = parseDateHint(input.message);
  const startTime = parseStartTime(input.message);
  const wantsNow = /\b(book|reserve|schedule)\b/i.test(input.message);

  if (pros.length === 0) {
    return {
      reply: `I don’t see any ${sport} vendors (club pros) on the app for your club yet. Ask the club to add lesson pros under Vendors.`,
      actions: [{ type: "open", label: "Open Vendors", href: "/member/vendors" }],
      provider: "heuristic",
      speak: true,
    };
  }

  const named = pros.find((p) =>
    input.message.toLowerCase().includes(p.name.split(",")[0]!.trim().toLowerCase()),
  );

  if (named && wantsNow) {
    return executeVendorBook({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      providerId: named.id,
      providerName: named.name,
      sport,
      date,
      startTime,
    });
  }

  if (pros.length === 1 && wantsNow) {
    const only = pros[0]!;
    return executeVendorBook({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      providerId: only.id,
      providerName: only.name,
      sport,
      date,
      startTime,
    });
  }

  const actions: AiAction[] = pros.slice(0, 5).map((p) => ({
    type: "book_vendor" as const,
    label: `Book ${p.name.split(",")[0]!.trim()}`,
    providerId: p.id,
    providerName: p.name,
    sport,
    date,
    startTime,
    durationMinutes: 60,
  }));
  actions.push({ type: "open", label: "Browse vendors", href: "/member/vendors" });

  return {
    reply: `These are in-app club vendors (club pros) for ${sport} — not outside contractors. Tap one and I’ll book ${date} at ${startTime} and confirm.`,
    actions,
    provider: "heuristic",
    speak: true,
  };
}

async function handleAmenityBookingIntent(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  message: string;
}): Promise<AssistantReply> {
  const matches = await findAmenityCandidates(input.communityId, input.message);
  const date = parseDateHint(input.message);
  const startTime = parseStartTime(input.message);
  const endTime = addHour(startTime);
  const wantsNow = /\b(book|reserve|reservation|schedule)\b/i.test(input.message);

  if (matches.length > 1) {
    const actions: AiAction[] = matches.slice(0, 6).map((amenity) => ({
      type: "book_amenity" as const,
      label: `Reserve ${amenity.name}`,
      amenityId: amenity.id,
      amenityName: amenity.name,
      date,
      startTime,
      endTime,
    }));
    const names = matches.slice(0, 6).map((a) => a.name).join(", ");
    return {
      reply: `I can reserve ${names}. Which one should I hold for ${date} at ${startTime}?`,
      actions,
      provider: "heuristic",
      speak: true,
    };
  }

  const amenity = matches[0] ?? null;

  if (!amenity) {
    const amenities = await listAmenities(input.communityId);
    const names = amenities
      .filter((a) => a.playable)
      .map((a) => a.name)
      .slice(0, 8);
    const list = names.length > 0 ? ` I can reserve ${names.join(", ")}.` : "";
    return {
      reply: `Tell me which room or amenity to reserve.${list}`,
      actions: [{ type: "open", label: "Open Reserve", href: "/member/bookings" }],
      provider: "heuristic",
      speak: true,
    };
  }

  if (wantsNow) {
    return executeAmenityBook({
      communityId: input.communityId,
      memberEmail: input.memberEmail,
      memberName: input.memberName,
      amenityId: amenity.id,
      amenityName: amenity.name,
      date,
      startTime,
      endTime,
    });
  }

  return {
    reply: `I can book ${amenity.name} on ${date} at ${startTime}. Confirm and I’ll place it and tell you when it’s done.`,
    actions: [
      {
        type: "book_amenity",
        label: `Book ${amenity.name}`,
        amenityId: amenity.id,
        amenityName: amenity.name,
        date,
        startTime,
        endTime,
      },
      { type: "open", label: "Open Bookings", href: "/member/bookings" },
    ],
    provider: "heuristic",
    speak: true,
  };
}

function heuristicIntent(message: string, communityId?: string): AssistantReply {
  const m = message.toLowerCase();
  const actions: AiAction[] = [];
  const hideGolf = Boolean(
    communityId &&
      (communityId === "harbor-pointe" ||
        communityId === "willow-creek" ||
        communityId === "alliant" ||
        communityId === "oceanside-residents"),
  );
  const isOceanside = communityId === "oceanside-residents";

  if (
    /vendor|club pro|tennis pro|golf pro|lesson with/.test(m) &&
    isOceanside
  ) {
    return {
      reply:
        "Oceanside Residents does not have in-app vendors or pros yet. Use Amenities to book tennis courts, the golf simulator, theatre, grills, Club Room, Sports Lounge, or Wine Vault.",
      actions: [{ type: "open", label: "Amenities", href: "/member/amenities" }],
      provider: "heuristic",
    };
  }

  if (/grab\s*(&|and)?\s*go|fridge|concession|rfid/.test(m)) {
    if (isOceanside) {
      return {
        reply:
          "Oceanside Residents does not have Grab & Go. Use Amenities to book tennis, the golf simulator, theatre, grills, or Club Room.",
        actions: [{ type: "open", label: "Amenities", href: "/member/amenities" }],
        provider: "heuristic",
      };
    }
    return {
      reply:
        "Grab & Go unlocks with RFID, member ID, app QR, or card. Walk out and items charge to your house account.",
      actions: [{ type: "open", label: "Open Grab & Go", href: "/member/grab-go" }],
      provider: "heuristic",
    };
  }

  if (/eat[\s-]?in|dine|restaurant|order food|takeout|dinner|lunch/.test(m)) {
    if (isOceanside) {
      return {
        reply:
          "Oceanside Residents does not have a club restaurant or Grab & Go. Outdoor grills, the Club Room, Sports Lounge, and Wine Vault are available for resident gatherings.",
        actions: [{ type: "open", label: "Amenities", href: "/member/amenities" }],
        provider: "heuristic",
      };
    }
    const eatIn = /eat[\s-]?in|table|dine/.test(m);
    actions.push({
      type: "prefill_dining",
      label: eatIn ? "Order eat-in" : "Order ahead",
      fulfillment: eatIn ? "eat_in" : "takeout",
      restaurant: "Casual Dining",
    });
    actions.push({ type: "open", label: "Open Dining", href: "/member/dining" });
    return {
      reply: eatIn
        ? "For eat-in, order ahead with a party size and arrival time — we’ll hold a table and time the kitchen so food is ready when you arrive."
        : "You can order takeout with a pickup time, or eat-in to reserve a table with food timed for arrival.",
      actions,
      provider: "heuristic",
    };
  }

  if (/age\s*out|dependent|junior|household|kid|child/.test(m)) {
    if (isOceanside) {
      return {
        reply:
          "Oceanside Residents is a condo community — there is no club dependent age-out membership policy. Contact management for household or account questions.",
        actions: [{ type: "open", label: "Contact management", href: "/member/contact" }],
        provider: "heuristic",
      };
    }
    return {
      reply:
        "Dependents typically age out at 25 and must share the sponsor address. You’ll get warnings before privileges end.",
      actions: [{ type: "open", label: "Household membership", href: "/member/household" }],
      provider: "heuristic",
    };
  }

  if (/rejoin|resign|quit|leave.*club|waiting period/.test(m)) {
    return {
      reply:
        "Some clubs require a waiting period (often one year) after resignation before you can rejoin. Staff can adjust that policy.",
      actions: [{ type: "open", label: "Membership status", href: "/member/membership" }],
      provider: "heuristic",
    };
  }

  if (/tournament|court number|doubles|partner/.test(m)) {
    if (isOceanside) {
      return {
        reply:
          "Oceanside Residents does not run club tournaments in the app yet. You can still book tennis courts under Amenities.",
        actions: [
          { type: "open", label: "Amenities", href: "/member/amenities" },
          { type: "open", label: "Bookings", href: "/member/bookings" },
        ],
        provider: "heuristic",
      };
    }
    return {
      reply:
        "Tennis court assignments send SMS/push to you and your doubles partner email when set. Check tournaments for brackets and times.",
      actions: [{ type: "open", label: "Tournaments", href: "/member/tournaments" }],
      provider: "heuristic",
    };
  }

  if (/hours|open|close|schedule/.test(m) && !/book|reserve/.test(m)) {
    return {
      reply: hideGolf
        ? "Community venues post weekly hours for dining, courts, spa, and the clubhouse."
        : "Club venues post weekly hours for dining, courts, golf, spa, and more.",
      actions: [{ type: "open", label: "Hours of operation", href: "/member/hours" }],
      provider: "heuristic",
    };
  }

  if (/f&b|minimum|dues|payment|statement|hoa|clickpay/.test(m)) {
    if (isOceanside) {
      return {
        reply:
          "Plaza at Oceanside HOA assessments are paid on ClickPay (clickpay.com/pay) — the same portal residents use today. Open Payments in Easy Life for the ClickPay link. In-app Stripe checkout will replace this once unit fees and Stripe are configured.",
        actions: [
          { type: "open", label: "Payments", href: "/member/payments" },
          {
            type: "open",
            label: "Open ClickPay",
            href: "https://www.clickpay.com/pay",
          },
        ],
        provider: "heuristic",
      };
    }
    return {
      reply: hideGolf
        ? "View HOA assessments, statements, and payments in the Payments section. This community has no F&B minimum."
        : "View statements, F&B minimum progress, and payments in the Payments section.",
      actions: [{ type: "open", label: "Payments", href: "/member/payments" }],
      provider: "heuristic",
    };
  }

  if (isOceanside) {
    return {
      reply:
        "I can reserve any amenity by name — billiard table, theater, grill, golf simulator, board room, massage room, or a tennis court. Tell me the room and a time.",
      actions: [
        { type: "open", label: "Amenities", href: "/member/amenities" },
        { type: "open", label: "Bookings", href: "/member/bookings" },
        { type: "open", label: "Payments", href: "/member/payments" },
      ],
      provider: "heuristic",
    };
  }

  return {
    reply:
      "I can reserve any named amenity, book a lesson with a club pro, and help with dining, Grab & Go, and hours. Name the room — billiard table, theater, grill, spa — or say which sport the lesson is.",
    actions: [
      { type: "open", label: "Dining", href: "/member/dining" },
      { type: "open", label: "Bookings", href: "/member/bookings" },
      { type: "open", label: "Vendors", href: "/member/vendors" },
    ],
    provider: "heuristic",
  };
}

async function clubContext(communityId: string): Promise<string> {
  const [dep, rejoin, amenities, pros] = await Promise.all([
    ensureDependentPolicy(communityId),
    ensureRejoinPolicy(communityId),
    listAmenities(communityId),
    ensureLessonProsForCommunity(communityId).then(() => listClubPros(communityId)),
  ]);
  const amenityNames = amenities
    .filter((a) => a.playable)
    .slice(0, 12)
    .map((a) => a.name)
    .join(", ");
  const vendorNames = pros
    .slice(0, 10)
    .map((p) => p.name)
    .join(", ");
  return [
    `Dependent age-out: ${dep.ageOutYears} years; same address required: ${dep.requireSameAddress}; warn ${dep.warnDaysBefore} days ahead.`,
    `Rejoin wait enabled: ${rejoin.enabled}; wait days: ${rejoin.waitDays}.`,
    "Dining supports eat_in (table + food ready), takeout, and delivery.",
    "Grab & Go: RFID / member ID / app / card unlock, then walk out — house account charge.",
    "Vendors on this app = club pros and service providers listed in your club app (not random outside vendors).",
    `Bookable amenities: ${amenityNames || "none seeded"}.`,
    `In-app vendors (pros): ${vendorNames || "none seeded"}.`,
  ].join("\n");
}

export async function runConfirmAction(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  action: AiAction;
}): Promise<AssistantReply> {
  const { action } = input;
  switch (action.type) {
    case "book_amenity":
      return executeAmenityBook({
        communityId: input.communityId,
        memberEmail: input.memberEmail,
        memberName: input.memberName,
        amenityId: action.amenityId,
        amenityName: action.amenityName,
        date: action.date,
        startTime: action.startTime,
        endTime: action.endTime,
      });
    case "book_vendor":
      return executeVendorBook({
        communityId: input.communityId,
        memberEmail: input.memberEmail,
        memberName: input.memberName,
        providerId: action.providerId,
        providerName: action.providerName,
        sport: action.sport,
        date: action.date,
        startTime: action.startTime,
        durationMinutes: action.durationMinutes,
      });
    case "open":
    case "prefill_dining":
    case "suggest_booking":
    case "booked":
      return {
        reply: "Tap the button to continue, or tell me what to book.",
        actions: [action],
        provider: "heuristic",
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function runClubAssistant(input: {
  communityId?: string;
  userEmail: string;
  memberName?: string;
  message: string;
  confirmAction?: AiAction;
}): Promise<AssistantReply> {
  const communityId = input.communityId?.trim() || "__missing_community__";
  const email = input.userEmail.toLowerCase();
  const memberName = input.memberName?.trim() || email.split("@")[0] || "Member";
  const message = input.message.trim();

  if (input.confirmAction) {
    const confirmed = await runConfirmAction({
      communityId,
      memberEmail: email,
      memberName,
      action: input.confirmAction,
    });
    await prisma.aiChatMessage.create({
      data: {
        communityId,
        userEmail: email,
        role: "user",
        content: message || `Confirm: ${input.confirmAction.label}`,
      },
    });
    await prisma.aiChatMessage.create({
      data: {
        communityId,
        userEmail: email,
        role: "assistant",
        content: confirmed.reply,
        actionsJson: JSON.stringify(confirmed.actions),
      },
    });
    return confirmed;
  }

  if (!message) {
    return {
      reply: "Ask me to book a court or an in-app vendor, or ask about dining and Grab & Go.",
      actions: [],
      provider: "heuristic",
    };
  }

  await prisma.aiChatMessage.create({
    data: {
      communityId,
      userEmail: email,
      role: "user",
      content: message,
    },
  });

  let result: AssistantReply;
  const m = message.toLowerCase();
  const amenityMatches = await findAmenityCandidates(communityId, message);
  const askingHours =
    /\b(hours|open|close|closing|opening)\b/.test(m) &&
    !/\b(book|reserve|reservation)\b/.test(m);
  const lessonAsk =
    isVendorIntent(m) ||
    (/book|reserve|schedule/.test(m) && /lesson|pro\b|coach/.test(m));
  // Lesson/pro intent must win even when sport amenity names also match
  // ("book a tennis lesson" must not auto-reserve a court).
  if (lessonAsk) {
    result = await handleVendorBookingIntent({
      communityId,
      memberEmail: email,
      memberName,
      message,
    });
  } else if (
    !askingHours &&
    (amenityMatches.length > 0 || /\b(book|reserve|reservation)\b/.test(m))
  ) {
    result = await handleAmenityBookingIntent({
      communityId,
      memberEmail: email,
      memberName,
      message,
    });
  } else {
    result = heuristicIntent(message, communityId);
  }

  if (isOpenAiConfigured() && !result.speak) {
    const ctx = await clubContext(communityId);
    const history = await prisma.aiChatMessage.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const hist = history
      .reverse()
      .map((h) => `${h.role}: ${h.content}`)
      .join("\n");
    const raw = await openAiChat({
      maxTokens: 350,
      messages: [
        {
          role: "system",
          content: `You are Barnaby, the resident AI concierge. Speak like a calm, older English butler: brief, precise, and courteous. Book and reserve mean the same thing. Match the amenity the member named (billiard room, theatre, grill, tennis court, or any other listed amenity) — never substitute a tennis court unless they asked for tennis. When members say vendor they mean in-app club pros, not outside contractors. Club facts:\n${ctx}\nReply with JSON only: {"reply":"...","actions":[{"type":"open","label":"...","href":"/member/..."}]}`,
        },
        { role: "user", content: `History:\n${hist}\n\nLatest: ${message}` },
      ],
    });
    if (raw) {
      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(start, end + 1)) as {
          reply?: string;
          actions?: AiAction[];
        };
        if (parsed.reply) {
          result = {
            reply: parsed.reply,
            actions: Array.isArray(parsed.actions) ? parsed.actions : result.actions,
            provider: "openai",
            speak: result.speak,
          };
        }
      } catch {
        // keep heuristic
      }
    }
  }

  await prisma.aiChatMessage.create({
    data: {
      communityId,
      userEmail: email,
      role: "assistant",
      content: result.reply,
      actionsJson: JSON.stringify(result.actions),
    },
  });

  return result;
}

export async function listAssistantHistory(userEmail: string, take = 20) {
  return prisma.aiChatMessage.findMany({
    where: { userEmail: userEmail.toLowerCase() },
    orderBy: { createdAt: "asc" },
    take,
  });
}
