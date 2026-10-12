import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  ensureSeedProviderSubscriptions,
  listProviderSubscriptions,
} from "@/lib/server/provider-subscriptions";
import { isStripeConfigured } from "@/lib/server/stripe";
import { SubscriptionsClient } from "./subscriptions-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard");
  }

  await ensureSeedProviderSubscriptions();
  const subscriptions = await listProviderSubscriptions();

  return (
    <SubscriptionsClient
      initial={subscriptions}
      stripeConfigured={isStripeConfigured()}
    />
  );
}
