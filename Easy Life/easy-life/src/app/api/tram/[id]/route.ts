import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tramRequest = await prisma.tramRequest.findUnique({ where: { id } });

  if (!tramRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tramRequest);
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
  const isPM = session.role === "pm" || session.role === "admin";

  const existing = await prisma.tramRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Members can only cancel their own requests
  if (!isPM && existing.memberEmail !== session.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Members can only cancel, not update other fields
  if (!isPM && body.status !== "cancelled") {
    return NextResponse.json(
      { error: "Members can only cancel requests" },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};

  // PM can update all fields
  if (isPM) {
    if (body.status) updateData.status = body.status;
    if (body.driverName !== undefined) updateData.driverName = body.driverName;
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId;
    if (body.driverNotes !== undefined) updateData.driverNotes = body.driverNotes;
    if (body.estimatedPickup) updateData.estimatedPickup = new Date(body.estimatedPickup);
    
    // Auto-set timestamps based on status
    if (body.status === "arrived" && !existing.actualPickup) {
      updateData.actualPickup = new Date();
    }
    if (body.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
  } else {
    // Member cancelling
    if (body.status === "cancelled") {
      updateData.status = "cancelled";
    }
  }

  const updated = await prisma.tramRequest.update({
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPM = session.role === "pm" || session.role === "admin";
  if (!isPM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.tramRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
