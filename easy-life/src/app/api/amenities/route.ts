import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  isSuperAdmin,
  resolveScopedCommunityId,
} from "@/lib/server/community-context";
import { createAmenity, ensureRecordsSeeded, listAmenities } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const communityId = await resolveScopedCommunityId(session);
  return NextResponse.json({ amenities: await listAmenities(communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name?: string;
    description?: string;
    fee?: number;
    schedule?: string;
    communityId?: string;
    kind?: string;
    unitCount?: number;
    holes?: number | null;
    surface?: string | null;
    ownership?: string;
    partnerName?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.name || !body.schedule) {
    return NextResponse.json({ error: "Name and schedule required" }, { status: 400 });
  }

  let communityId = await resolveScopedCommunityId(session);
  if (isSuperAdmin(session) && body.communityId) {
    communityId = body.communityId;
  }

  const amenity = await createAmenity({
    communityId,
    name: body.name,
    description: body.description ?? "",
    fee: Number(body.fee) || 0,
    schedule: body.schedule,
    kind: body.kind,
    unitCount: body.unitCount != null ? Number(body.unitCount) : undefined,
    holes: body.holes != null ? Number(body.holes) : null,
    surface: body.surface ?? null,
    ownership: body.ownership,
    partnerName: body.partnerName,
  });
  revalidatePath("/amenities");
  return NextResponse.json({ ok: true, amenity });
}
