import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createProviderSubscriptionCheckout,
  type ProviderPlanId,
} from "@/lib/server/provider-billing";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: ProviderPlanId; returnPath?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = body.plan ?? "starter";
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const result = await createProviderSubscriptionCheckout({
    userEmail: session.email,
    name: session.name,
    plan,
    origin,
    returnPath: body.returnPath,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ url: result.url });
}
