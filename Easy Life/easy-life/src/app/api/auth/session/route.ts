import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getCommunityById, getAccountProfile } from "@/lib/server/db";
import { prisma } from "@/lib/server/prisma";
import { logoForCommunity } from "@/lib/brand-assets";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const community = session.communityId
    ? await getCommunityById(session.communityId)
    : undefined;

  let providerId: string | null = null;
  let providerListingKind: string | null = null;
  let providerCategory: string | null = null;
  let providerType: string | null = null;
  if (session.role === "provider" && session.communityId) {
    const email = session.email.toLowerCase();
    const provider =
      (await prisma.provider.findFirst({
        where: {
          communityId: session.communityId,
          OR: [{ email }, { name: session.name }],
        },
        select: { id: true, listingKind: true, category: true, type: true },
      })) ?? null;
    providerId = provider?.id ?? null;
    providerListingKind = provider?.listingKind ?? null;
    providerCategory = provider?.category ?? null;
    providerType = provider?.type ?? null;
  }

  const [account, profileExt] = await Promise.all([
    getAccountProfile(session.email),
    prisma.memberProfileExt.findUnique({
      where: { userEmail: session.email.toLowerCase() },
      select: { unit: true },
    }),
  ]);

  return NextResponse.json({
    name: session.name,
    email: session.email,
    role: session.role,
    communityId: session.communityId,
    communityName: community?.name ?? null,
    appDisplayName: community?.appDisplayName ?? community?.name ?? null,
    logoUrl: session.communityId
      ? logoForCommunity(session.communityId, community?.logoUrl)
      : null,
    providerId,
    providerListingKind,
    providerCategory,
    providerType,
    unit: profileExt?.unit ?? "—",
    avatarUrl: account?.avatarUrl ?? null,
  });
}
