import { prisma } from "@/lib/server/prisma";
import { ensureSeeded } from "@/lib/server/db";
import { ensureIronLakeDemoChats } from "@/lib/server/iron-lake-seed";
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
import { createContactMessage, createMemberCharge } from "@/lib/server/records";
import { imageForProviderCategory } from "@/lib/brand-assets";
import {
  assertEmailsBelongToCommunity,
} from "@/lib/server/chat-community-scope";
import { sendPushToUser } from "@/lib/server/push";
import {
  IRON_CREST_LAWN_PROVIDER_EMAIL,
  IRON_LAKE_COMMUNITY_ID,
} from "@/lib/iron-lake-demo";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HERITAGE_BAY_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT, SPANISH_WELLS_TENANT, HARBOR_POINTE_TENANT, WILLOW_CREEK_TENANT, ALLIANT_TENANT } from "@/lib/tenant";

export const LOCAL_PRO_CATEGORIES = [
  "Gardening",
  "Painting",
  "Pool",
  "Landscaping",
  "Cleaning",
  "Pest Control",
  "Handyman",
  "Other",
] as const;

function communityOrDefault(communityId: string | null | undefined): string {
  // Never fall back to another club — empty results beat cross-tenant leaks.
  return communityId?.trim() || "__missing_community__";
}

function isIronLakeInboxUser(email: string, communityId: string | null): boolean {
  const e = email.toLowerCase();
  if (communityId === IRON_LAKE_COMMUNITY_ID) return true;
  if (e.endsWith("@theclubatironlake.com")) return true;
  if (e.endsWith("@ironcrest.com")) return true;
  if (e === IRON_CREST_LAWN_PROVIDER_EMAIL.toLowerCase()) return true;
  return false;
}

async function recomputeProviderRating(providerId: string): Promise<number | null> {
  const reviews = await prisma.providerReview.findMany({
    where: { providerId },
    select: { rating: true },
  });
  if (reviews.length === 0) {
    await prisma.provider.update({
      where: { id: providerId },
      data: { rating: null },
    });
    return null;
  }
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const rounded = Math.round(avg * 10) / 10;
  await prisma.provider.update({
    where: { id: providerId },
    data: { rating: rounded },
  });
  return rounded;
}

async function seedLocalProsIfNeeded(communityId: string): Promise<void> {
  const count = await prisma.provider.count({
    where: { communityId, listingKind: "local_pro" },
  });
  if (count > 0) return;

  const seeds = [
    {
      name: "GreenScape Gardens",
      category: "Gardening",
      description: "Weekly lawn care, mulch, and seasonal plantings for the community.",
      email: "greenscape@example.com",
      phone: "(352) 555-0142",
    },
    {
      name: "AquaClear Pool Service",
      category: "Pool",
      description: "Weekly pool cleaning, chemical balancing, and equipment checks.",
      email: "aquaclear@example.com",
      phone: "(352) 555-0188",
    },
    {
      name: "ColorCraft Painting",
      category: "Painting",
      description: "Interior and exterior painting for homes and common areas.",
      email: "colorcraft@example.com",
      phone: "(352) 555-0199",
    },
  ];

  for (const seed of seeds) {
    await prisma.provider.create({
      data: {
        communityId,
        name: seed.name,
        category: seed.category,
        type: "service",
        listingKind: "local_pro",
        description: seed.description,
        email: seed.email,
        phone: seed.phone,
        imageUrl: imageForProviderCategory(seed.category, "service", seed.name),
        escrowEnabled: true,
        calendarSharingEnabled: true,
        calendarShareFeeCents: 999,
        escrowFeeCents: 499,
        rating: 4.8,
      },
    });
  }
}

export type LocalProCard = {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string | null;
  email: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  escrowEnabled: boolean;
  calendarSharingEnabled: boolean;
  calendarShareFeeCents: number;
  escrowFeeCents: number;
};

