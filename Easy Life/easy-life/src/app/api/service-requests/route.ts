import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { createServiceRequest, ensureRecordsSeeded, listServiceRequests, logEvent } from "@/lib/server/records";
import { parseBody, serviceRequestSchema } from "@/lib/server/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  try {
    await ensureFourClubDemoContent("full", session.communityId, session.email);
  } catch (err) {
    console.error("[api/service-requests] four-club seed failed", err);
  }
  const all =
    session.role === "member"
      ? await listServiceRequests({
          email: session.email,
          communityId: session.communityId,
        })
      : await listServiceRequests({ communityId: session.communityId });
  return NextResponse.json({ requests: all });
}

export async function POST(request: Request) {
  const session = await getSession();
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
  revalidatePath("/member/service-requests");
  revalidatePath("/pm/maintenance");
  return NextResponse.json({ ok: true, request: created });
}
