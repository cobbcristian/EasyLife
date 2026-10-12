import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAmenities } from "@/lib/server/records";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function GET(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const amenities = await listAmenities(session.communityId);
  return NextResponse.json({
    amenities: amenities.map((a) => ({
      id: a.id,
      name: a.name,
      fee: a.fee,
      schedule: a.schedule,
      description: a.description,
      kind: a.kind,
      ownership: a.ownership,
      partnerName: a.partnerName,
      playable: a.playable,
      unplayableReason: a.unplayableReason,
    })),
  });
}
