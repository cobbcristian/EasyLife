import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { upsertProviderReview } from "@/lib/server/local-pros";

/**
 * Mobile payment confirmation + optional review after a service request.
 *
 * SECURITY: This endpoint NO LONGER auto-completes serviceRequestId.
 * The old behavior allowed any authenticated user to mark any service
 * request as completed by just sending { serviceRequestId, paid: true }.
 *
 * Service request completion must go through a proper workflow with
 * ownership verification and actual payment confirmation.
 */
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

  return NextResponse.json({
    ok: true,
    paid: true,
    amount: body.amount ?? 0,
    receiptId: `rcpt_${Date.now().toString(36)}`,
  });
}
