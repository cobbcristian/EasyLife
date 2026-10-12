import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = session.communityId || "golden-ocala";
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const myRequests = searchParams.get("my") === "true";

  const where: Record<string, unknown> = { communityId };
  
  if (status && status !== "all") {
    where.status = status;
  }
  
  if (myRequests) {
    where.memberEmail = session.email;
  }

  const requests = await prisma.tramRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = session.communityId || "golden-ocala";
  const body = await req.json();

  const tramRequest = await prisma.tramRequest.create({
    data: {
      communityId,
      memberEmail: session.email,
      memberName: session.name || "Resident",
      phone: body.phone || null,
      pickupLocation: body.pickupLocation,
      destination: body.destination,
      passengers: body.passengers || 1,
      specialNeeds: body.specialNeeds || null,
      status: "requested",
    },
  });

  return NextResponse.json(tramRequest, { status: 201 });
}
