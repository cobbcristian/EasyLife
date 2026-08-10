import { cookies, headers } from "next/headers";
import { getSession } from "@/lib/server/auth";
import { getCommunityBranding } from "@/lib/server/db";
import { MemberShell } from "@/components/layout/member-shell";
import {
  ACTIVE_COMMUNITY_COOKIE,
  demoBrandFromCommunityId,
  demoBrandFromCookies,
} from "@/lib/demo-branding";
import { DEMO_TENANT_COOKIE, readCookieValue } from "@/lib/tenant";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const activeCookie = cookieStore.get(ACTIVE_COMMUNITY_COOKIE)?.value;
  const brandSeed =
    demoBrandFromCookies(
      readCookieValue(headerStore.get("cookie"), DEMO_TENANT_COOKIE) ??
        cookieStore.get(DEMO_TENANT_COOKIE)?.value,
      activeCookie,
    ) ?? demoBrandFromCommunityId(session?.communityId);

  const brandingCommunityId =
    activeCookie && session?.communityId
      ? activeCookie
      : (session?.communityId ?? brandSeed?.communityId ?? null);

  const fromDb =
    brandingCommunityId != null
      ? await getCommunityBranding(brandingCommunityId)
      : null;

  const branding = brandSeed
    ? {
        id: fromDb?.id ?? brandSeed.communityId,
        name: fromDb?.name ?? brandSeed.communityName,
        logoUrl:
          fromDb?.id === brandSeed.communityId &&
          fromDb.logoUrl &&
          !fromDb.logoUrl.includes("community-ironcrest.png")
            ? fromDb.logoUrl
            : brandSeed.logoUrl,
        primaryColor: fromDb?.primaryColor ?? "#002856",
        appDisplayName:
          fromDb?.appDisplayName && fromDb.appDisplayName !== "Easy Life"
            ? fromDb.appDisplayName
            : brandSeed.productName,
      }
    : fromDb;

  return <MemberShell branding={branding}>{children}</MemberShell>;
}