export async function listLocalPros(communityId: string | null): Promise<LocalProCard[]> {
  await ensureSeeded();
  const cid = communityOrDefault(communityId);
  await seedLocalProsIfNeeded(cid);

  const rows = await prisma.provider.findMany({
    where: { communityId: cid, listingKind: "local_pro" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const cards: LocalProCard[] = [];
  for (const p of rows) {
    const reviewCount = await prisma.providerReview.count({ where: { providerId: p.id } });
    const imageUrl = imageForProviderCategory(p.category, p.type, p.name);
    if (p.imageUrl !== imageUrl) {
      await prisma.provider.update({ where: { id: p.id }, data: { imageUrl } });
    }
    cards.push({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      phone: p.phone,
      email: p.email,
      imageUrl,
      rating: reviewCount > 0 ? p.rating : null,
      reviewCount,
      escrowEnabled: p.escrowEnabled,
      calendarSharingEnabled: p.calendarSharingEnabled,
      calendarShareFeeCents: p.calendarShareFeeCents,
      escrowFeeCents: p.escrowFeeCents,
    });
  }
  return cards;
}

export async function listProviderReviews(providerId: string) {
  await ensureSeeded();
  return prisma.providerReview.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertProviderReview(input: {
  providerId: string;
  communityId: string | null;
  memberEmail: string;
  memberName: string;
  rating: number;
  comment?: string;
}) {
  await ensureSeeded();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } });
  if (!provider || provider.listingKind !== "local_pro") {
    return null;
  }

  const review = await prisma.providerReview.upsert({
    where: {
      providerId_memberEmail: {
        providerId: input.providerId,
        memberEmail: input.memberEmail.toLowerCase(),
      },
    },
    create: {
      providerId: input.providerId,
      communityId: communityOrDefault(input.communityId),
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      rating,
      comment: input.comment?.trim() ?? "",
    },
    update: {
      rating,
      comment: input.comment?.trim() ?? "",
      memberName: input.memberName,
    },
  });

  const avg = await recomputeProviderRating(input.providerId);
  return { review, rating: avg };
}

export type ChatThreadSummary = {
  id: string;
  kind: string;
  title: string;
  participantEmails: string[];
  participantNames: string[];
  lastMessage: string | null;
  lastAt: string | null;
  updatedAt: string;
};

export async function listChatThreadsForUser(
  email: string,
  communityId: string | null,
): Promise<ChatThreadSummary[]> {
  await ensureSeeded();
  const emailLower = email.toLowerCase();
  const ironLakeInbox = isIronLakeInboxUser(emailLower, communityId);
  const cid = ironLakeInbox ? IRON_LAKE_COMMUNITY_ID : communityOrDefault(communityId);

  let memberships = await prisma.chatParticipant.findMany({
    where: { userEmail: emailLower },
    select: { threadId: true },
  });

  // Seed only when this inbox is empty — full chat seed is too slow for every
  // Messages request on Vercel (was timing out → empty "No conversations yet").
  if (memberships.length === 0) {
    try {
      if (ironLakeInbox) {
        await ensureIronLakeDemoChats();
      } else if (cid === HUNTERS_RIDGE_TENANT.communityId) {
        await ensureHuntersRidgeDemoSeeded();
      } else if (cid === BONITA_BAY_TENANT.communityId) {
        await ensureBonitaBayDemoSeeded();
      } else if (cid === SHADOW_WOOD_TENANT.communityId) {
        await ensureShadowWoodDemoSeeded();
      } else if (cid === HERON_CREEK_TENANT.communityId) {
        await ensureHeronCreekDemoSeeded();
      } else if (cid === DEBARY_TENANT.communityId) {
        await ensureDebaryDemoSeeded();
      } else if (cid === JACARANDA_TENANT.communityId) {
        await ensureJacarandaDemoSeeded();
      } else if (cid === THE_DUNES_TENANT.communityId) {
        await ensureTheDunesDemoSeeded();
      } else if (cid === THE_NEST_TENANT.communityId) {
        await ensureTheNestDemoSeeded();
      } else if (cid === MARTIN_DOWNS_TENANT.communityId) {
        await ensureMartinDownsDemoSeeded();
      } else if (cid === SEAGATE_TENANT.communityId) {
        await ensureSeagateDemoSeeded();
      } else if (cid === COPPERLEAF_TENANT.communityId) {
        await ensureCopperleafDemoSeeded();
      } else if (cid === CLUB_RENAISSANCE_TENANT.communityId) {
        await ensureClubRenaissanceDemoSeeded();
      } else if (cid === FALLS_CLUB_TENANT.communityId) {
        await ensureFallsClubDemoSeeded();
      } else if (cid === ESTERO_TENANT.communityId) {
        await ensureEsteroDemoSeeded();
      } else if (cid === WILDCAT_RUN_TENANT.communityId) {
        await ensureWildcatRunDemoSeeded();
      } else if (cid === HIGHLAND_WOODS_TENANT.communityId) {
        await ensureHighlandWoodsDemoSeeded();
      } else if (cid === BONITA_NATIONAL_TENANT.communityId) {
        await ensureBonitaNationalDemoSeeded();
      } else if (cid === CARROLLWOOD_TENANT.communityId) {
        await ensureCarrollwoodDemoSeeded();
      } else if (cid === WINDSOR_TENANT.communityId) {
        await ensureWindsorDemoSeeded();
      } else if (cid === WORTHINGTON_TENANT.communityId) {
        await ensureWorthingtonDemoSeeded();
      } else if (cid === HERITAGE_BAY_TENANT.communityId) {
        await ensureHeritageBayDemoSeeded();
      } else if (cid === SPANISH_WELLS_TENANT.communityId) {
        await ensureSpanishWellsDemoSeeded();
      } else if (cid === HARBOR_POINTE_TENANT.communityId) {
        await ensureHarborPointeDemoSeeded();
      } else if (cid === WILLOW_CREEK_TENANT.communityId) {
        await ensureWillowCreekDemoSeeded();
      } else if (cid === ALLIANT_TENANT.communityId) {
        await ensureAlliantDemoSeeded();
      }
      // Never fall through to IronCrest — empty inbox beats wrong-club chats.
    } catch (err) {
      console.error("[listChatThreadsForUser] chat seed failed", err);
    }
    memberships = await prisma.chatParticipant.findMany({
      where: { userEmail: emailLower },
      select: { threadId: true },
    });
  }

  if (memberships.length === 0) return [];

  const threadIds = memberships.map((m) => m.threadId);
  const threads = await prisma.chatThread.findMany({
    where: { id: { in: threadIds }, communityId: cid },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: ChatThreadSummary[] = [];
  for (const thread of threads) {
    const participants = await prisma.chatParticipant.findMany({
      where: { threadId: thread.id },
    });
    const last = await prisma.chatMessage.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: "desc" },
    });
    const others = participants.filter((p) => p.userEmail !== emailLower);
    const title =
      thread.title ??
      (thread.kind === "dm"
        ? others.map((p) => p.userName).join(", ") || "Direct message"
        : "Group chat");
    summaries.push({
      id: thread.id,
      kind: thread.kind,
      title,
      participantEmails: participants.map((p) => p.userEmail),
      participantNames: participants.map((p) => p.userName),
      lastMessage: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      updatedAt: thread.updatedAt.toISOString(),
    });
  }
  return summaries;
}

