import { getSession } from "@/lib/server/auth";
import {
  APPAREL_VENDOR,
  ensureRecordsSeeded,
  listApparelOrders,
  listApparelProducts,
} from "@/lib/server/records";
import { rewriteTenantApparelImageUrl } from "@/lib/brand-assets";
import { ensureHuntersRidgeDemoApparel } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoApparel } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoApparel } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoApparel } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoApparel } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoApparel } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoApparel } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoApparel } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoApparel } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoApparel } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoApparel } from "@/lib/server/copperleaf-seed";
import { ensureFallsClubDemoApparel } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoApparel } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoApparel } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoApparel } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoApparel } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoApparel } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoApparel } from "@/lib/server/windsor-seed";
import { ensureClubRenaissanceDemoApparel } from "@/lib/server/club-renaissance-seed";
import { ensureWorthingtonDemoApparel } from "@/lib/server/worthington-seed";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ApparelShop } from "@/components/apparel/apparel-shop";
import { BONITA_BAY_TENANT, DEBARY_TENANT, JACARANDA_TENANT, THE_DUNES_TENANT, THE_NEST_TENANT, MARTIN_DOWNS_TENANT, SEAGATE_TENANT, COPPERLEAF_TENANT, CLUB_RENAISSANCE_TENANT, FALLS_CLUB_TENANT, ESTERO_TENANT, WILDCAT_RUN_TENANT, HIGHLAND_WOODS_TENANT, BONITA_NATIONAL_TENANT, CARROLLWOOD_TENANT, WINDSOR_TENANT, WORTHINGTON_TENANT, HUNTERS_RIDGE_TENANT, HERON_CREEK_TENANT, SHADOW_WOOD_TENANT } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MemberApparelPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  await ensureFourClubDemoContent("apparel", session?.communityId, session?.email);

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
      await ensureHuntersRidgeDemoApparel();
    } catch (err) {
      console.error("[member/apparel] hunters-ridge apparel seed failed", err);
    }
  }
  if (isBonitaBay) {
    try {
      await ensureBonitaBayDemoApparel();
    } catch (err) {
      console.error("[member/apparel] bonita-bay apparel seed failed", err);
    }
  }
  if (isShadowWood) {
    try {
      await ensureShadowWoodDemoApparel();
    } catch (err) {
      console.error("[member/apparel] shadow-wood apparel seed failed", err);
    }
  }
  if (isHeronCreek) {
    try {
      await ensureHeronCreekDemoApparel();
    } catch (err) {
      console.error("[member/apparel] heron-creek apparel seed failed", err);
    }
  }
  if (isDebary) {
    try {
      await ensureDebaryDemoApparel();
    } catch (err) {
      console.error("[member/apparel] debary apparel seed failed", err);
    }
  }
  if (isJacaranda) {
    try {
      await ensureJacarandaDemoApparel();
    } catch (err) {
      console.error("[member/apparel] jacaranda apparel seed failed", err);
    }
  }
  if (isTheDunes) {
    try {
      await ensureTheDunesDemoApparel();
    } catch (err) {
      console.error("[member/apparel] the-dunes apparel seed failed", err);
    }
  }

  if (isTheNest) {
    try {
      await ensureTheNestDemoApparel();
    } catch (err) {
      console.error("[member/apparel] the-nest seed failed", err);
    }
  }
  if (isMartinDowns) {
    try {
      await ensureMartinDownsDemoApparel();
    } catch (err) {
      console.error("[member/apparel] martin-downs apparel seed failed", err);
    }
  }
  if (isSeagate) {
    try {
      await ensureSeagateDemoApparel();
    } catch (err) {
      console.error("[member/apparel] seagate seed failed", err);
    }
  }
  if (isCopperleaf) {
    try {
      await ensureCopperleafDemoApparel();
    } catch (err) {
      console.error("[member/apparel] copperleaf seed failed", err);
    }
  }
  if (isClubRenaissance) {
    try {
      await ensureClubRenaissanceDemoApparel();
    } catch (err) {
      console.error("[member/apparel] club-renaissance seed failed", err);
    }
  }
  if (isWorthington) {
    try {
      await ensureWorthingtonDemoApparel();
    } catch (err) {
      console.error("[member/apparel] worthington seed failed", err);
    }
  }
  if (isFallsClub) {
    try {
      await ensureFallsClubDemoApparel();
    } catch (err) {
      console.error("[member/apparel] falls-club seed failed", err);
    }
  }
  if (isEstero) {
    try {
      await ensureEsteroDemoApparel();
    } catch (err) {
      console.error("[member/apparel] estero seed failed", err);
    }
  }
  if (isWildcatRun) {
    try {
      await ensureWildcatRunDemoApparel();
    } catch (err) {
      console.error("[member/apparel] wildcat-run seed failed", err);
    }
  }
  if (isHighlandWoods) {
    try {
      await ensureHighlandWoodsDemoApparel();
    } catch (err) {
      console.error("[member/apparel] highland-woods seed failed", err);
    }
  }
  if (isBonitaNational) {
    try {
      await ensureBonitaNationalDemoApparel();
    } catch (err) {
      console.error("[member/apparel] bonita-national seed failed", err);
    }
  }
  if (isCarrollwood) {
    try {
      await ensureCarrollwoodDemoApparel();
    } catch (err) {
      console.error("[member/apparel] carrollwood seed failed", err);
    }
  }
  if (isWindsor) {
    try {
      await ensureWindsorDemoApparel();
    } catch (err) {
      console.error("[member/apparel] windsor seed failed", err);
    }
  }

  const communityId = session?.communityId;
  const [products, orders] = await Promise.all([
    listApparelProducts(communityId),
    session
      ? listApparelOrders({ communityId, orderedByEmail: session.email })
      : Promise.resolve([]),
  ]);

  return (
    <ApparelShop
      mode="member"
      headerTitle="Club Apparel"
      avatarName={session?.name?.trim() || "Member"}
      vendor={products[0]?.vendorName ?? APPAREL_VENDOR}
      products={products.map((p) => ({
        id: p.id,
        vendorName: p.vendorName,
        name: p.name,
        description: p.description,
        price: p.price,
        sizes: JSON.parse(p.sizesJson) as string[],
        category: p.category,
        imageUrl: rewriteTenantApparelImageUrl(p.id, p.imageUrl) ?? p.imageUrl,
      }))}
      orders={orders.map((o) => ({
        id: o.id,
        vendorName: o.vendorName,
        orderType: o.orderType,
        orderedByName: o.orderedByName,
        items: JSON.parse(o.itemsJson),
        total: o.total,
        notes: o.notes,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
