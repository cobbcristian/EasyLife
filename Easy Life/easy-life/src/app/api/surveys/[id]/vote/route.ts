import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { castVote } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import { isSuperAdmin } from "@/lib/server/community-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  if (
    !isSuperAdmin(session) &&
    (!session.communityId || survey.communityId !== session.communityId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { optionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.optionId) {
    return NextResponse.json({ error: "Option required" }, { status: 400 });
  }
  const option = await prisma.surveyOption.findFirst({
    where: { id: body.optionId, surveyId: id },
  });
  if (!option) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }
  const result = await castVote({
    surveyId: id,
    optionId: body.optionId,
    voterEmail: session.email,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  revalidatePath("/board/governance");
  return NextResponse.json({ ok: true });
}
