import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listProviderReviews, upsertProviderReview } from "@/lib/server/local-pros";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const reviews = await listProviderReviews(id, session.communityId);
  return NextResponse.json({ reviews });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5 stars" }, { status: 400 });
  }

  const result = await upsertProviderReview({
    providerId: id,
    communityId: session.communityId ?? null,
    memberEmail: session.email,
    memberName: session.name,
    rating: body.rating,
    comment: body.comment,
  });
  if (!result) return NextResponse.json({ error: "Pro not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
