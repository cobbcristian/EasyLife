import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";
import { sendSms, isSmsConfigured } from "@/lib/server/sms";
import {
  canAccessTramRequest,
  canMutateTramRequest,
  isTramStaff,
} from "@/lib/server/tram-auth";
import { isSuperAdmin } from "@/lib/server/community-context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tramRequest = await prisma.tramRequest.findUnique({ where: { id } });

  if (!tramRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canAccessTramRequest(session, tramRequest)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tramRequest);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: {
    status?: string;
    driverName?: string;
    vehicleId?: string;
    driverNotes?: string;
    estimatedPickup?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.tramRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mutate = canMutateTramRequest(session, existing, body.status);
  if (!mutate.ok) {
    // Hide cross-tenant ids as 404
    if (!canAccessTramRequest(session, existing)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: mutate.error }, { status: mutate.status });
  }

  const staff = isSuperAdmin(session) || isTramStaff(session);
  const updateData: Record<string, unknown> = {};

  if (staff) {
    if (body.status) updateData.status = body.status;
    if (body.driverName !== undefined) updateData.driverName = body.driverName;
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId;
    if (body.driverNotes !== undefined) updateData.driverNotes = body.driverNotes;
    if (body.estimatedPickup) updateData.estimatedPickup = new Date(body.estimatedPickup);

    if (body.status === "arrived" && !existing.actualPickup) {
      updateData.actualPickup = new Date();
    }
    if (body.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
  } else if (body.status === "cancelled") {
    updateData.status = "cancelled";
  }

  const updated = await prisma.tramRequest.update({
    where: { id },
    data: updateData,
  });

  if (body.status === "dispatched" && body.driverName && isSmsConfigured()) {
    const driver = await prisma.tramDriver.findFirst({
      where: {
        communityId: existing.communityId,
        name: body.driverName,
        active: true,
      },
    });

    if (driver?.phone) {
      const eta = body.estimatedPickup
        ? new Date(body.estimatedPickup).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "ASAP";

      const smsBody = `🚐 TRAM PICKUP
From: ${existing.pickupLocation}
To: ${existing.destination}
Passengers: ${existing.passengers}
${existing.specialNeeds ? `Note: ${existing.specialNeeds}` : ""}
ETA: ${eta}
Vehicle: ${body.vehicleId || "See dispatch"}

View: ${process.env.NEXTAUTH_URL || ""}/driver/${driver.id}`;

      await sendSms({ to: driver.phone, body: smsBody });
    }
  }

  if (body.status === "en_route" && existing.phone && isSmsConfigured()) {
    const smsBody = `🚐 Your tram is on the way!
Driver: ${updated.driverName || "Staff"}
Vehicle: ${updated.vehicleId || "Tram"}
Pickup: ${existing.pickupLocation}

Please be ready at the pickup location.`;

    await sendSms({ to: existing.phone, body: smsBody });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSuperAdmin(session) && !isTramStaff(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.tramRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canAccessTramRequest(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tramRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
