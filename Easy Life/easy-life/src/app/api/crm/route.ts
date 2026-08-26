import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listProspects,
  createProspect,
  updateProspectStage,
  addCrmActivity,
  getCrmPipelineSummary,
} from "@/lib/server/member-crm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board", "sales"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId ?? "golden-ocala";
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") ?? undefined;
  const [prospects, pipeline] = await Promise.all([
    listProspects(communityId, stage),
    getCrmPipelineSummary(communityId),
  ]);
  return NextResponse.json({ prospects, pipeline });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board", "sales"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId ?? "golden-ocala";
  let body: {
    action?: "create" | "stage" | "activity";
    name?: string;
    email?: string;
    phone?: string;
    stage?: string;
    source?: string;
    notes?: string;
    prospectId?: string;
    type?: string;
    subject?: string;
    activityBody?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "stage" && body.prospectId && body.stage) {
    const prospect = await updateProspectStage(body.prospectId, body.stage);
    return NextResponse.json({ prospect });
  }

  if (body.action === "activity" && body.prospectId && body.subject) {
    const activity = await addCrmActivity({
      prospectId: body.prospectId,
      type: body.type ?? "note",
      subject: body.subject,
      body: body.activityBody,
      createdBy: session.name,
    });
    return NextResponse.json({ activity });
  }

  if (!body.name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const prospect = await createProspect({
    communityId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    stage: body.stage,
    source: body.source,
    notes: body.notes,
    assignedTo: session.name,
  });
  return NextResponse.json({ prospect });
}
