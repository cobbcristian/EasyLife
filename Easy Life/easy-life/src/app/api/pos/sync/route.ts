import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { diningProviderEmail } from "@/lib/server/dining";
import { posStatus, syncPosMenu } from "@/lib/server/pos/micros";
import { prisma } from "@/lib/server/prisma";

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
  let providerEmail = body.providerEmail;
  if (!providerEmail) {
    const provider = await prisma.provider.findFirst({
      where: { communityId: targetCommunityId, category: { contains: "Restaurant" } },
    });
    providerEmail = provider
      ? (await prisma.user.findFirst({
          where: { role: "provider", communityId: targetCommunityId },
          select: { email: true },
        }))?.email
      : undefined;
    providerEmail ??=
      (await prisma.user.findFirst({
        where: { role: "provider", communityId: targetCommunityId },
        select: { email: true },
      }))?.email ||
      diningProviderEmail(targetCommunityId) ||
      undefined;
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
