import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  demoLoginsForTenant,
  resolveDemoTenantFromCookieHeader,
} from "@/lib/tenant";
import LoginClient from "./login-client";

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
    title: "Easy Life | Community Management",
  };
}

export default async function LoginPage() {
  const headerStore = await headers();
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );
  const branding = tenant
    ? {
        tenantId: tenant.id,
        productName: tenant.productName,
        communityName: tenant.communityName,
        logoSrc: tenant.logoSrc,
        loginHeroSrc: tenant.loginHeroSrc,
        defaultEmail: tenant.defaultLoginEmail,
        locked: true as const,
        demoLogins: demoLoginsForTenant(tenant),
      }
    : null;

  return <LoginClient branding={branding} />;
}
