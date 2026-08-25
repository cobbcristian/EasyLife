import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { allowPosProviderEmailOverride } from "@/lib/server/pos/pos-provider-email";
import { resolveCommunityDiningProviderEmail } from "@/lib/server/pos/resolve-dining-provider";
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

  const resolved = await resolveCommunityDiningProviderEmail(communityId);
  if (!resolved) {
    return NextResponse.json(
      { error: "No dining provider configured for this club" },
      { status: 400 },
    );
  }

  // Client providerEmail was previously trusted and wrote MenuItem rows under any
  // email (cross-tenant). Only allow an override that matches this club's provider.
  const scoped = allowPosProviderEmailOverride(resolved, body.providerEmail);
  if (!scoped.ok) {
    return NextResponse.json({ error: scoped.error }, { status: 403 });
  }

  const result = await syncPosMenu({
    communityId,
    providerEmail: scoped.email,
    actorName: session.name,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
