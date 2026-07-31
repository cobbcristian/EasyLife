import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import {
  removeExpoPushToken,
  saveExpoPushToken,
} from "@/lib/server/expo-push";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function POST(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: "register" | "unregister"; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    if (body.action === "unregister") {
      await removeExpoPushToken(session.email, body.token);
    } else {
      await saveExpoPushToken(session.email, body.token);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
