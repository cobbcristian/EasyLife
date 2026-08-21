import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";
import { canMutateCommunityResource } from "@/lib/server/community-resource-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const violation = await prisma.violation.findUnique({ where: { id } });

  if (!violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  const isStaff = ["admin", "pm", "board"].includes(session.role);
  const isOwner = violation.memberEmail === session.email;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isStaff && !canMutateCommunityResource(session, violation.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isStaff && violation.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(violation);
}

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
  const { status, appealMessage, resolutionNote } = body;

  const violation = await prisma.violation.findUnique({ where: { id } });
  if (!violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  const isStaff = ["admin", "pm", "board"].includes(session.role);
  const isOwner = violation.memberEmail === session.email;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isStaff && !canMutateCommunityResource(session, violation.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isStaff && violation.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (isOwner && appealMessage && !violation.appealedAt) {
    updateData.status = "appealed";
    updateData.appealMessage = appealMessage;
    updateData.appealedAt = new Date();
  }

  if (isStaff) {
    if (status === "resolved" || status === "dismissed") {
      updateData.status = status;
      updateData.resolvedAt = new Date();
      if (resolutionNote) {
        updateData.resolutionNote = resolutionNote;
      }
    } else if (status === "fined" || status === "warning" || status === "open") {
      updateData.status = status;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const updated = await prisma.violation.update({
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
  const violation = await prisma.violation.findUnique({ where: { id } });
  if (!violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }
  if (!canMutateCommunityResource(session, violation.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.violation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
