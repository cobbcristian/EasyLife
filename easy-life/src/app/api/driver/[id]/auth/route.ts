import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!rateLimit(`driver-pin:${clientIp(req)}:${id}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait and try again." },
      { status: 429 },
    );
  }
  const body = await req.json();

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { pin: true, active: true },
  });

  const supplied = Buffer.from(String(body.pin ?? ""));
  const expected = Buffer.from(driver?.active ? driver.pin : "invalid");
  const match = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!driver || !driver.active || !match) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
