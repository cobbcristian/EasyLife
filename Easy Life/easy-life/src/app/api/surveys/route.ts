import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createSurvey, ensureRecordsSeeded, listSurveys } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  return NextResponse.json({ surveys: await listSurveys(session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["board", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { title?: string; description?: string; closes?: string; options?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const options = (body.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (!body.title || options.length < 2) {
    return NextResponse.json({ error: "Title and at least 2 options required" }, { status: 400 });
  }
  const survey = await createSurvey({
    communityId: session.communityId,
    title: body.title,
    description: body.description ?? "",
    closes: body.closes ?? null,
    options,
  });
  revalidatePath("/board/governance");
  return NextResponse.json({ ok: true, survey });
}
