import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import { ensureRecordsSeeded, getAmenityAvailability } from "@/lib/server/records";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const startTime = url.searchParams.get("startTime") ?? undefined;
  const endTime = url.searchParams.get("endTime") ?? undefined;
  const result = await getAmenityAvailability(id, date, startTime, endTime);
  if (!result) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  }

  return NextResponse.json({
    unitCount: result.unitCount,
    unitsUsed: result.unitsUsed ?? 0,
    unitsFree: result.unitsFree ?? result.unitCount,
    fullyBooked: result.fullyBooked ?? false,
    windows: result.windows ?? [],
  });
}
