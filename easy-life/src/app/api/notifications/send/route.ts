import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/notify";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { to?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.to || !body.subject) {
    return NextResponse.json(
      { error: "Recipient and subject are required" },
      { status: 400 },
    );
  }

  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    body: body.body ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
