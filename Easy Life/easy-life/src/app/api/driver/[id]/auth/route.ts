import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { createDriverSessionToken } from "@/lib/server/driver-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { pin: true, active: true },
  });

  if (!driver || !driver.active) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (driver.pin !== String(body.pin ?? "")) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = await createDriverSessionToken(id);
  return NextResponse.json({ success: true, token });
}
