import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";
import {
  defaultDailyHours,
  formatHoursSummary,
  parseWeeklyHours,
  type WeeklyHours,
} from "@/lib/hours";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const TIME = /^\d{2}:\d{2}$/;

function canEdit(role: string | undefined) {
  return role === "admin" || role === "pm" || role === "board";
}

function parseHours(input: unknown): WeeklyHours | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const hours = {} as WeeklyHours;
  for (const key of DAY_KEYS) {
    const day = src[key];
    if (day == null) {
      hours[key] = null;
      continue;
    }
    if (typeof day !== "object") return null;
    const open = String((day as { open?: unknown }).open ?? "");
    const close = String((day as { close?: unknown }).close ?? "");
    if (!TIME.test(open) || !TIME.test(close) || open >= close) return null;
    hours[key] = { open, close };
  }
  return hours;
}

function present(row: {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  hoursJson: string;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fee: row.fee,
    schedule: row.schedule,
    hours: parseWeeklyHours(row.hoursJson),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const rows = await prisma.amenity.findMany({
    where: { communityId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ amenities: rows.map(present) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; description?: string; fee?: number; open?: string; close?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const open = body.open?.trim() || "08:00";
  const close = body.close?.trim() || "20:00";
  const fee = Number(body.fee ?? 0);
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Name must be 2 to 80 characters" }, { status: 400 });
  }
  if (description.length > 500) {
    return NextResponse.json({ error: "Description is too long" }, { status: 400 });
  }
  if (!TIME.test(open) || !TIME.test(close) || open >= close) {
    return NextResponse.json({ error: "Open must be earlier than close" }, { status: 400 });
  }
  if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
    return NextResponse.json({ error: "Fee must be between 0 and 10000" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const hours = defaultDailyHours(open, close);
  const row = await prisma.amenity.create({
    data: {
      communityId,
      name,
      description,
      fee,
      schedule: formatHoursSummary(hours),
      hoursJson: JSON.stringify(hours),
      kind: "facility",
      unitCount: 1,
      ownership: "club",
      playable: true,
    },
  });
  revalidatePath("/member/hours");
  revalidatePath("/member/bookings");
  revalidatePath("/pm/amenities");
  return NextResponse.json({ ok: true, amenity: present(row) });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    id?: string;
    name?: string;
    description?: string;
    fee?: number;
    hours?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Amenity is required" }, { status: 400 });
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.amenity.findFirst({
    where: { id: body.id, communityId },
  });
  if (!existing) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });

  const data: {
    name?: string;
    description?: string;
    fee?: number;
    hoursJson?: string;
    schedule?: string;
  } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Name must be 2 to 80 characters" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.description !== undefined) {
    const description = body.description.trim();
    if (description.length > 500) {
      return NextResponse.json({ error: "Description is too long" }, { status: 400 });
    }
    data.description = description;
  }
  if (body.fee !== undefined) {
    const fee = Number(body.fee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
      return NextResponse.json({ error: "Fee must be between 0 and 10000" }, { status: 400 });
    }
    data.fee = fee;
  }
  if (body.hours !== undefined) {
    const hours = parseHours(body.hours);
    if (!hours) {
      return NextResponse.json({ error: "Hours must be an open and close time, or closed" }, { status: 400 });
    }
    data.hoursJson = JSON.stringify(hours);
    data.schedule = formatHoursSummary(hours, existing.schedule);
  }
  const row = await prisma.amenity.update({ where: { id: existing.id }, data });
  revalidatePath("/member/hours");
  revalidatePath("/member/bookings");
  revalidatePath("/pm/amenities");
  return NextResponse.json({ ok: true, amenity: present(row) });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Amenity is required" }, { status: 400 });
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.amenity.findFirst({
    where: { id: body.id, communityId },
  });
  if (!existing) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  await prisma.amenity.delete({ where: { id: existing.id } });
  revalidatePath("/member/hours");
  revalidatePath("/member/bookings");
  revalidatePath("/pm/amenities");
  return NextResponse.json({ ok: true });
}
