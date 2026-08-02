"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

function heroFromCookie(): string {
  if (typeof document === "undefined") return brandAssets.loginHeroEasyLife;
  const matches = [
    ...document.cookie.matchAll(/(?:^|;\s*)el_demo_tenant=([^;]+)/gi),
  ];
  const id = matches.at(-1)?.[1]?.trim().toLowerCase();
  if (id === "ironcrest") return brandAssets.loginHeroIroncrest;
  if (id === "goldenocala") return brandAssets.loginHeroGoldenOcala;
  if (id === "heritagebay") return brandAssets.loginHeroHeritageBay;
  if (id === "huntersridge") return brandAssets.loginHeroHuntersRidge;
  if (id === "bonitabay") return brandAssets.loginHeroBonitaBay;
  if (id === "shadowwood") return brandAssets.loginHeroShadowWood;
  if (id === "heroncreek") return brandAssets.loginHeroHeronCreek;
  if (id === "debary") return brandAssets.loginHeroDebary;
  if (id === "jacaranda") return brandAssets.loginHeroJacaranda;
  if (id === "thedunes") return brandAssets.loginHeroTheDunes;
  if (id === "martindowns") return brandAssets.loginHeroMartinDowns;
  if (id === "thenest") return brandAssets.loginHeroTheNest;
  if (id === "seagate") return brandAssets.loginHeroSeagate;
  if (id === "copperleaf") return brandAssets.loginHeroCopperleaf;
  if (id === "clubrenaissance") return brandAssets.loginHeroClubRenaissance;
  if (id === "fallsclub") return brandAssets.loginHeroFallsClub;
  if (id === "worthington") return brandAssets.loginHeroWorthington;
  if (id === "estero") return brandAssets.loginHeroEstero;
  if (id === "wildcatrun") return brandAssets.loginHeroWildcatRun;
  if (id === "highlandwoods") return brandAssets.loginHeroHighlandWoods;
  if (id === "bonitanational") return brandAssets.loginHeroBonitaNational;
  if (id === "carrollwood") return brandAssets.loginHeroCarrollwood;
  if (id === "windsor") return brandAssets.loginHeroWindsor;
  if (id === "spanishwells") return brandAssets.communitySpanishWells;
  if (id === "harborpointe") return brandAssets.communityHarborPointe;
  if (id === "willowcreek") return brandAssets.communityWillowCreek;
  if (id === "alliant") return brandAssets.communityAlliant;
  if (id === "oceansideresidents") return brandAssets.communityOceanside;
  return brandAssets.loginHeroEasyLife;
}

function subscribeToCookieSnapshot() {
  return () => {};
}

/**
 * Login / auth hero: concentric rings with a tenant-specific center.
 * Easy Life → aerial houses; club demos → that club's crest.
 */
export function LoginHero({
  className,
  centerSrc,
}: {
  className?: string;
  /** Explicit override. When omitted, reads `el_demo_tenant` cookie. */
  centerSrc?: string | null;
}) {
  const cookieSrc = useSyncExternalStore(
    subscribeToCookieSnapshot,
    heroFromCookie,
    () => brandAssets.loginHeroEasyLife,
  );

  const src = centerSrc?.trim() || cookieSrc;
  const isPhoto =
    src.includes("easylife") ||
    src.endsWith("/login.png") ||
    src.includes("login-hero-easylife");

  return (
    <div
      className={cn("relative h-[550px] w-[549px] shrink-0", className)}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandAssets.loginRingOuter}
        alt=""
        className="absolute inset-0 h-full w-full"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandAssets.loginRingMid}
        alt=""
        className="absolute left-1/2 top-1/2 h-[481px] w-[480px] -translate-x-1/2 -translate-y-1/2"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandAssets.loginRingInner}
        alt=""
        className="absolute left-1/2 top-1/2 h-[413px] w-[412px] -translate-x-1/2 -translate-y-1/2"
      />
      <Image
        src={src}
        alt=""
        width={343}
        height={344}
        className={cn(
          "absolute left-1/2 top-1/2 h-[344px] w-[343px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white",
          isPhoto ? "object-cover" : "object-contain p-10",
        )}
        priority
      />
    </div>
  );
}
