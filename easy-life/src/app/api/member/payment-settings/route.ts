import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  getPaymentSettings,
  updatePaymentPreference,
  type PaymentPreference,
} from "@/lib/server/payment-methods";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getPaymentSettings(session.email);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { preference?: PaymentPreference };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.preference !== "always_prompt" && body.preference !== "store") {
    return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
  }

  const settings = await updatePaymentPreference(session.email, body.preference);
  return NextResponse.json(settings);
}
