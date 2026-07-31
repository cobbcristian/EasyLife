import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  resolveDemoTenant,
  tenantByCommunityId,
  type DemoTenant,
} from "@/lib/tenant";

export type PortalBrandSeed = {
  productName: string;
  logoUrl: string;
  communityName: string;
  communityId: string;
};

function brandSeedFromTenant(tenant: DemoTenant): PortalBrandSeed {
  return {
    productName: tenant.productName,
    logoUrl: tenant.logoSrc,
    communityName: tenant.communityName,
    communityId: tenant.communityId,
  };
}

/** SSR-safe portal branding from demo tenant / community cookies. */
export function demoBrandFromCookies(
  cookieTenant?: string | null,
  cookieCommunity?: string | null,
): PortalBrandSeed | null {
  const tenant = resolveDemoTenant(null, cookieTenant);
  if (tenant) return brandSeedFromTenant(tenant);
  const byCommunity = tenantByCommunityId(cookieCommunity);
  return byCommunity ? brandSeedFromTenant(byCommunity) : null;
}

/** Portal branding when the signed-in user belongs to a demo community. */
export function demoBrandFromCommunityId(
  communityId?: string | null,
): PortalBrandSeed | null {
  const tenant = tenantByCommunityId(communityId);
  return tenant ? brandSeedFromTenant(tenant) : null;
}

/** @deprecated Use demoBrandFromCookies */
export function ironcrestBrandFromCookies(
  cookieTenant?: string | null,
  cookieCommunity?: string | null,
): PortalBrandSeed | null {
  return demoBrandFromCookies(cookieTenant, cookieCommunity);
}

/** @deprecated Use demoBrandFromCommunityId */
export function ironcrestBrandFromCommunityId(
  communityId?: string | null,
): PortalBrandSeed | null {
  return demoBrandFromCommunityId(communityId);
}

export { ACTIVE_COMMUNITY_COOKIE, DEMO_TENANT_COOKIE };
