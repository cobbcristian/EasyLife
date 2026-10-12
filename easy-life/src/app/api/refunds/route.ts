import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createRefundRequest,
  listRefundRequestsForMember,
  listRefundRequestsForProvider,
  resolveRefundRequest,
  type RefundStatus,
} from "@/lib/server/refunds";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "provider") {
    const refunds = await listRefundRequestsForProvider(session.email);
    return NextResponse.json({ refunds });
  }

  const refunds = await listRefundRequestsForMember(session.email);
  return NextResponse.json({ refunds });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["member", "provider", "admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    bookingId?: string;
    bookingType?: string;
    title?: string;
    amountCents?: number;
    reason?: string;
    providerEmail?: string;
    paymentLabel?: string;
    dateLabel?: string;
    timeLabel?: string;
    locationLine1?: string;
    locationLine2?: string;
    rateLabel?: string;
    memberEmail?: string;
    memberName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.bookingId || !body.title || !body.reason?.trim()) {
    return NextResponse.json(
      { error: "Booking, title, and reason are required" },
      { status: 400 },
    );
  }

  const amountCents =
    typeof body.amountCents === "number" && body.amountCents > 0
      ? Math.round(body.amountCents)
      : 2000;

  const memberEmail =
    session.role === "member"
      ? session.email
      : (body.memberEmail?.trim().toLowerCase() ?? session.email);
  const memberName =
    session.role === "member"
      ? session.name
      : (body.memberName?.trim() || "Member");

  const refund = await createRefundRequest({
    communityId: session.communityId,
    bookingId: body.bookingId,
    bookingType: body.bookingType,
    title: body.title,
    memberEmail,
    memberName,
    providerEmail:
      session.role === "provider"
        ? session.email
        : (body.providerEmail ?? null),
    amountCents,
    reason: body.reason,
    paymentLabel: body.paymentLabel,
    dateLabel: body.dateLabel,
    timeLabel: body.timeLabel,
    locationLine1: body.locationLine1,
    locationLine2: body.locationLine2,
    rateLabel: body.rateLabel,
  });

  return NextResponse.json({ ok: true, refund });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !["provider", "admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: RefundStatus; issueViaStripe?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const nextStatus =
    body.status === "approved" && body.issueViaStripe ? "refunded" : body.status;

  if (nextStatus === "pending") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const refund = await resolveRefundRequest({
    id: body.id,
    status: nextStatus,
  });
  if (!refund) {
    return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, refund });
}
