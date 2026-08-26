import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getAutopaySettings, updateAutopaySettings } from "@/lib/server/autopay";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getAutopaySettings(session.email);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { enabled?: boolean; day?: number };
  try {
    body = (await request.json()) as { enabled?: boolean; day?: number };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const settings = await updateAutopaySettings(
    session.email,
    body.enabled ?? false,
    body.day ?? 1,
  );
  return NextResponse.json({ settings });
}
