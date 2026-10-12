import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export async function listNativeAppConfigs() {
  await ensureRecordsSeeded();
  return prisma.nativeAppConfig.findMany({ orderBy: { appName: "asc" } });
}

export async function getNativeAppConfig(communityId: string) {
  return prisma.nativeAppConfig.findUnique({ where: { communityId } });
}

export async function upsertNativeAppConfig(input: {
  communityId: string;
  bundleId: string;
  appName: string;
  primaryColor?: string;
  logoUrl?: string;
  platform?: string;
  enabled?: boolean;
}) {
  return prisma.nativeAppConfig.upsert({
    where: { communityId: input.communityId },
    create: {
      communityId: input.communityId,
      bundleId: input.bundleId,
      appName: input.appName,
      primaryColor: input.primaryColor ?? "#1a3a52",
      logoUrl: input.logoUrl,
      platform: input.platform ?? "both",
      enabled: input.enabled ?? false,
    },
    update: {
      bundleId: input.bundleId,
      appName: input.appName,
      primaryColor: input.primaryColor,
      logoUrl: input.logoUrl,
      platform: input.platform,
      enabled: input.enabled,
    },
  });
}

/** Known shipped native apps — Oceanside is live; others scaffolded. */
export const SHIPPED_NATIVE_APPS = [
  {
    communityId: "oceanside-residents",
    bundleId: "com.easylife.oceanside",
    appName: "Oceanside Residents",
    enabled: true,
  },
] as const;

export async function ensureKnownNativeApps(): Promise<void> {
  for (const app of SHIPPED_NATIVE_APPS) {
    await upsertNativeAppConfig(app);
  }
}
