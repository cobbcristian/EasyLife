import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import {
  ensureSeedProviderSubscriptions,
  getProviderSubscription,
  isSubscriptionAccessGranted,
  syncProviderSubscriptionFromStripe,
} from "@/lib/server/provider-subscriptions";
import { isStripeConfigured } from "@/lib/server/stripe";
import { SubscribeClient } from "./subscribe-client";

export const dynamic = "force-dynamic";

export default async function ProviderSubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ subscription?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    redirect("/login");
  }

  await ensureSeedProviderSubscriptions();
  const params = await searchParams;

  let sub = await getProviderSubscription(session.email);
  if (params.subscription === "success" || isStripeConfigured()) {
    sub =
      (await syncProviderSubscriptionFromStripe(session.email)) ?? sub;
  }

  if (isSubscriptionAccessGranted(sub?.status)) {
    redirect("/provider");
  }

  return (
    <SubscribeClient
      planId={sub?.planId ?? "starter"}
      status={sub?.status ?? "pending"}
      cancelled={params.subscription === "cancelled"}
      stripeConfigured={isStripeConfigured()}
    />
  );
}
