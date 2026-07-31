import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/server/auth";
import { IRON_LAKE_GUEST_FEES } from "@/lib/iron-lake-fees";
import {
  createMemberCharge,
  listGuestFeeCharges,
} from "@/lib/server/records";

/** Generic court guest fees for non–Iron Lake clubs (avoid IronCrest rates mid-pitch). */
const DEFAULT_GUEST_FEES = {
  accompanied: 25,
  unaccompanied: 50,
} as const;

function feePresetsFor(communityId: string | null | undefined) {
  if (communityId === "iron-lake") {
    return {
      accompanied: {
        amount: IRON_LAKE_GUEST_FEES.courtAccompanied,
        label: "Accompanied Guest Court Fee",
      },
      unaccompanied: {
        amount: IRON_LAKE_GUEST_FEES.courtUnaccompanied,
        label: "Unaccompanied Guest Court Fee",
      },
    } as const;
  }
  return {
    accompanied: {
      amount: DEFAULT_GUEST_FEES.accompanied,
      label: "Accompanied Guest Court Fee",
    },
    unaccompanied: {
      amount: DEFAULT_GUEST_FEES.unaccompanied,
      label: "Unaccompanied Guest Court Fee",
    },
  } as const;
}

type FeeKind = "accompanied" | "unaccompanied";

function canManageGuestFees(role: string) {
  return role === "pm" || role === "admin" || role === "board";
}

/** List court guest-fee invoices for the club. */
export async function GET() {
  const session = await getSession();
  if (!session || !canManageGuestFees(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const presets = feePresetsFor(session.communityId);
  const charges = await listGuestFeeCharges(session.communityId);
  return NextResponse.json({
    charges,
    presets: {
      accompanied: presets.accompanied.amount,
      unaccompanied: presets.unaccompanied.amount,
    },
  });
}

/**
 * Create a court guest-fee invoice for a non-member (e.g. USTA team player)
 * and return a public pay link the club can email/text.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageGuestFees(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    guestName?: string;
    guestEmail?: string;
    feeKind?: FeeKind;
    amount?: number;
    note?: string;
    hostMemberName?: string;
    matchDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const guestName = body.guestName?.trim();
  const guestEmail = body.guestEmail?.trim().toLowerCase();
  if (!guestName || !guestEmail || !guestEmail.includes("@")) {
    return NextResponse.json(
      { error: "Guest name and email are required." },
      { status: 400 },
    );
  }

  const feeKind: FeeKind =
    body.feeKind === "unaccompanied" ? "unaccompanied" : "accompanied";
  const preset = feePresetsFor(session.communityId)[feeKind];
  const amount =
    typeof body.amount === "number" && body.amount > 0
      ? body.amount
      : preset.amount;

  const noteBits = [
    preset.label,
    body.hostMemberName?.trim()
      ? `Host / team contact: ${body.hostMemberName.trim()}`
      : null,
    body.matchDate?.trim() ? `Match date: ${body.matchDate.trim()}` : null,
    body.note?.trim() || null,
    "USTA / non-member court guest",
  ].filter(Boolean);

  if (!session.communityId) {
    return NextResponse.json({ error: "No club on session" }, { status: 400 });
  }

  const payToken = randomBytes(16).toString("hex");
  const charge = await createMemberCharge({
    communityId: session.communityId,
    memberEmail: guestEmail,
    memberName: guestName,
    category: "racquets",
    description: noteBits.join(" · "),
    amount,
    status: "due",
    referenceType: "court_guest_fee",
    referenceId: feeKind,
    payToken,
  });

  const origin = new URL(request.url).origin;
  const payUrl = `${origin}/pay/guest/${payToken}`;

  return NextResponse.json({
    ok: true,
    charge,
    payUrl,
    /** Demo: no real email provider — UI copies the link to send manually. */
    emailQueued: false,
    message:
      "Invoice created. Copy the pay link and send it to the guest (email/text).",
  });
}
