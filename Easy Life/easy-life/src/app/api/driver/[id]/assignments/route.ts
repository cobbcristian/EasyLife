import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import {
  driverBearerToken,
  verifyDriverSessionToken,
} from "@/lib/server/driver-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authorized = await verifyDriverSessionToken(
    driverBearerToken(req),
    id,
  );
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, vehicleId: true, communityId: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Get today's assignments for this driver
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignments = await prisma.tramRequest.findMany({
    where: {
      communityId: driver.communityId,
      driverName: driver.name,
      requestedAt: { gte: today },
      status: { in: ["dispatched", "en_route", "arrived", "completed"] },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ driver, assignments });
}
