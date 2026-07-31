import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/server/payment-methods";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { isDefault?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.isDefault) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const settings = await setDefaultPaymentMethod(session.email, id);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const settings = await deletePaymentMethod(session.email, id);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
  }
}