export async function getOrCreateDmThread(input: {
  communityId: string | null;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
}) {
  await ensureSeeded();
  const cid = communityOrDefault(input.communityId);
  const a = input.fromEmail.toLowerCase();
  const b = input.toEmail.toLowerCase();
  if (a === b) return null;

  await assertEmailsBelongToCommunity([b], cid);

  const myThreads = await prisma.chatParticipant.findMany({
    where: { userEmail: a },
    select: { threadId: true },
  });
  for (const m of myThreads) {
    const thread = await prisma.chatThread.findUnique({ where: { id: m.threadId } });
    if (!thread || thread.kind !== "dm" || thread.communityId !== cid) continue;
    const peers = await prisma.chatParticipant.findMany({ where: { threadId: thread.id } });
    if (peers.length === 2 && peers.some((p) => p.userEmail === b)) {
      return thread;
    }
  }

  const thread = await prisma.chatThread.create({
    data: {
      communityId: cid,
      kind: "dm",
      title: null,
      createdBy: a,
    },
  });
  await prisma.chatParticipant.createMany({
    data: [
      { threadId: thread.id, userEmail: a, userName: input.fromName },
      { threadId: thread.id, userEmail: b, userName: input.toName },
    ],
  });
  return thread;
}

export async function createGroupChat(input: {
  communityId: string | null;
  createdByEmail: string;
  createdByName: string;
  title: string;
  members: { email: string; name: string }[];
}) {
  await ensureSeeded();
  const cid = communityOrDefault(input.communityId);
  const title = input.title.trim() || "Group chat";

  await assertEmailsBelongToCommunity(
    input.members.map((m) => m.email),
    cid,
  );

  const thread = await prisma.chatThread.create({
    data: {
      communityId: cid,
      kind: "group",
      title,
      createdBy: input.createdByEmail.toLowerCase(),
    },
  });

  const seen = new Set<string>();
  const participants = [
    {
      threadId: thread.id,
      userEmail: input.createdByEmail.toLowerCase(),
      userName: input.createdByName,
    },
    ...input.members.map((m) => ({
      threadId: thread.id,
      userEmail: m.email.toLowerCase(),
      userName: m.name,
    })),
  ].filter((p) => {
    if (seen.has(p.userEmail)) return false;
    seen.add(p.userEmail);
    return true;
  });

  await prisma.chatParticipant.createMany({ data: participants });
  return thread;
}

