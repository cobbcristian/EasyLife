import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { prisma } from "@/lib/server/prisma";
import { upsertProviderReview } from "@/lib/server/local-pros";
import { canCompleteServiceRequestPayment } from "@/lib/service-request-payment";

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

  // Demo payment — mark related service request completed when the caller owns it.
  if (body.serviceRequestId) {
    const existing = await prisma.serviceRequest.findUnique({
      where: { id: body.serviceRequestId },
      select: { id: true, memberEmail: true, communityId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    if (
      !canCompleteServiceRequestPayment({
        requestMemberEmail: existing.memberEmail,
        sessionEmail: session.email,
        requestCommunityId: existing.communityId,
        sessionCommunityId: session.communityId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.serviceRequest.update({
      where: { id: existing.id },
      data: { status: "completed" },
    });
  }

  return NextResponse.json({
    ok: true,
    paid: true,
    amount: body.amount ?? 0,
    receiptId: `rcpt_${Date.now().toString(36)}`,
  });
}
