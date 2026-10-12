import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { addProperty, listProperties } from "@/lib/server/member-api-store";
import { ensureHuntersRidgeDemoPropertiesAndRealEstate } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoPropertiesAndRealEstate } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoPropertiesAndRealEstate } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoPropertiesAndRealEstate } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoPropertiesAndRealEstate } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoPropertiesAndRealEstate } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoPropertiesAndRealEstate } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoPropertiesAndRealEstate } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoPropertiesAndRealEstate } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoPropertiesAndRealEstate } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoPropertiesAndRealEstate } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoPropertiesAndRealEstate } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoPropertiesAndRealEstate } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoPropertiesAndRealEstate } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoPropertiesAndRealEstate } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoPropertiesAndRealEstate } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoPropertiesAndRealEstate } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoPropertiesAndRealEstate } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoPropertiesAndRealEstate } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoPropertiesAndRealEstate } from "@/lib/server/worthington-seed";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";

async function ensureDemoPropertiesIfNeeded(session: {
  communityId?: string | null;
  email: string;
}) {
  await ensureFourClubDemoContent(
    "properties",
    session.communityId,
    session.email,
  );
  const email = session.email?.toLowerCase() ?? "";
  const isHuntersRidge =
    session.communityId === HUNTERS_RIDGE_TENANT.communityId ||
    email.endsWith("@huntersridge-ca.com") ||
    email.endsWith("@huntersridge.net");
  const isBonitaBay =
    session.communityId === BONITA_BAY_TENANT.communityId ||
    email.endsWith("@bonitabayclub.net");
  const isShadowWood =
    session.communityId === SHADOW_WOOD_TENANT.communityId ||
    email.endsWith("@shadowwoodcc.com");
  const isHeronCreek =
    session.communityId === HERON_CREEK_TENANT.communityId ||
    email.endsWith("@heroncreekgcc.com");
  const isDebary =
    session.communityId === DEBARY_TENANT.communityId ||
    email.endsWith("@debarycc.com");
  const isJacaranda =
    session.communityId === JACARANDA_TENANT.communityId ||
    email.endsWith("@jacarandagolfclub.com");
  const isTheDunes =
    session.communityId === THE_DUNES_TENANT.communityId ||
    email.endsWith("@sanibeldunesresort.com");

  const isTheNest =
    session.communityId === THE_NEST_TENANT.communityId ||
    email.endsWith("@nestgolf.com");
  const isMartinDowns =
    session.communityId === MARTIN_DOWNS_TENANT.communityId ||
    email.endsWith("@martindownsgolfclub.com");
  const isSeagate =
    session.communityId === SEAGATE_TENANT.communityId ||
    email.endsWith("@seagatedelray.com");
  const isCopperleaf =
    session.communityId === COPPERLEAF_TENANT.communityId ||
    email.endsWith("@copperleafgolf.com");
  const isClubRenaissance =
    session.communityId === CLUB_RENAISSANCE_TENANT.communityId ||
    email.endsWith("@clubrenaissance.com");
  const isWorthington =
    session.communityId === WORTHINGTON_TENANT.communityId ||
    email.endsWith("@worthingtoncc.com");
  const isFallsClub =
    session.communityId === FALLS_CLUB_TENANT.communityId ||
    email.endsWith("@thefallsclub.com");
  const isEstero =
    session.communityId === ESTERO_TENANT.communityId ||
    email.endsWith("@esterocc.com");
  const isWildcatRun =
    session.communityId === WILDCAT_RUN_TENANT.communityId ||
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
if (isHuntersRidge) {
    try {
      await ensureHuntersRidgeDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] hunters-ridge property seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] bonita-bay property seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] shadow-wood property seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] heron-creek property seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] debary property seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] jacaranda property seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] the-dunes property seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] martin-downs property seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] falls-club seed failed", err);
    }
  }

  if (isEstero) {
    try {
      await ensureEsteroDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoPropertiesAndRealEstate();
    } catch (err) {
      console.error("[api/properties] windsor seed failed", err);
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureDemoPropertiesIfNeeded(session);
  return NextResponse.json({ properties: await listProperties(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { address?: string; type?: string; owner?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.address || !body.type) {
    return NextResponse.json({ error: "Address and type required" }, { status: 400 });
  }

  const property = await addProperty(session.email, {
    address: body.address,
    type: body.type,
    owner: body.owner ?? true,
  });

  return NextResponse.json({ ok: true, property });
}
