import { getSession } from "@/lib/server/auth";
import { ensureHuntersRidgeDemoGallery } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoGallery } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoGallery } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoGallery } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoGallery } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoGallery } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoGallery } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoGallery } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoGallery } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoGallery } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoGallery } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoGallery } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoGallery } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoGallery } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoGallery } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoGallery } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoGallery } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoGallery } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoGallery } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoGallery } from "@/lib/server/worthington-seed";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listGallery } from "@/lib/server/records";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";
import { GalleryClient } from "./gallery-client";

export const dynamic = "force-dynamic";

export default async function MemberGalleryPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  await ensureFourClubDemoContent("gallery", session?.communityId, session?.email);

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
      await ensureHuntersRidgeDemoGallery();
    } catch (err) {
      console.error("[member/gallery] hunters-ridge gallery seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoGallery();
    } catch (err) {
      console.error("[member/gallery] bonita-bay gallery seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoGallery();
    } catch (err) {
      console.error("[member/gallery] shadow-wood gallery seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoGallery();
    } catch (err) {
      console.error("[member/gallery] heron-creek gallery seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoGallery();
    } catch (err) {
      console.error("[member/gallery] debary gallery seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoGallery();
    } catch (err) {
      console.error("[member/gallery] jacaranda gallery seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoGallery();
    } catch (err) {
      console.error("[member/gallery] the-dunes gallery seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoGallery();
    } catch (err) {
      console.error("[member/gallery] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoGallery();
    } catch (err) {
      console.error("[member/gallery] martin-downs gallery seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoGallery();
    } catch (err) {
      console.error("[member/gallery] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoGallery();
    } catch (err) {
      console.error("[member/gallery] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoGallery();
    } catch (err) {
      console.error("[member/gallery] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoGallery();
    } catch (err) {
      console.error("[member/gallery] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoGallery();
    } catch (err) {
      console.error("[member/gallery] falls-club seed failed", err);
    }
  }

  if (isEstero) {
    try {
      await ensureEsteroDemoGallery();
    } catch (err) {
      console.error("[member/gallery] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoGallery();
    } catch (err) {
      console.error("[member/gallery] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoGallery();
    } catch (err) {
      console.error("[member/gallery] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoGallery();
    } catch (err) {
      console.error("[member/gallery] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoGallery();
    } catch (err) {
      console.error("[member/gallery] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoGallery();
    } catch (err) {
      console.error("[member/gallery] windsor seed failed", err);
    }
  }

  const rows = await listGallery(session?.communityId);
  const initial = rows.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    url: g.url,
    createdAt: g.createdAt.toISOString().slice(0, 10),
  }));
  return <GalleryClient initial={initial} />;
}
