import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureBonitaBayDemoSeeded } from "@/lib/server/bonita-bay-seed";
import { ensureHeritageBayDemoSeeded } from "@/lib/server/heritage-bay-seed";
import { ensureHuntersRidgeDemoSeeded } from "@/lib/server/hunters-ridge-seed";
import {
  ensureRecordsSeeded,
  listAmenities,
  listResidentDirectory,
  listVendorDirectory,
} from "@/lib/server/records";
import { ensureLessonProsForCommunity } from "@/lib/server/lessons";
import { listClubStaff } from "@/lib/server/residency";
import { ensureShadowWoodDemoSeeded } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoSeeded } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoSeeded } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoSeeded } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoSeeded } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoSeeded } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoSeeded } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoSeeded } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoSeeded } from "@/lib/server/copperleaf-seed";
import { ensureClubRenaissanceDemoSeeded } from "@/lib/server/club-renaissance-seed";
import { ensureFallsClubDemoSeeded } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoSeeded } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoSeeded } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoSeeded } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoSeeded } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoSeeded } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoSeeded } from "@/lib/server/windsor-seed";
import { ensureWorthingtonDemoSeeded } from "@/lib/server/worthington-seed";
import { ensureSpanishWellsDemoSeeded } from "@/lib/server/spanish-wells-seed";
import { ensureHarborPointeDemoSeeded } from "@/lib/server/harbor-pointe-seed";
import { ensureWillowCreekDemoSeeded } from "@/lib/server/willow-creek-seed";
import { ensureAlliantDemoSeeded } from "@/lib/server/alliant-seed";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "residents";
  await ensureRecordsSeeded();
  const communityId = session.communityId;

  if (type === "vendors") {
    await ensureLessonProsForCommunity(communityId);
    let vendors = await listVendorDirectory(communityId);
    if (vendors.length === 0) {
      try {
        if (communityId === "bonita-bay") {
          await ensureBonitaBayDemoSeeded();
        } else if (communityId === "shadow-wood") {
          await ensureShadowWoodDemoSeeded();
        } else if (communityId === "heron-creek") {
          await ensureHeronCreekDemoSeeded();
        } else if (communityId === "debary") {
          await ensureDebaryDemoSeeded();
        } else if (communityId === "jacaranda") {
          await ensureJacarandaDemoSeeded();
        } else if (communityId === "the-dunes") {
          await ensureTheDunesDemoSeeded();
        } else if (communityId === "the-nest") {
          await ensureTheNestDemoSeeded();
        } else if (communityId === "martin-downs") {
          await ensureMartinDownsDemoSeeded();
        } else if (communityId === "seagate") {
          await ensureSeagateDemoSeeded();
        } else if (communityId === "copperleaf") {
          await ensureCopperleafDemoSeeded();
        } else if (communityId === "club-renaissance") {
          await ensureClubRenaissanceDemoSeeded();
        } else if (communityId === "falls-club") {
          await ensureFallsClubDemoSeeded();
        } else if (communityId === "estero") {
          await ensureEsteroDemoSeeded();
        } else if (communityId === "wildcat-run") {
          await ensureWildcatRunDemoSeeded();
        } else if (communityId === "highland-woods") {
          await ensureHighlandWoodsDemoSeeded();
        } else if (communityId === "bonita-national") {
          await ensureBonitaNationalDemoSeeded();
        } else if (communityId === "carrollwood") {
          await ensureCarrollwoodDemoSeeded();
        } else if (communityId === "windsor") {
          await ensureWindsorDemoSeeded();
        } else if (communityId === "worthington") {
          await ensureWorthingtonDemoSeeded();
        } else if (communityId === "hunters-ridge") {
          await ensureHuntersRidgeDemoSeeded();
        } else if (communityId === "heritage-bay") {
          await ensureHeritageBayDemoSeeded();
        } else if (communityId === "spanish-wells") {
          await ensureSpanishWellsDemoSeeded();
        } else if (communityId === "harbor-pointe") {
          await ensureHarborPointeDemoSeeded();
        } else if (communityId === "willow-creek") {
          await ensureWillowCreekDemoSeeded();
        } else if (communityId === "alliant") {
          await ensureAlliantDemoSeeded();
        }
      } catch (err) {
        console.error("[api/directory] vendor seed failed", err);
      }
      vendors = await listVendorDirectory(communityId);
    }
    return NextResponse.json({
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        type: v.type,
        rating: v.rating,
        email: v.email,
      })),
    });
  }

  if (type === "staff") {
    const staff = await listClubStaff(communityId);
    return NextResponse.json({
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        department: s.department,
        email: s.email,
        phone: s.phone,
        extension: s.extension,
        category: s.category,
      })),
    });
  }

  if (type === "hours") {
    const amenities = await listAmenities(communityId);
    return NextResponse.json({
      venues: amenities.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        schedule: a.schedule,
        hoursJson: a.hoursJson,
        description: a.description,
      })),
    });
  }

  return NextResponse.json({
    directory: await listResidentDirectory(communityId),
  });
}
