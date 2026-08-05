import { NextResponse } from "next/server";
import { preferInitialsAvatar, logoForCommunity } from "@/lib/brand-assets";
import { getSession } from "@/lib/server/auth";
import { getCommunityById, getAccountProfile } from "@/lib/server/db";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityPromise = session.communityId
    ? getCommunityById(session.communityId)
    : Promise.resolve(undefined);

  const accountPromise = getAccountProfile(session.email);
  const unitPromise = prisma.memberProfileExt.findUnique({
    where: { userEmail: session.email.toLowerCase() },
    select: { unit: true },
  });

  // Providers need listing lookup; everyone else skips that DB hit.
  const providerPromise =
    session.role === "provider" && session.communityId
      ? prisma.provider.findFirst({
          where: {
            communityId: session.communityId,
            OR: [
              { email: session.email.toLowerCase() },
              { name: session.name },
            ],
          },
          select: { id: true, listingKind: true, category: true, type: true },
        })
      : Promise.resolve(null);

  const [community, account, profileExt, provider] = await Promise.all([
    communityPromise,
    accountPromise,
    unitPromise,
    providerPromise,
  ]);

  const initialsOnly = preferInitialsAvatar(session.name, session.email);
  if (initialsOnly && account?.avatarUrl) {
    void prisma.user.update({
      where: { email: session.email.toLowerCase() },
      data: { avatarUrl: null },
    });
  }

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
    providerId: provider?.id ?? null,
    providerListingKind: provider?.listingKind ?? null,
    providerCategory: provider?.category ?? null,
    providerType: provider?.type ?? null,
    unit: profileExt?.unit ?? "—",
    avatarUrl: initialsOnly ? null : (account?.avatarUrl ?? null),
  });
}
