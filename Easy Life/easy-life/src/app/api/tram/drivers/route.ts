import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";
import { hashDriverPin } from "@/lib/server/driver-auth";

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

  // Hash PIN if provided, otherwise leave undefined (driver cannot log in)
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
