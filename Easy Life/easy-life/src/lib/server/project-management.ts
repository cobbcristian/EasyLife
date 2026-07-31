import { prisma } from "@/lib/server/prisma";
import { appPath } from "@/lib/server/app-url";
import { sendEmail } from "@/lib/server/notify";
import { sendPushToUser } from "@/lib/server/push";
import { brandAssets } from "@/lib/brand-assets";
import {
  IRON_CREST_LAWN_PROVIDER_EMAIL,
} from "@/lib/iron-lake-demo";

export const IRON_CREST_DINING_PROVIDER_EMAIL = "dining@theclubatironlake.com";
export const IRON_CREST_DINING_BUSINESS_NAME = "Clubhouse Dining";

export async function addMemberInboxItem(input: {
  userEmail: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  return prisma.memberInboxItem.create({
    data: {
      userEmail: input.userEmail.trim().toLowerCase(),
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}

export async function listMemberInbox(userEmail: string) {
  return prisma.memberInboxItem.findMany({
    where: { userEmail: userEmail.trim().toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function countUnreadMemberInbox(userEmail: string) {
  return prisma.memberInboxItem.count({
    where: { userEmail: userEmail.trim().toLowerCase(), read: false },
  });
}

export async function markMemberInboxRead(userEmail: string) {
  return prisma.memberInboxItem.updateMany({
    where: { userEmail: userEmail.trim().toLowerCase(), read: false },
    data: { read: true },
  });
}

export async function ensureSeedMemberInbox(
  userEmail: string,
  clubName?: string | null,
) {
  const email = userEmail.trim().toLowerCase();
  const count = await prisma.memberInboxItem.count({ where: { userEmail: email } });
  if (count > 0) return;
  const welcomeClub = clubName?.trim() || "your club";
  await prisma.memberInboxItem.createMany({
    data: [
      {
        userEmail: email,
        title: "Welcome",
        body: `Welcome to ${welcomeClub}. Explore the app to see how much easier your life can be!`,
        href: "/member",
      },
      {
        userEmail: email,
        title: "Service Invitation",
        body: "You have been invited to a scheduled service. Open Book to review and respond.",
        href: "/member/bookings",
      },
    ],
  });
}

export async function createEventInvites(input: {
  eventId: string;
  invites: Array<{ email: string; name: string }>;
  clinic?: {
    memberFeeCents: number;
    requirePayment: boolean;
    capacity: number | null;
    sport: string;
  };
}) {
  if (input.invites.length === 0) return [];
  const event = await prisma.communityEvent.findUnique({
    where: { id: input.eventId },
  });
  const title = event?.title ?? "an event";
  const hostName = event?.createdBy ?? "A neighbor";
  const windowLabel = [event?.time, event?.endTime].filter(Boolean).join("–");
  const whenLabel = event
    ? `${event.date}${windowLabel ? ` ${windowLabel}` : ""}`
    : "";
  const acceptUrl = appPath(`/member/events/${input.eventId}`);
  const isClinic = Boolean(input.clinic) || /clinic/i.test(event?.category ?? "");
  const pushTitle = isClinic
    ? `${hostName} invited you to ${title}${windowLabel ? ` · ${windowLabel}` : ""}`
    : `${hostName} invited you to ${title}${windowLabel ? ` ${windowLabel}` : ""}`;

  let clubLabel = "your club";
  if (event?.communityId) {
    const community = await prisma.community.findUnique({
      where: { id: event.communityId },
      select: { appDisplayName: true, name: true },
    });
    clubLabel = community?.appDisplayName ?? community?.name ?? "your club";
  }

  const rows = await Promise.all(
    input.invites.map(async (invite) => {
      const email = invite.email.trim().toLowerCase();
      const row = await prisma.eventInvite.upsert({
        where: {
          eventId_memberEmail: {
            eventId: input.eventId,
            memberEmail: email,
          },
        },
        create: {
          eventId: input.eventId,
          memberEmail: email,
          memberName: invite.name,
          status: "pending",
        },
        update: {
          memberName: invite.name,
          status: "pending",
        },
      });

      const feeLines: string[] = [];
      if (input.clinic?.requirePayment && input.clinic.memberFeeCents > 0) {
        const member = (input.clinic.memberFeeCents / 100).toFixed(2);
        const guest = ((input.clinic.memberFeeCents * 2) / 100).toFixed(2);
        feeLines.push(
          `Member fee: $${member}. Non-members pay double ($${guest}).`,
        );
      }
      if (input.clinic?.capacity) {
        feeLines.push(`Spots are limited to ${input.clinic.capacity} players — reply Going soon.`);
      }

      const body = [
        `${hostName} invited you to ${title}${whenLabel ? ` (${whenLabel})` : ""}.`,
        ...feeLines,
        `Open ${clubLabel} to say Going or Not going.`,
      ].join(" ");

      await addMemberInboxItem({
        userEmail: email,
        title: isClinic ? "Clinic Invitation" : "Event Invitation",
        body,
        href: `/member/events/${input.eventId}`,
      });
      await sendEmail({
        to: email,
        subject: pushTitle,
        body: [
          `Hi ${invite.name || "there"},`,
          "",
          body,
          "",
          `Respond here: ${acceptUrl}`,
          "",
          `— ${clubLabel}`,
        ].join("\n"),
      });
      await sendPushToUser(email, {
        title: pushTitle,
        body: `Tap to respond${event?.date ? ` · ${event.date}` : ""}`,
        url: acceptUrl,
      });
      return row;
    }),
  );
  return rows;
}

export async function listEventInvitesForMember(memberEmail: string) {
  return prisma.eventInvite.findMany({
    where: { memberEmail: memberEmail.trim().toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
}

export async function autoRsvpPromotedEvents(input: {
  communityId?: string | null;
  memberEmail: string;
  memberName: string;
}) {
  const communityId = input.communityId?.trim() || "__missing_community__";
  const memberEmail = input.memberEmail.trim().toLowerCase();
  const memberName = input.memberName.trim() || memberEmail;
  const events = await prisma.communityEvent.findMany({
    where: {
      communityId,
      OR: [{ isPromoted: true }, { category: "community" }],
    },
    select: { id: true },
  });
  if (events.length === 0) return;

  // SQLite: createMany has no skipDuplicates. Insert only missing rows;
  // ignore P2002 if calendar/mobile race the same RSVP.
  const existing = await prisma.eventRsvp.findMany({
    where: {
      memberEmail,
      eventId: { in: events.map((event) => event.id) },
    },
    select: { eventId: true },
  });
  const have = new Set(existing.map((row) => row.eventId));
  const missing = events.filter((event) => !have.has(event.id));
  if (missing.length === 0) return;

  try {
    await prisma.eventRsvp.createMany({
      data: missing.map((event) => ({
        eventId: event.id,
        memberEmail,
        memberName,
      })),
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code !== "P2002") throw error;
  }
}

export async function listGroupPosts(groupId: string, viewerEmail?: string) {
  const posts = await prisma.groupPost.findMany({
    where: { groupId },
    include: {
      likes: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const email = viewerEmail?.trim().toLowerCase();
  return posts.map((p) => ({
    id: p.id,
    groupId: p.groupId,
    authorEmail: p.authorEmail,
    authorName: p.authorName,
    body: p.body,
    imageUrl: p.imageUrl,
    eventId: p.eventId,
    createdAt: p.createdAt.toISOString(),
    likeCount: p.likes.length,
    likedByMe: email ? p.likes.some((l) => l.memberEmail === email) : false,
    comments: p.comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
}

export async function createGroupPost(input: {
  groupId: string;
  communityId?: string | null;
  authorEmail: string;
  authorName: string;
  body: string;
  imageUrl?: string | null;
  eventId?: string | null;
}) {
  return prisma.groupPost.create({
    data: {
      groupId: input.groupId,
      communityId: input.communityId?.trim() || "__missing_community__",
      authorEmail: input.authorEmail.trim().toLowerCase(),
      authorName: input.authorName,
      body: input.body.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      eventId: input.eventId ?? null,
    },
  });
}

export async function toggleGroupPostLike(input: {
  postId: string;
  memberEmail: string;
}) {
  const email = input.memberEmail.trim().toLowerCase();
  const existing = await prisma.groupPostLike.findUnique({
    where: {
      postId_memberEmail: { postId: input.postId, memberEmail: email },
    },
  });
  if (existing) {
    await prisma.groupPostLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await prisma.groupPostLike.create({
    data: { postId: input.postId, memberEmail: email },
  });
  return { liked: true };
}

export async function addGroupPostComment(input: {
  postId: string;
  authorEmail: string;
  authorName: string;
  body: string;
}) {
  return prisma.groupPostComment.create({
    data: {
      postId: input.postId,
      authorEmail: input.authorEmail.trim().toLowerCase(),
      authorName: input.authorName,
      body: input.body.trim(),
    },
  });
}

export async function listProviderOfferings(
  providerEmail: string,
  kind?: "activity" | "service",
) {
  return prisma.providerOffering.findMany({
    where: {
      providerEmail: providerEmail.trim().toLowerCase(),
      ...(kind ? { kind } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertProviderOffering(input: {
  id?: string;
  providerEmail: string;
  name: string;
  description?: string;
  kind?: "activity" | "service";
  priceLabel?: string;
  priceCents?: number;
  imageUrl?: string | null;
}) {
  const email = input.providerEmail.trim().toLowerCase();
  if (input.id) {
    return prisma.providerOffering.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description ?? "",
        kind: input.kind ?? "activity",
        priceLabel: input.priceLabel ?? "Free",
        priceCents: input.priceCents ?? 0,
        imageUrl: input.imageUrl ?? null,
      },
    });
  }
  return prisma.providerOffering.create({
    data: {
      providerEmail: email,
      name: input.name,
      description: input.description ?? "",
      kind: input.kind ?? "activity",
      priceLabel: input.priceLabel ?? "Free",
      priceCents: input.priceCents ?? 0,
      imageUrl: input.imageUrl ?? null,
    },
  });
}

export async function deleteProviderOffering(id: string, providerEmail: string) {
  const row = await prisma.providerOffering.findFirst({
    where: { id, providerEmail: providerEmail.trim().toLowerCase() },
  });
  if (!row) return false;
  await prisma.providerOffering.delete({ where: { id } });
  return true;
}

const CASSIE_PROVIDER_EMAIL = "cassiesmeticuloustouch@gmail.com";

const LAWN_SERVICE_SEEDS = [
  {
    name: "Weekly Lawn Mowing",
    description: "Mow, edge, and blow for standard residential lots.",
    priceLabel: "$65",
    priceCents: 6500,
  },
  {
    name: "Hedge Trimming",
    description: "Shape hedges and ornamental shrubs along lot lines and entries.",
    priceLabel: "$140",
    priceCents: 14000,
  },
  {
    name: "Brush Removal",
    description: "Clear overgrowth, saplings, and brush piles from wooded edges.",
    priceLabel: "$225",
    priceCents: 22500,
  },
  {
    name: "Forestry Mulching",
    description: "On-site mulching for wooded lots and fence-line clearing.",
    priceLabel: "$450",
    priceCents: 45000,
  },
  {
    name: "Debris Pick Up",
    description: "Haul storm debris, limbs, and yard waste off-site.",
    priceLabel: "$95",
    priceCents: 9500,
  },
  {
    name: "Edging & Line Trimming",
    description: "Hard-edge sidewalks, drives, and beds after mowing.",
    priceLabel: "$75",
    priceCents: 7500,
  },
] as const;

/** Bookable lawn “activities” for the provider Activities tab (not tennis courts). */
const LAWN_ACTIVITY_SEEDS = [
  {
    name: "Spring Cleanup Package",
    description: "Beds, leaf blow, and first mow of the season.",
    priceLabel: "$185",
    priceCents: 18500,
  },
  {
    name: "Irrigation Tune-Up Visit",
    description: "Zone check, head adjust, and timer review with written notes.",
    priceLabel: "$95",
    priceCents: 9500,
  },
  {
    name: "Mulch Delivery & Spread",
    description: "Delivery and bed install — pine bark or cocoa options.",
    priceLabel: "$320",
    priceCents: 32000,
  },
  {
    name: "Storm Debris Response",
    description: "Priority limb and debris haul after heavy weather.",
    priceLabel: "$150",
    priceCents: 15000,
  },
] as const;

async function purgeWrongLawnOfferings(email: string) {
  await prisma.providerOffering.deleteMany({
    where: {
      providerEmail: email,
      OR: [
        { name: { startsWith: "Court " } },
        { description: { contains: "Har-Tru" } },
        { name: "Standard Clean" },
        { name: "Move-out Clean" },
        { name: "Carpet Refresh" },
        { name: "Full House Cleaning" },
        { name: "Carpet Cleaning" },
      ],
    },
  });
}

async function upsertLawnOfferings(
  email: string,
  kind: "service" | "activity",
  seeds: readonly {
    name: string;
    description: string;
    priceLabel: string;
    priceCents: number;
  }[],
) {
  const imageFor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("edging") || n.includes("line trim")) return brandAssets.serviceLawnEdging;
    if (n.includes("hedge")) return brandAssets.serviceLawnHedge;
    if (n.includes("brush")) return brandAssets.serviceLawnBrush;
    if (n.includes("forestry") || n.includes("mulch")) return brandAssets.serviceLawnMulching;
    if (n.includes("debris") || n.includes("storm")) return brandAssets.serviceLawnDebris;
    return brandAssets.serviceLandscaping;
  };

  for (const row of seeds) {
    const imageUrl = imageFor(row.name);
    const matches = await prisma.providerOffering.findMany({
      where: { providerEmail: email, name: row.name, kind },
      orderBy: { createdAt: "asc" },
    });
    const existing = matches[0];
    if (matches.length > 1) {
      await prisma.providerOffering.deleteMany({
        where: { id: { in: matches.slice(1).map((m) => m.id) } },
      });
    }
    if (existing) {
      await prisma.providerOffering.update({
        where: { id: existing.id },
        data: {
          description: row.description,
          priceLabel: row.priceLabel,
          priceCents: row.priceCents,
          imageUrl,
        },
      });
      continue;
    }
    await prisma.providerOffering.create({
      data: {
        providerEmail: email,
        name: row.name,
        description: row.description,
        kind,
        priceLabel: row.priceLabel,
        priceCents: row.priceCents,
        imageUrl,
      },
    });
  }
}

async function ensureIronCrestLawnOfferings(email: string) {
  await purgeWrongLawnOfferings(email);
  await upsertLawnOfferings(email, "service", LAWN_SERVICE_SEEDS);
  await upsertLawnOfferings(email, "activity", LAWN_ACTIVITY_SEEDS);
}

async function ensureCassieProviderOfferings(email: string) {
  const activityCount = await prisma.providerOffering.count({
    where: { providerEmail: email, kind: "activity" },
  });
  if (activityCount === 0) {
    await prisma.providerOffering.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({
        providerEmail: email,
        name: `Court ${i + 1}`,
        description: "Har-Tru Hydro-Grid playing court",
        kind: "activity",
        priceLabel: "Free",
        priceCents: 0,
      })),
    });
  }
  const serviceCount = await prisma.providerOffering.count({
    where: { providerEmail: email, kind: "service" },
  });
  if (serviceCount === 0) {
    await prisma.providerOffering.createMany({
      data: [
        {
          providerEmail: email,
          name: "Standard Clean",
          description: "2–3 bedroom deep clean",
          kind: "service",
          priceLabel: "$150",
          priceCents: 15000,
        },
        {
          providerEmail: email,
          name: "Move-out Clean",
          description: "Full property turnover clean",
          kind: "service",
          priceLabel: "$275",
          priceCents: 27500,
        },
        {
          providerEmail: email,
          name: "Carpet Refresh",
          description: "Room-by-room carpet shampoo",
          kind: "service",
          priceLabel: "$90",
          priceCents: 9000,
        },
      ],
    });
  }
}

async function ensureIronCrestDiningOfferings(email: string) {
  await prisma.providerOffering.deleteMany({
    where: {
      providerEmail: email,
      OR: [
        { name: { startsWith: "Court " } },
        { description: { contains: "Har-Tru" } },
        { name: "Standard Clean" },
        { name: "Move-out Clean" },
        { name: "Carpet Refresh" },
        { name: "Full House Cleaning" },
        { name: "Carpet Cleaning" },
        { name: "Weekly Lawn Mowing" },
        { name: "Hedge Trimming" },
      ],
    },
  });

  const serviceSeeds = [
    {
      name: "Clubhouse Dinner for Two",
      description: "Two-course dinner in the Clubhouse Restaurant — member pricing.",
      priceLabel: "$85",
      priceCents: 8500,
      imageUrl: brandAssets.featuredDining,
    },
    {
      name: "Private Dining — Quarry Room",
      description: "Private room buyout for up to 16 guests with set menu.",
      priceLabel: "$650",
      priceCents: 65000,
      imageUrl: brandAssets.amenityClubhouse,
    },
    {
      name: "Terrace Lunch Package",
      description: "Plated lunch on the clubhouse terrace for four.",
      priceLabel: "$160",
      priceCents: 16000,
      imageUrl: brandAssets.galleryClubhouseTerrace,
    },
    {
      name: "Wine Pairing Dinner",
      description: "Four-course chef tasting with sommelier pairings.",
      priceLabel: "$145",
      priceCents: 14500,
      imageUrl: brandAssets.foodCatchOfDay,
    },
  ] as const;

  const activitySeeds = [
    {
      name: "Saturday Brunch Service",
      description: "Clubhouse brunch seating blocks 10:00am–2:00pm.",
      priceLabel: "$45",
      priceCents: 4500,
      imageUrl: brandAssets.foodQuarryBurger,
    },
    {
      name: "Member Mixer — Appetizers",
      description: "Standing reception with passed appetizers for 20.",
      priceLabel: "$380",
      priceCents: 38000,
      imageUrl: brandAssets.foodCaesarSalad,
    },
    {
      name: "Grab & Go Prep Block",
      description: "Kitchen prep window for Golf Shop Grab & Go restock.",
      priceLabel: "Staff",
      priceCents: 0,
      imageUrl: brandAssets.foodIcedTea,
    },
  ] as const;

  for (const kind of ["service", "activity"] as const) {
    const seeds = kind === "service" ? serviceSeeds : activitySeeds;
    for (const row of seeds) {
      const matches = await prisma.providerOffering.findMany({
        where: { providerEmail: email, name: row.name, kind },
        orderBy: { createdAt: "asc" },
      });
      const existing = matches[0];
      if (matches.length > 1) {
        await prisma.providerOffering.deleteMany({
          where: { id: { in: matches.slice(1).map((m) => m.id) } },
        });
      }
      if (existing) {
        await prisma.providerOffering.update({
          where: { id: existing.id },
          data: {
            description: row.description,
            priceLabel: row.priceLabel,
            priceCents: row.priceCents,
            imageUrl: row.imageUrl,
          },
        });
        continue;
      }
      await prisma.providerOffering.create({
        data: {
          providerEmail: email,
          name: row.name,
          description: row.description,
          kind,
          priceLabel: row.priceLabel,
          priceCents: row.priceCents,
          imageUrl: row.imageUrl,
        },
      });
    }
  }
}

export async function ensureSeedProviderOfferings(providerEmail: string) {
  const email = providerEmail.trim().toLowerCase();
  if (email === IRON_CREST_LAWN_PROVIDER_EMAIL) {
    await ensureIronCrestLawnOfferings(email);
    return;
  }
  if (email === IRON_CREST_DINING_PROVIDER_EMAIL) {
    await ensureIronCrestDiningOfferings(email);
    return;
  }
  if (email === CASSIE_PROVIDER_EMAIL) {
    await ensureCassieProviderOfferings(email);
    return;
  }

  const activityCount = await prisma.providerOffering.count({
    where: { providerEmail: email, kind: "activity" },
  });
  if (activityCount === 0) {
    await prisma.providerOffering.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({
        providerEmail: email,
        name: `Court ${i + 1}`,
        description: "Har-Tru Hydro-Grid playing court",
        kind: "activity",
        priceLabel: "Free",
        priceCents: 0,
      })),
    });
  }
  const serviceCount = await prisma.providerOffering.count({
    where: { providerEmail: email, kind: "service" },
  });
  if (serviceCount === 0) {
    await prisma.providerOffering.createMany({
      data: [
        {
          providerEmail: email,
          name: "Standard Clean",
          description: "2–3 bedroom deep clean",
          kind: "service",
          priceLabel: "$150",
          priceCents: 15000,
        },
        {
          providerEmail: email,
          name: "Move-out Clean",
          description: "Full property turnover clean",
          kind: "service",
          priceLabel: "$275",
          priceCents: 27500,
        },
        {
          providerEmail: email,
          name: "Carpet Refresh",
          description: "Room-by-room carpet shampoo",
          kind: "service",
          priceLabel: "$90",
          priceCents: 9000,
        },
      ],
    });
  }
}
