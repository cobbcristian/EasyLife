import { NextResponse } from "next/server";
import { isPushConfigured } from "@/lib/server/push";
import { prisma } from "@/lib/server/prisma";

/** Public liveness — used by Azure / load balancers and demo-health. */
export async function GET() {
  let db = false;
  try {
    await prisma.community.findFirst({ select: { id: true } });
    db = true;
  } catch {
    db = false;
  }
  return NextResponse.json({
    ok: db,
    db,
    push: isPushConfigured(),
  });
}
