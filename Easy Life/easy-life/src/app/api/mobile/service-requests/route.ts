import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import {
  createServiceRequest,
  ensureRecordsSeeded,
  listServiceRequests,
  logEvent,
} from "@/lib/server/records";
import { parseBody, serviceRequestSchema } from "@/lib/server/validation";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function GET(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const requests = await listServiceRequests({
    email: session.email,
    communityId: session.communityId,
  });
  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      status: r.status,
      date: r.createdAt.toISOString().slice(0, 10),
    })),
  });
}

export async function POST(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(serviceRequestSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const created = await createServiceRequest({
    communityId: session.communityId,
    memberEmail: session.email,
    memberName: session.name,
    unit: parsed.data.unit ?? "—",
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Service request",
    detail: `${parsed.data.category}: ${parsed.data.title}`,
  });
  return NextResponse.json({
    ok: true,
    request: {
      id: created.id,
      title: created.title,
      category: created.category,
      description: created.description,
      status: created.status,
      date: created.createdAt.toISOString().slice(0, 10),
    },
  });
}
