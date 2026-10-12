import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import {
  removeExpoPushToken,
  saveExpoPushToken,
} from "@/lib/server/expo-push";
import { prisma } from "@/lib/server/prisma";

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
    const email = session.email.toLowerCase();
    if (body.action === "unregister") {
      await removeExpoPushToken(email, body.token);
      await prisma.memberProfileExt.upsert({
        where: { userEmail: email },
        create: { userEmail: email, commsPush: false },
        update: { commsPush: false },
      });
    } else {
      await saveExpoPushToken(email, body.token);
      await prisma.memberProfileExt.upsert({
        where: { userEmail: email },
        create: { userEmail: email, commsPush: true },
        update: { commsPush: true },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
