import { ensureSpanishWellsDemoSeeded, ensureSpanishWellsDemoBlog, ensureSpanishWellsDemoApparel, ensureSpanishWellsDemoMarketplace, ensureSpanishWellsDemoGallery, ensureSpanishWellsDemoNewsletters, ensureSpanishWellsDemoPropertiesAndRealEstate } from "@/lib/server/spanish-wells-seed";
import { ensureHarborPointeDemoSeeded, ensureHarborPointeDemoBlog, ensureHarborPointeDemoApparel, ensureHarborPointeDemoMarketplace, ensureHarborPointeDemoGallery, ensureHarborPointeDemoNewsletters, ensureHarborPointeDemoPropertiesAndRealEstate } from "@/lib/server/harbor-pointe-seed";
import { ensureWillowCreekDemoSeeded, ensureWillowCreekDemoBlog, ensureWillowCreekDemoApparel, ensureWillowCreekDemoMarketplace, ensureWillowCreekDemoGallery, ensureWillowCreekDemoNewsletters, ensureWillowCreekDemoPropertiesAndRealEstate } from "@/lib/server/willow-creek-seed";
import { ensureAlliantDemoSeeded, ensureAlliantDemoBlog, ensureAlliantDemoApparel, ensureAlliantDemoMarketplace, ensureAlliantDemoGallery, ensureAlliantDemoNewsletters, ensureAlliantDemoPropertiesAndRealEstate } from "@/lib/server/alliant-seed";
import { ensureFourClubDemoLedger } from "@/lib/server/four-club-demo-ledger";

export type DemoContentKind =
  | "full"
  | "blog"
  | "apparel"
  | "marketplace"
  | "gallery"
  | "newsletters"
  | "properties";

/** Clubs that were missing from many per-page seed switchboards. */
export type FourClubId = "spanish-wells" | "harbor-pointe" | "willow-creek" | "alliant";

const FOUR_CLUB_IDS = new Set<string>([
  "spanish-wells",
  "harbor-pointe",
  "willow-creek",
  "alliant",
]);

export function isFourClubDemoId(communityId?: string | null): communityId is FourClubId {
  return Boolean(communityId && FOUR_CLUB_IDS.has(communityId.trim()));
}

function resolveFourClubId(
  communityId?: string | null,
  email?: string | null,
): FourClubId | null {
  const cid = communityId?.trim() || "";
  if (FOUR_CLUB_IDS.has(cid)) return cid as FourClubId;
  const e = email?.toLowerCase() ?? "";
  if (e.endsWith("@spanishwellscountryclub.com")) return "spanish-wells";
  if (e.endsWith("@harborpointehoa.com")) return "harbor-pointe";
  if (e.endsWith("@willowcreekhoa.com")) return "willow-creek";
  if (e.endsWith("@alliantproperty.com")) return "alliant";
  return null;
}

/**
 * Hot-path demo seed for Spanish Wells / Harbor Pointe / Willow Creek / Alliant.
 * No-op for other clubs (existing page switchboards still own those).
 */
export async function ensureFourClubDemoContent(
  kind: DemoContentKind,
  communityId?: string | null,
  email?: string | null,
): Promise<void> {
  const cid = resolveFourClubId(communityId, email);
  if (!cid) return;

  try {
    switch (cid) {
      case "spanish-wells":
        if (kind === "full") await ensureSpanishWellsDemoSeeded();
        else if (kind === "blog") await ensureSpanishWellsDemoBlog();
        else if (kind === "apparel") await ensureSpanishWellsDemoApparel();
        else if (kind === "marketplace") await ensureSpanishWellsDemoMarketplace();
        else if (kind === "gallery") await ensureSpanishWellsDemoGallery();
        else if (kind === "newsletters") await ensureSpanishWellsDemoNewsletters();
        else if (kind === "properties") await ensureSpanishWellsDemoPropertiesAndRealEstate();
        break;
      case "harbor-pointe":
        if (kind === "full") await ensureHarborPointeDemoSeeded();
        else if (kind === "blog") await ensureHarborPointeDemoBlog();
        else if (kind === "apparel") await ensureHarborPointeDemoApparel();
        else if (kind === "marketplace") await ensureHarborPointeDemoMarketplace();
        else if (kind === "gallery") await ensureHarborPointeDemoGallery();
        else if (kind === "newsletters") await ensureHarborPointeDemoNewsletters();
        else if (kind === "properties") await ensureHarborPointeDemoPropertiesAndRealEstate();
        break;
      case "willow-creek":
        if (kind === "full") await ensureWillowCreekDemoSeeded();
        else if (kind === "blog") await ensureWillowCreekDemoBlog();
        else if (kind === "apparel") await ensureWillowCreekDemoApparel();
        else if (kind === "marketplace") await ensureWillowCreekDemoMarketplace();
        else if (kind === "gallery") await ensureWillowCreekDemoGallery();
        else if (kind === "newsletters") await ensureWillowCreekDemoNewsletters();
        else if (kind === "properties") await ensureWillowCreekDemoPropertiesAndRealEstate();
        break;
      case "alliant":
        if (kind === "full") await ensureAlliantDemoSeeded();
        else if (kind === "blog") await ensureAlliantDemoBlog();
        else if (kind === "apparel") await ensureAlliantDemoApparel();
        else if (kind === "marketplace") await ensureAlliantDemoMarketplace();
        else if (kind === "gallery") await ensureAlliantDemoGallery();
        else if (kind === "newsletters") await ensureAlliantDemoNewsletters();
        else if (kind === "properties") await ensureAlliantDemoPropertiesAndRealEstate();
        break;
      default: {
        const _exhaustive: never = cid;
        void _exhaustive;
        break;
      }
    }
    if (kind === "full") {
      await ensureFourClubDemoLedger(cid);
    }
  } catch (err) {
    console.error(`[ensureFourClubDemoContent] ${kind} ${cid} failed`, err);
  }
}
