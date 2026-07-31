import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { prisma } from "@/lib/server/prisma";
import { upsertProviderReview } from "@/lib/server/local-pros";

/** Payment confirmation + optional review after a service request. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    serviceRequestId?: string;
    providerId?: string;
    amount?: number;
    rating?: number;
    review?: string;
    action?: "pay" | "review";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "review") {
    if (!body.providerId || !body.rating) {
      return NextResponse.json(
        { error: "providerId and rating required" },
        { status: 400 },
      );
    }
    await upsertProviderReview({
      providerId: body.providerId,
      communityId: session.communityId ?? null,
      memberEmail: session.email,
      memberName: session.name,
      rating: body.rating,
      comment: body.review ?? "",
    });
    return NextResponse.json({ ok: true, reviewed: true });
  }

  // Demo payment — mark related service request completed when possible.
  if (body.serviceRequestId) {
    await prisma.serviceRequest
      .update({
        where: { id: body.serviceRequestId },
        data: { status: "completed" },
      })
      .catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    paid: true,
    amount: body.amount ?? 0,
    receiptId: `rcpt_${Date.now().toString(36)}`,
  });
}
