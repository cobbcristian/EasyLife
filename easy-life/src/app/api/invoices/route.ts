import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createInvoice, ensureRecordsSeeded, listInvoices, logEvent } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  return NextResponse.json({ invoices: await listInvoices(session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { vendor?: string; description?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.vendor || !body.amount) {
    return NextResponse.json({ error: "Vendor and amount required" }, { status: 400 });
  }
  const created = await createInvoice({
    communityId: session.communityId,
    vendor: body.vendor,
    description: body.description ?? "",
    amount: Number(body.amount),
    submittedBy: session.name,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Invoice submitted",
    detail: `${body.vendor} — $${Number(body.amount)}`,
  });
  revalidatePath("/board/invoices");
  revalidatePath("/pm/invoices");
  return NextResponse.json({ ok: true, invoice: created });
}
