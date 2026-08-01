import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { pin: true, active: true },
  });

  if (!driver || !driver.active) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (driver.pin !== body.pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
