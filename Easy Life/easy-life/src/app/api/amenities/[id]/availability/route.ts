import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, getAmenityAvailability } from "@/lib/server/records";
import { calculateDynamicPrice } from "@/lib/server/tee-pricing";
import { communityHasDynamicPricing } from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const startTime = url.searchParams.get("startTime") ?? undefined;
  const endTime = url.searchParams.get("endTime") ?? undefined;
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const result = await getAmenityAvailability(
    id,
    date,
    startTime,
    endTime,
    communityId,
  );
  if (!result) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });

  let dynamicPricing: { finalFee: number; appliedRule: string | null } | null = null;
  if (communityHasDynamicPricing(communityId) && startTime) {
    const amenity = await prisma.amenity.findFirst({
      where: { id, communityId },
    });
    if (amenity && amenity.fee > 0) {
      dynamicPricing = await calculateDynamicPrice({
        communityId,
        amenityId: id,
        baseFee: amenity.fee,
        date,
        startTime,
      });
    }
  }

  return NextResponse.json({ ...result, dynamicPricing });
}
