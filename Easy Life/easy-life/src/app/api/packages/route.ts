import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = session.communityId ?? "golden-ocala";
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const memberEmail = searchParams.get("memberEmail");

  const where: Record<string, unknown> = { communityId };
  
  if (status) {
    where.status = status;
  }
  
  if (session.role === "member") {
    where.memberEmail = session.email;
  } else if (memberEmail) {
    where.memberEmail = memberEmail;
  }

  const packages = await prisma.package.findMany({
    where,
    orderBy: { arrivedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "pm", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    memberEmail,
    memberName,
    unit,
    carrier,
    trackingNumber,
    description,
    location,
  } = body;

  if (!memberEmail || !memberName || !carrier) {
    return NextResponse.json(
      { error: "memberEmail, memberName, and carrier are required" },
      { status: 400 }
    );
  }

  const communityId = session.communityId ?? "golden-ocala";

  const pkg = await prisma.package.create({
    data: {
      communityId,
      memberEmail,
      memberName,
      unit: unit ?? "",
      carrier,
      trackingNumber: trackingNumber ?? null,
      description: description ?? "",
      location: location ?? "Front Desk",
      status: "arrived",
      receivedBy: session.name,
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}
