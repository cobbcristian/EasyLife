import { getSession } from "@/lib/server/auth";
import { ensureIronLakeDemoServiceRequests } from "@/lib/server/iron-lake-seed";
import { ensureHuntersRidgeDemoServiceRequests } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoServiceRequests } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoServiceRequests } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoServiceRequests } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoServiceRequests } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoServiceRequests } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoServiceRequests } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoServiceRequests } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoServiceRequests } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoServiceRequests } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoServiceRequests } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoServiceRequests } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoServiceRequests } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoServiceRequests } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoServiceRequests } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoServiceRequests } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoServiceRequests } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoServiceRequests } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoServiceRequests } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoServiceRequests } from "@/lib/server/worthington-seed";
import { ensureSpanishWellsDemoServiceRequests } from "@/lib/server/spanish-wells-seed";
import { ensureHarborPointeDemoServiceRequests } from "@/lib/server/harbor-pointe-seed";
import { ensureWillowCreekDemoServiceRequests } from "@/lib/server/willow-creek-seed";
import { ensureAlliantDemoServiceRequests } from "@/lib/server/alliant-seed";
import { ensureRecordsSeeded, listServiceRequests } from "@/lib/server/records";
import { IRON_LAKE_COMMUNITY_ID } from "@/lib/iron-lake-demo";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT, SPANISH_WELLS_TENANT, HARBOR_POINTE_TENANT, WILLOW_CREEK_TENANT, ALLIANT_TENANT } from "@/lib/tenant";
import { RequestsClient } from "./requests-client";

export const dynamic = "force-dynamic";

export default async function MemberServiceRequestsPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[member/service-requests] ensureRecordsSeeded failed", err);
  }

  const email = session?.email?.toLowerCase() ?? "";
  const isIronLake =
    session?.communityId === IRON_LAKE_COMMUNITY_ID ||
    email.endsWith("@theclubatironlake.com");
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
  const isSpanishWells =
    session?.communityId === SPANISH_WELLS_TENANT.communityId ||
    email.endsWith("@spanishwellscountryclub.com");
  const isHarborPointe =
    session?.communityId === HARBOR_POINTE_TENANT.communityId ||
    email.endsWith("@harborpointehoa.com");
  const isWillowCreek =
    session?.communityId === WILLOW_CREEK_TENANT.communityId ||
    email.endsWith("@willowcreekhoa.com");
  const isAlliant =
    session?.communityId === ALLIANT_TENANT.communityId ||
    email.endsWith("@alliantproperty.com");

  if (isIronLake) {
    try {
      await ensureIronLakeDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] iron-lake seed failed", err);
    }
  }
  if (isHuntersRidge) {
    try {
      await ensureHuntersRidgeDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] hunters-ridge seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] bonita-bay seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] shadow-wood seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] heron-creek seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] debary seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] jacaranda seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] the-dunes seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] martin-downs seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] club-renaissance seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] falls-club seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] worthington seed failed", err);
    }
  }
  if (isEstero) {
    try {
      await ensureEsteroDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] windsor seed failed", err);
    }
  }
  if (isSpanishWells) {
    try {
      await ensureSpanishWellsDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] spanish-wells seed failed", err);
    }
  }
  if (isHarborPointe) {
    try {
      await ensureHarborPointeDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] harbor-pointe seed failed", err);
    }
  }
  if (isWillowCreek) {
    try {
      await ensureWillowCreekDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] willow-creek seed failed", err);
    }
  }
  if (isAlliant) {
    try {
      await ensureAlliantDemoServiceRequests();
    } catch (err) {
      console.error("[member/service-requests] alliant seed failed", err);
    }
  }

  const rows = session
    ? await listServiceRequests({
        email: session.email,
        communityId: session.communityId,
      })
    : [];
  const requests = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description,
    status: r.status,
    unit: r.unit,
    createdAt: r.createdAt.toISOString().slice(0, 10),
  }));
  return <RequestsClient initialRequests={requests} />;
}