export async function assertChatParticipant(threadId: string, email: string) {
  return prisma.chatParticipant.findUnique({
    where: {
      threadId_userEmail: { threadId, userEmail: email.toLowerCase() },
    },
  });
}

/** Participant must be on the thread and the thread must belong to their club. */
export async function assertChatParticipantInCommunity(
  threadId: string,
  email: string,
  communityId: string | null,
) {
  const membership = await assertChatParticipant(threadId, email);
  if (!membership) return null;
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { communityId: true },
  });
  if (!thread || thread.communityId !== communityOrDefault(communityId)) {
    return null;
  }
  return membership;
}

export async function listChatMessages(threadId: string) {
  return prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
}

export async function postChatMessage(
  input: {
    threadId: string;
    authorEmail: string;
    authorName: string;
    body: string;
  },
  opts?: { bridgeToContact?: boolean },
) {
  const body = input.body.trim();
  if (!body) return null;
  const message = await prisma.chatMessage.create({
    data: {
      threadId: input.threadId,
      authorEmail: input.authorEmail.toLowerCase(),
      authorName: input.authorName,
      body,
    },
  });
  await prisma.chatThread.update({
    where: { id: input.threadId },
    data: { updatedAt: new Date() },
  });

  const peers = await prisma.chatParticipant.findMany({
    where: {
      threadId: input.threadId,
      userEmail: { not: input.authorEmail.toLowerCase() },
    },
    select: { userEmail: true },
  });
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  await Promise.all(
    peers.map((p) =>
      sendPushToUser(p.userEmail, {
        title: input.authorName,
        body: preview,
        url: "/member/messages",
      }).catch(() => 0),
    ),
  );

  if (opts?.bridgeToContact !== false) {
    await bridgeChatMessageToProviderInbox({
      threadId: input.threadId,
      authorEmail: input.authorEmail,
      authorName: input.authorName,
      body,
      peerEmails: peers.map((p) => p.userEmail),
    }).catch(() => {
      // Provider inbox bridge is best-effort so chat send still succeeds.
    });
  }

  return message;
}

async function bridgeChatMessageToProviderInbox(input: {
  threadId: string;
  authorEmail: string;
  authorName: string;
  body: string;
  peerEmails: string[];
}) {
  const authorEmail = input.authorEmail.toLowerCase();
  const author = await prisma.user.findUnique({
    where: { email: authorEmail },
    select: { role: true },
  });
  if (author?.role === "provider") return;

  const peerEmails = [
    ...new Set(
      input.peerEmails.map((email) => email.toLowerCase()).filter(Boolean),
    ),
  ].filter((email) => email !== authorEmail);
  if (peerEmails.length === 0) return;

  const [providerUsers, providerProfiles] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: peerEmails }, role: "provider" },
      select: { email: true },
    }),
    prisma.provider.findMany({
      where: { email: { in: peerEmails } },
      select: { email: true },
    }),
  ]);
  const providerEmails = new Set(
    [
      ...providerUsers.map((p) => p.email.toLowerCase()),
      ...providerProfiles
        .map((p) => p.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ],
  );
  if (providerEmails.size === 0) return;

  const thread = await prisma.chatThread.findUnique({
    where: { id: input.threadId },
    select: { communityId: true },
  });
  const looksLikeBooking =
    /book|availability|clean|schedule|request to book|service booking/i.test(
      input.body,
    );

  await Promise.all(
    [...providerEmails].map((recipient) =>
      createContactMessage({
        communityId: thread?.communityId ?? null,
        senderName: input.authorName,
        senderEmail: authorEmail,
        recipient,
        subject: looksLikeBooking ? "Service booking request" : "Message",
        message: input.body,
      }),
    ),
  );
}

export async function startSharedCalendar(input: {
  communityId: string | null;
  providerId: string;
  memberEmail: string;
  memberName: string;
}) {
  await ensureSeeded();
  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } });
  if (!provider || !provider.calendarSharingEnabled || provider.listingKind !== "local_pro") {
    return { error: "Calendar sharing is not available for this pro." as const };
  }

  const existing = await prisma.sharedCalendar.findUnique({
    where: {
      providerId_memberEmail: {
        providerId: input.providerId,
        memberEmail: input.memberEmail.toLowerCase(),
      },
    },
  });
  if (existing && existing.status === "active") {
    return { calendar: existing };
  }
  if (existing && existing.status === "pending_payment") {
    return { calendar: existing, needsPayment: true as const };
  }

  const feeCents = provider.calendarShareFeeCents;
  const charge = await createMemberCharge({
    communityId: communityOrDefault(input.communityId),
    memberEmail: input.memberEmail,
    memberName: input.memberName,
    category: "local_pro_calendar",
    description: `Shared calendar with ${provider.name}`,
    amount: feeCents / 100,
  });

  const calendar = await prisma.sharedCalendar.create({
    data: {
      communityId: communityOrDefault(input.communityId),
      providerId: provider.id,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      providerName: provider.name,
      status: "pending_payment",
      feeCents,
      chargeId: charge.id,
    },
  });

  return { calendar, needsPayment: true as const, charge };
}

