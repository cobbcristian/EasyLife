import { getSession } from "@/lib/server/auth";
import {
  ensureSeedProviderSubscriptions,
  getProviderSubscription,
  isSubscriptionAccessGranted,
} from "@/lib/server/provider-subscriptions";
import { isStripeConfigured } from "@/lib/server/stripe";
import { ProviderPaywallGate } from "@/components/layout/provider-paywall-gate";
import { ProviderShell } from "@/components/layout/provider-shell";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let needsSubscription = false;
  const session = await getSession();
  if (session?.role === "provider" && isStripeConfigured()) {
    await ensureSeedProviderSubscriptions();
    const sub = await getProviderSubscription(session.email);
    needsSubscription = !isSubscriptionAccessGranted(sub?.status);
  }

  return (
    <ProviderShell>
      <ProviderPaywallGate needsSubscription={needsSubscription}>
        {children}
      </ProviderPaywallGate>
    </ProviderShell>
  );
}
