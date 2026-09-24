import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getDriverSessionFromRequest } from "@/lib/server/driver-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Require driver session
  const session = await getDriverSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session belongs to this driver
  if (session.sub !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, vehicleId: true, communityId: true, active: true },
  });

  if (!driver || !driver.active) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Verify communityId matches session
  if (driver.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
