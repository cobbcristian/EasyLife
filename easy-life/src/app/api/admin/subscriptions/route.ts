import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  ensureSeedProviderSubscriptions,
  listProviderSubscriptions,
  setProviderSubscriptionStatus,
  syncProviderSubscriptionFromStripe,
  type SubscriptionStatus,
} from "@/lib/server/provider-subscriptions";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSeedProviderSubscriptions();
  const subscriptions = await listProviderSubscriptions();
  return NextResponse.json({ subscriptions });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    userEmail?: string;
    status?: SubscriptionStatus;
    action?: "sync";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.userEmail?.trim()) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
  }

  if (body.action === "sync") {
    const synced = await syncProviderSubscriptionFromStripe(body.userEmail);
    if (!synced) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ subscription: synced });
  }

  if (!body.status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const updated = await setProviderSubscriptionStatus({
    userEmail: body.userEmail,
    status: body.status,
  });
  if (!updated) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ subscription: updated });
}
