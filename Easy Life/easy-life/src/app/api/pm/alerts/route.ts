import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";
import {
  listActiveAlerts,
  notifyCommunityAlert,
} from "@/lib/server/community-alerts";

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await listActiveAlerts(staff.communityId);
  return NextResponse.json({
    alerts: rows.map((row) => ({
      id: row.id,
      message: row.message,
      detail: row.detail,
      authorName: row.authorName,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const staff = await requireStaffCommunity();
  if (!staff?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { message?: string; detail?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const message = body.message?.trim() ?? "";
  const detail = body.detail?.trim() ?? "";
  if (message.length < 4 || message.length > 160) {
    return NextResponse.json(
      { error: "Write a short alert, between 4 and 160 characters" },
      { status: 400 },
    );
  }
  if (detail.length > 300) {
    return NextResponse.json({ error: "Detail is too long" }, { status: 400 });
  }
  const created = await prisma.communityAlert.create({
    data: {
      communityId: staff.communityId,
      message,
      detail,
      authorName: staff.session.name,
    },
  });
  await notifyCommunityAlert(staff.communityId, message, detail);
  return NextResponse.json({
    ok: true,
    alert: { id: created.id, message: created.message, detail: created.detail },
  });
}

export async function PATCH(request: Request) {
  const staff = await requireStaffCommunity();
  if (!staff?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing alert" }, { status: 400 });
  }
  const existing = await prisma.communityAlert.findFirst({
    where: { id: body.id, communityId: staff.communityId, active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  await prisma.communityAlert.update({
    where: { id: existing.id },
    data: { active: false, clearedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
