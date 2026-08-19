import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const isStaff = ["admin", "pm", "board"].includes(session.role);
  const isOwner = pkg.memberEmail === session.email;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isStaff && session.communityId && pkg.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (status === "notified" && isStaff) {
    updateData.status = "notified";
    updateData.notifiedAt = new Date();
  } else if (status === "picked_up") {
    updateData.status = "picked_up";
    updateData.pickedUpAt = new Date();
    updateData.pickedUpBy = session.name;
  } else if (status === "returned" && isStaff) {
    updateData.status = "returned";
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
  }

  const updated = await prisma.package.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }
  if (session.communityId && pkg.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.package.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
