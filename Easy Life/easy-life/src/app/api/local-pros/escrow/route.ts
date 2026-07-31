import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createEscrowJob,
  disputeEscrowJob,
  listEscrowJobsForMember,
  releaseEscrowJob,
} from "@/lib/server/local-pros";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = await listEscrowJobsForMember(session.email);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action?: "create" | "release" | "dispute";
    providerId?: string;
    jobId?: string;
    title?: string;
    description?: string;
    amountCents?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "release") {
    if (!body.jobId) return NextResponse.json({ error: "Job required" }, { status: 400 });
    const result = await releaseEscrowJob({
      jobId: body.jobId,
      memberEmail: session.email,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, job: result.job });
  }

  if (body.action === "dispute") {
    if (!body.jobId) return NextResponse.json({ error: "Job required" }, { status: 400 });
    const result = await disputeEscrowJob({
      jobId: body.jobId,
      memberEmail: session.email,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, job: result.job });
  }

  if (!body.providerId || !body.title || !body.amountCents) {
    return NextResponse.json(
      { error: "Provider, title, and amount required" },
      { status: 400 },
    );
  }

  const result = await createEscrowJob({
    communityId: session.communityId ?? null,
    providerId: body.providerId,
    memberEmail: session.email,
    memberName: session.name,
    title: body.title,
    description: body.description,
    amountCents: Math.round(body.amountCents),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
