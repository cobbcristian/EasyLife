import { NextResponse } from "next/server";
import { createContactMessage } from "@/lib/server/records";
import { sendEmail } from "@/lib/server/notify";

const LEADS_INBOX =
  process.env.LEADS_INBOX_EMAIL?.trim() || "cobbcristian17@gmail.com";

function clean(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const community = clean(body.community, 160);
  const interest = clean(body.interest, 120);
  const message = clean(body.message, 2000);
  const source = clean(body.source, 80) || "google-ads";

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const detail = [
    `Phone: ${phone || "—"}`,
    `Community / club: ${community || "—"}`,
    `Interest: ${interest || "Demo / sales call"}`,
    `Source: ${source}`,
    "",
    message || "(No extra message)",
  ].join("\n");

  const subject = community
    ? `Sales lead — ${community}`
    : `Sales lead — ${name}`;

  try {
    await createContactMessage({
      communityId: "sales-leads",
      senderName: name,
      senderEmail: email,
      recipient: LEADS_INBOX,
      subject,
      message: detail,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save your request. Please try again." },
      { status: 500 },
    );
  }

  await sendEmail({
    to: LEADS_INBOX,
    subject,
    body: [
      "New Easy Life sales lead",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      detail,
      "",
      "Reply to this person to schedule a demo.",
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
