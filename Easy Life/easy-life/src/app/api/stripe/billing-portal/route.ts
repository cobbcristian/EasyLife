import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { createProviderBillingPortal } from "@/lib/server/provider-billing";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { returnPath?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const result = await createProviderBillingPortal({
    userEmail: session.email,
    name: session.name,
    origin,
    returnPath: body.returnPath,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ url: result.url });
}
