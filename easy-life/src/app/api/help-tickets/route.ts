import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createHelpTicket,
  ensureRecordsSeeded,
  listHelpTickets,
  logEvent,
} from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  return NextResponse.json({ tickets: await listHelpTickets(session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subject?: string; priority?: string; message?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.subject || !body.message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
  }

  const ticket = await createHelpTicket({
    communityId: session.communityId,
    userName: session.name,
    email: body.email ?? session.email,
    subject: body.subject,
    priority: body.priority ?? "Medium",
    message: body.message,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Help ticket",
    detail: body.subject,
  });
  return NextResponse.json({ ok: true, ticket });
}