export async function activateSharedCalendarByCharge(chargeId: string) {
  const calendar = await prisma.sharedCalendar.findFirst({ where: { chargeId } });
  if (!calendar) return null;
  return prisma.sharedCalendar.update({
    where: { id: calendar.id },
    data: { status: "active" },
  });
}

export async function listSharedCalendarsForMember(email: string) {
  await ensureSeeded();
  return prisma.sharedCalendar.findMany({
    where: { memberEmail: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSharedCalendarEvents(calendarId: string) {
  return prisma.sharedCalendarEvent.findMany({
    where: { calendarId },
    orderBy: { startsAt: "asc" },
  });
}

export async function addSharedCalendarEvent(input: {
  calendarId: string;
  title: string;
  note?: string;
  startsAt: string;
  endsAt: string;
  createdBy: string;
}) {
  const calendar = await prisma.sharedCalendar.findUnique({ where: { id: input.calendarId } });
  if (!calendar || calendar.status !== "active") return null;
  return prisma.sharedCalendarEvent.create({
    data: {
      calendarId: input.calendarId,
      title: input.title.trim(),
      note: input.note?.trim() ?? "",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdBy: input.createdBy,
    },
  });
}

export async function createEscrowJob(input: {
  communityId: string | null;
  providerId: string;
  memberEmail: string;
  memberName: string;
  title: string;
  description?: string;
  amountCents: number;
}) {
  await ensureSeeded();
  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } });
  if (!provider || !provider.escrowEnabled || provider.listingKind !== "local_pro") {
    return { error: "Escrow payments are not enabled for this pro." as const };
  }
  if (input.amountCents < 100) {
    return { error: "Amount must be at least $1.00." as const };
  }

  const platformFeeCents = provider.escrowFeeCents;
  const charge = await createMemberCharge({
    communityId: communityOrDefault(input.communityId),
    memberEmail: input.memberEmail,
    memberName: input.memberName,
    category: "local_pro_escrow",
    description: `Escrow hold: ${input.title.trim()} (${provider.name})`,
    amount: (input.amountCents + platformFeeCents) / 100,
  });

  const job = await prisma.escrowJob.create({
    data: {
      communityId: communityOrDefault(input.communityId),
      providerId: provider.id,
      providerName: provider.name,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      amountCents: input.amountCents,
      platformFeeCents,
      status: "pending_payment",
      chargeId: charge.id,
    },
  });

  return { job, charge };
}

export async function markEscrowHeldByCharge(chargeId: string) {
  const job = await prisma.escrowJob.findFirst({ where: { chargeId } });
  if (!job) return null;
  return prisma.escrowJob.update({
    where: { id: job.id },
    data: { status: "held", heldAt: new Date() },
  });
}

export async function listEscrowJobsForMember(email: string) {
  await ensureSeeded();
  return prisma.escrowJob.findMany({
    where: { memberEmail: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
}

export async function releaseEscrowJob(input: {
  jobId: string;
  memberEmail: string;
}) {
  const job = await prisma.escrowJob.findUnique({ where: { id: input.jobId } });
  if (!job || job.memberEmail !== input.memberEmail.toLowerCase()) {
    return { error: "Job not found." as const };
  }
  if (job.status !== "held") {
    return { error: "Only held payments can be released." as const };
  }
  const updated = await prisma.escrowJob.update({
    where: { id: job.id },
    data: { status: "released", releasedAt: new Date() },
  });
  return { job: updated };
}

export async function disputeEscrowJob(input: {
  jobId: string;
  memberEmail: string;
}) {
  const job = await prisma.escrowJob.findUnique({ where: { id: input.jobId } });
  if (!job || job.memberEmail !== input.memberEmail.toLowerCase()) {
    return { error: "Job not found." as const };
  }
  if (job.status !== "held") {
    return { error: "Only held payments can be disputed." as const };
  }
  const updated = await prisma.escrowJob.update({
    where: { id: job.id },
    data: { status: "disputed" },
  });
  return { job: updated };
}
