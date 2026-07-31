import { getSession } from "@/lib/server/auth";
import { resolveMarketplaceListingImage } from "@/lib/brand-assets";
import { ensureHuntersRidgeDemoMarketplace } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoMarketplace } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoMarketplace } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoMarketplace } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoMarketplace } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoMarketplace } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoMarketplace } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoMarketplace } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoMarketplace } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoMarketplace } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoMarketplace } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoMarketplace } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoMarketplace } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoMarketplace } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoMarketplace } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoMarketplace } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoMarketplace } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoMarketplace } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoMarketplace } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoMarketplace } from "@/lib/server/worthington-seed";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listListings } from "@/lib/server/records";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";
import { MarketplaceClient } from "./marketplace-client";

export const dynamic = "force-dynamic";

export default async function MemberMarketplacePage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  await ensureFourClubDemoContent("marketplace", session?.communityId, session?.email);

  const email = session?.email?.toLowerCase() ?? "";
  const isHuntersRidge =
    session?.communityId === HUNTERS_RIDGE_TENANT.communityId ||
    email.endsWith("@huntersridge-ca.com");
  const isBonitaBay =
    session?.communityId === BONITA_BAY_TENANT.communityId ||
    email.endsWith("@bonitabayclub.net");
  const isShadowWood =
    session?.communityId === SHADOW_WOOD_TENANT.communityId ||
    email.endsWith("@shadowwoodcc.com");
  const isHeronCreek =
    session?.communityId === HERON_CREEK_TENANT.communityId ||
    email.endsWith("@heroncreekgcc.com");
  const isDebary =
    session?.communityId === DEBARY_TENANT.communityId ||
    email.endsWith("@debarycc.com");
  const isJacaranda =
    session?.communityId === JACARANDA_TENANT.communityId ||
    email.endsWith("@jacarandagolfclub.com");
  const isTheDunes =
    session?.communityId === THE_DUNES_TENANT.communityId ||
    email.endsWith("@sanibeldunesresort.com");

  const isTheNest =
    session?.communityId === THE_NEST_TENANT.communityId ||
    email.endsWith("@nestgolf.com");
  const isMartinDowns =
    session?.communityId === MARTIN_DOWNS_TENANT.communityId ||
    email.endsWith("@martindownsgolfclub.com");
  const isSeagate =
    session?.communityId === SEAGATE_TENANT.communityId ||
    email.endsWith("@seagatedelray.com");
  const isCopperleaf =
    session?.communityId === COPPERLEAF_TENANT.communityId ||
    email.endsWith("@copperleafgolf.com");
  const isClubRenaissance =
    session?.communityId === CLUB_RENAISSANCE_TENANT.communityId ||
    email.endsWith("@clubrenaissance.com");
  const isFallsClub =
    session?.communityId === FALLS_CLUB_TENANT.communityId ||
    email.endsWith("@thefallsclub.com");
  const isEstero =
    session?.communityId === ESTERO_TENANT.communityId ||
    email.endsWith("@esterocc.com");
  const isWildcatRun =
    session?.communityId === WILDCAT_RUN_TENANT.communityId ||
    email.endsWith("@wildcatruncc.com");
  const isHighlandWoods =
    session?.communityId === HIGHLAND_WOODS_TENANT.communityId ||
    email.endsWith("@hwgcc.com");
  const isBonitaNational =
    session?.communityId === BONITA_NATIONAL_TENANT.communityId ||
    email.endsWith("@bonitanationalgolfcc.com");
  const isCarrollwood =
    session?.communityId === CARROLLWOOD_TENANT.communityId ||
    email.endsWith("@carrollwoodcc.com");
  const isWindsor =
    session?.communityId === WINDSOR_TENANT.communityId ||
    email.endsWith("@windsorflorida.com");
const isWorthington =
    session?.communityId === WORTHINGTON_TENANT.communityId ||
    email.endsWith("@worthingtoncc.com");
  if (isHuntersRidge) {
    try {
      await ensureHuntersRidgeDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] hunters-ridge marketplace seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] bonita-bay marketplace seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] shadow-wood marketplace seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] heron-creek marketplace seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] debary marketplace seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] jacaranda marketplace seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] the-dunes marketplace seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] martin-downs marketplace seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] falls-club seed failed", err);
    }
  }

  if (isEstero) {
    try {
      await ensureEsteroDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoMarketplace();
    } catch (err) {
      console.error("[member/marketplace] windsor seed failed", err);
    }
  }

  const rows = await listListings(session?.communityId);
  const initial = rows.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    category: l.category,
    seller: l.seller,
    unit: l.unit,
    imageUrl: resolveMarketplaceListingImage(
      l.title,
      l.category,
      l.imageUrl,
      l.id,
    ),
    videoUrl: l.videoUrl,
    createdAt: l.createdAt.toISOString().slice(0, 10),
  }));
  return <MarketplaceClient initial={initial} />;
}
