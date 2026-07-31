import { getSession } from "@/lib/server/auth";
import { ensureHuntersRidgeDemoBlog } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoBlog } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoBlog } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoBlog } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoBlog } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoBlog } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoBlog } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoBlog } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoBlog } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoBlog } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoBlog } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoBlog } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoBlog } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoBlog } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoBlog } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoBlog } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoBlog } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoBlog } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoBlog } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoBlog } from "@/lib/server/worthington-seed";
import { ensureRecordsSeeded, listBlogPosts } from "@/lib/server/records";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";
import { BlogClient } from "./blog-client";

export const dynamic = "force-dynamic";

export default async function MemberBlogPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  await ensureFourClubDemoContent("blog", session?.communityId, session?.email);

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
      await ensureHuntersRidgeDemoBlog();
    } catch (err) {
      console.error("[member/blog] hunters-ridge blog seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoBlog();
    } catch (err) {
      console.error("[member/blog] bonita-bay blog seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoBlog();
    } catch (err) {
      console.error("[member/blog] shadow-wood blog seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoBlog();
    } catch (err) {
      console.error("[member/blog] heron-creek blog seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoBlog();
    } catch (err) {
      console.error("[member/blog] debary blog seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoBlog();
    } catch (err) {
      console.error("[member/blog] jacaranda blog seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoBlog();
    } catch (err) {
      console.error("[member/blog] the-dunes blog seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoBlog();
    } catch (err) {
      console.error("[member/blog] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoBlog();
    } catch (err) {
      console.error("[member/blog] martin-downs blog seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoBlog();
    } catch (err) {
      console.error("[member/blog] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoBlog();
    } catch (err) {
      console.error("[member/blog] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoBlog();
    } catch (err) {
      console.error("[member/blog] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoBlog();
    } catch (err) {
      console.error("[member/blog] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoBlog();
    } catch (err) {
      console.error("[member/blog] falls-club seed failed", err);
    }
  }

  if (isEstero) {
    try {
      await ensureEsteroDemoBlog();
    } catch (err) {
      console.error("[member/blog] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoBlog();
    } catch (err) {
      console.error("[member/blog] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoBlog();
    } catch (err) {
      console.error("[member/blog] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoBlog();
    } catch (err) {
      console.error("[member/blog] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoBlog();
    } catch (err) {
      console.error("[member/blog] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoBlog();
    } catch (err) {
      console.error("[member/blog] windsor seed failed", err);
    }
  }

  const rows = await listBlogPosts(session?.communityId);
  const initial = rows.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    author: p.author,
    category: p.category,
    createdAt: p.createdAt.toISOString().slice(0, 10),
  }));
  return (
    <BlogClient
      initial={initial}
      userName={session?.name?.trim() || "Member"}
    />
  );
}
