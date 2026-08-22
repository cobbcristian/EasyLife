import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { upsertProviderReview } from "@/lib/server/local-pros";
import { prisma } from "@/lib/server/prisma";

/** Submit a post-pay review by provider id or email. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    providerId?: string;
    providerEmail?: string;
    rating?: number;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5 stars" }, { status: 400 });
  }

  let providerId = body.providerId?.trim();
  if (!providerId && body.providerEmail?.trim()) {
    const row = await prisma.provider.findFirst({
      where: {
        email: body.providerEmail.trim(),
        ...(session.communityId
          ? { communityId: session.communityId }
          : {}),
      },
      select: { id: true },
    });
    providerId = row?.id;
  }
  if (!providerId) {
    // Demo bookings may not map to a Provider row — still acknowledge the review.
    return NextResponse.json({
      ok: true,
      stored: false,
      message: "Thanks for your review!",
    });
  }

  const result = await upsertProviderReview({
    providerId,
    communityId: session.communityId ?? null,
    memberEmail: session.email,
    memberName: session.name,
    rating: body.rating,
    comment: body.comment,
  });
  if (!result) {
    return NextResponse.json({
      ok: true,
      stored: false,
      message: "Thanks for your review!",
    });
  }
  return NextResponse.json({ ok: true, stored: true, ...result });
}
