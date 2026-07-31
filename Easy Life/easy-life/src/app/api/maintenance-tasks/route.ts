import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createMaintenanceTask,
  ensureRecordsSeeded,
  listMaintenanceTasks,
  logEvent,
} from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  const rows = await listMaintenanceTasks(session.communityId);
  return NextResponse.json({
    tasks: rows.map((t) => ({
      id: t.id,
      title: t.title,
      area: t.area,
      assignedTo: t.assignedTo,
      status: t.status,
      due: t.due,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "pm") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; area?: string; assignedTo?: string; due?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title?.trim() || !body.area?.trim() || !body.due?.trim()) {
    return NextResponse.json({ error: "Title, area, and due date required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const task = await createMaintenanceTask({
    communityId: session.communityId,
    title: body.title.trim(),
    area: body.area.trim(),
    assignedTo: body.assignedTo?.trim() || "Unassigned",
    due: body.due.trim(),
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Maintenance task logged",
    detail: body.title.trim(),
  });
  revalidatePath("/pm/maintenance");
  return NextResponse.json({ ok: true, task });
}
