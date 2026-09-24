import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";
import { hashDriverPin, clearPinRateLimit } from "@/lib/server/driver-auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPM = session.role === "pm" || session.role === "admin";
  if (!isPM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const communityId = session.communityId || "golden-ocala";

  const drivers = await prisma.tramDriver.findMany({
    where: { communityId, active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPM = session.role === "pm" || session.role === "admin";
  if (!isPM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const communityId = session.communityId || "golden-ocala";
  const body = await req.json();

  if (!body.name || !body.phone) {
    return NextResponse.json(
      { error: "Name and phone are required" },
      { status: 400 }
    );
  }

  const hashedPin = body.pin ? hashDriverPin(body.pin) : undefined;

  const driver = await prisma.tramDriver.create({
    data: {
      communityId,
      name: body.name,
      phone: body.phone,
      ...(hashedPin && { pin: hashedPin }),
      status: "off_duty",
    },
  });

  return NextResponse.json(driver, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPM = session.role === "pm" || session.role === "admin";
  if (!isPM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const communityId = session.communityId || "golden-ocala";
  const body = await req.json();

  if (!body.driverId) {
    return NextResponse.json(
      { error: "driverId is required" },
      { status: 400 }
    );
  }

  const driver = await prisma.tramDriver.findUnique({
    where: { id: body.driverId },
    select: { id: true, communityId: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (driver.communityId !== communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.pin !== undefined) {
    if (body.pin === null || body.pin === "") {
      updateData.pin = null;
    } else {
      updateData.pin = hashDriverPin(body.pin);
    }
    clearPinRateLimit(`driver_pin:${body.driverId}`);
  }

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.phone !== undefined) {
    updateData.phone = body.phone;
  }

  if (body.active !== undefined) {
    updateData.active = body.active;
  }

  const updated = await prisma.tramDriver.update({
    where: { id: body.driverId },
    data: updateData,
  });

  return NextResponse.json(updated);
}
