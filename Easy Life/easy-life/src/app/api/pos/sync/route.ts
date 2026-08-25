import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { resolvePosSyncProviderEmail } from "@/lib/server/pos-sync-auth";
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
  const providerEmail = await resolvePosSyncProviderEmail({
    communityId: targetCommunityId,
    requestedEmail: body.providerEmail,
  });
  if (!providerEmail) {
    return NextResponse.json(
      {
        error: body.providerEmail?.trim()
          ? "Provider email is not part of this club"
          : "No dining provider configured for this club",
      },
      { status: body.providerEmail?.trim() ? 403 : 400 },
    );
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
