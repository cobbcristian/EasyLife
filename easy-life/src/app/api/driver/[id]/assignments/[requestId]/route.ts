import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { sendSms, isSmsConfigured } from "@/lib/server/sms";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await params;
  const body = await req.json();

  // Verify driver exists
  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { name: true, communityId: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Get the request
  const existing = await prisma.tramRequest.findUnique({
    where: { id: requestId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Verify this request is assigned to this driver
  if (existing.driverName !== driver.name) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  // Valid status transitions for driver
  const validTransitions: Record<string, string[]> = {
    dispatched: ["en_route"],
    en_route: ["arrived"],
    arrived: ["completed"],
  };

  if (body.status) {
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot change from ${existing.status} to ${body.status}` },
        { status: 400 }
      );
    }

    updateData.status = body.status;

    // Auto-set timestamps
    if (body.status === "arrived") {
      updateData.actualPickup = new Date();
    }
    if (body.status === "completed") {
      updateData.completedAt = new Date();
    }
  }

  const updated = await prisma.tramRequest.update({
    where: { id: requestId },
    data: updateData,
  });

  // Notify resident when driver is en route
  if (body.status === "en_route" && existing.phone && isSmsConfigured()) {
    const smsBody = `🚐 Your tram is on the way!
Driver: ${driver.name}
Vehicle: ${existing.vehicleId || "Tram"}
Pickup: ${existing.pickupLocation}

Please be ready at the pickup location.`;

    await sendSms({ to: existing.phone, body: smsBody });
  }

  // Notify resident when driver has arrived
  if (body.status === "arrived" && existing.phone && isSmsConfigured()) {
    const smsBody = `🚐 Your tram has arrived!
Location: ${existing.pickupLocation}
Driver: ${driver.name}

Please come out to meet your driver.`;

    await sendSms({ to: existing.phone, body: smsBody });
  }

  return NextResponse.json(updated);
}
