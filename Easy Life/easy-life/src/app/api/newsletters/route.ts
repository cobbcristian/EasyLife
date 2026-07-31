import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listNewsletters } from "@/lib/server/member-api-store";
import { ensureHuntersRidgeDemoNewsletters } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoNewsletters } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoNewsletters } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoNewsletters } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoNewsletters } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoNewsletters } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoNewsletters } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoNewsletters } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoNewsletters } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoNewsletters } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoNewsletters } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoNewsletters } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoNewsletters } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoNewsletters } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoNewsletters } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoNewsletters } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoNewsletters } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoNewsletters } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoNewsletters } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoNewsletters } from "@/lib/server/worthington-seed";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureFourClubDemoContent(
    "newsletters",
    session.communityId,
    session.email,
  );

  const email = session.email?.toLowerCase() ?? "";
  const isHuntersRidge =
    session.communityId === HUNTERS_RIDGE_TENANT.communityId ||
    email.endsWith("@huntersridge-ca.com");
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
      await ensureHuntersRidgeDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] hunters-ridge newsletter seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] bonita-bay newsletter seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] shadow-wood newsletter seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] heron-creek newsletter seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] debary newsletter seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] jacaranda newsletter seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] the-dunes newsletter seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] martin-downs newsletter seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] falls-club seed failed", err);
    }
  }

  if (isEstero) {
    try {
      await ensureEsteroDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoNewsletters();
    } catch (err) {
      console.error("[api/newsletters] windsor seed failed", err);
    }
  }

  const rows = await listNewsletters(session.communityId);
  return NextResponse.json({
    newsletters: rows.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      body: n.body,
      date: n.createdAt.toISOString().slice(0, 10),
    })),
  });
}
