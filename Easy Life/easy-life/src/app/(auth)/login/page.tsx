import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  demoLoginsForTenant,
  resolveDemoTenantFromCookieHeader,
} from "@/lib/tenant";
import LoginClient from "./login-client";

/** Oceanside is live resident production — never surface sales-demo logins. */
function isLiveResidentTenant(tenantId: string): boolean {
  return tenantId === "oceansideresidents";
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );
  if (tenant) {
    return {
      title: {
        absolute: `${tenant.productName} | ${tenant.communityName}`,
      },
      description: `Sign in to ${tenant.productName} for ${tenant.communityName}.`,
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: tenant.productName,
      },
    };
  }
  return {
    title: "Easy Life | Super Admin",
  };
}

export default async function LoginPage() {
  const headerStore = await headers();
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );
  const live = tenant ? isLiveResidentTenant(tenant.id) : false;
  const branding = tenant
    ? {
        tenantId: tenant.id,
        productName: tenant.productName,
        communityName: tenant.communityName,
        logoSrc: tenant.logoSrc,
        loginHeroSrc: tenant.loginHeroSrc,
        // Empty email for live Oceanside — residents type their own.
        defaultEmail: live ? "" : tenant.defaultLoginEmail,
        locked: true as const,
        demoLogins: live ? [] : demoLoginsForTenant(tenant),
        liveProduction: live,
      }
    : null;

  return <LoginClient branding={branding} />;
}
