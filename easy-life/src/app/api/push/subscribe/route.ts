import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  isPushConfigured,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/server/push";

export async function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: "subscribe" | "unsubscribe";
    subscription?: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "unsubscribe" && body.subscription?.endpoint) {
    await removePushSubscription(session.email, body.subscription.endpoint);
    return NextResponse.json({ ok: true });
  }

  if (!body.subscription?.endpoint || !body.subscription.keys) {
    return NextResponse.json({ error: "Subscription required" }, { status: 400 });
  }

  await savePushSubscription(session.email, body.subscription);
  return NextResponse.json({ ok: true });
}
