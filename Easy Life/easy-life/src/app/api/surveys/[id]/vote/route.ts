import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { castVote } from "@/lib/server/records";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { optionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.optionId) {
    return NextResponse.json({ error: "Option required" }, { status: 400 });
  }
  const result = await castVote({
    surveyId: id,
    optionId: body.optionId,
    voterEmail: session.email,
    communityId: session.communityId,
  });
  if (!result.ok) {
    const notFound =
      result.error === "Survey not found" ||
      result.error === "Invalid option for this survey";
    return NextResponse.json(
      { error: result.error },
      { status: notFound ? 404 : 409 },
    );
  }
  revalidatePath("/board/governance");
  return NextResponse.json({ ok: true });
}
