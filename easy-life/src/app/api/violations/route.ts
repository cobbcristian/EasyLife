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

  const violations = await prisma.violation.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(violations);
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
    category,
    title,
    description,
    photoUrl,
    fineAmountCents,
    dueDate,
  } = body;

  if (!memberEmail || !memberName || !category || !title || !description) {
    return NextResponse.json(
      { error: "memberEmail, memberName, category, title, and description are required" },
      { status: 400 }
    );
  }

  const communityId = session.communityId ?? "golden-ocala";

  const violation = await prisma.violation.create({
    data: {
      communityId,
      memberEmail,
      memberName,
      unit: unit ?? "",
      category,
      title,
      description,
      photoUrl: photoUrl ?? null,
      fineAmountCents: fineAmountCents ?? 0,
      dueDate: dueDate ?? null,
      status: fineAmountCents > 0 ? "fined" : "warning",
      issuedBy: session.name,
    },
  });

  return NextResponse.json(violation, { status: 201 });
}
