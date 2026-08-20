import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { diningProviderEmail } from "@/lib/server/dining";
import { isPosProviderEmailAllowedForCommunity } from "@/lib/server/pos-provider-scope";
import { posStatus, syncPosMenu } from "@/lib/server/pos/micros";
import { prisma } from "@/lib/server/prisma";

async function communityDiningProviderEmails(communityId: string): Promise<string[]> {
  const [providers, users] = await Promise.all([
    prisma.provider.findMany({
      where: { communityId },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: { role: "provider", communityId },
      select: { email: true },
    }),
  ]);
  return [...providers.map((p) => p.email), ...users.map((u) => u.email)];
}

async function resolveClubDiningProviderEmail(
  communityId: string,
): Promise<string | undefined> {
  const restaurant = await prisma.provider.findFirst({
    where: { communityId, category: { contains: "Restaurant" } },
    select: { email: true },
  });
  if (restaurant?.email?.trim()) return restaurant.email.trim();

  const providerUser = await prisma.user.findFirst({
    where: { role: "provider", communityId },
    select: { email: true },
  });
  if (providerUser?.email?.trim()) return providerUser.email.trim();

  const clubDining = diningProviderEmail(communityId).trim();
  return clubDining || undefined;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = await resolveScopedCommunityId(session);
  const community = communityId
    ? await prisma.community.findUnique({
        where: { id: communityId },
        select: { posProvider: true, posLastSyncAt: true },
      })
    : null;

  return NextResponse.json({
    ...posStatus(),
    community: community
      ? {
          posProvider: community.posProvider,
          posLastSyncAt: community.posLastSyncAt?.toISOString() ?? null,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { providerEmail?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const communityId = await resolveScopedCommunityId(session);
  if (!communityId || communityId === "__missing_community__") {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const targetCommunityId = communityId;
  const allowedEmails = await communityDiningProviderEmails(targetCommunityId);
  let providerEmail = body.providerEmail?.trim();

  if (providerEmail) {
    if (
      !isPosProviderEmailAllowedForCommunity(
        targetCommunityId,
        providerEmail,
        allowedEmails,
      )
    ) {
      return NextResponse.json(
        { error: "Dining provider is not part of this club" },
        { status: 403 },
      );
    }
  } else {
    providerEmail = await resolveClubDiningProviderEmail(targetCommunityId);
    if (!providerEmail) {
      return NextResponse.json(
        { error: "No dining provider configured for this club" },
        { status: 400 },
      );
    }
  }

  const result = await syncPosMenu({
    communityId: targetCommunityId,
    providerEmail,
    actorName: session.name,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
