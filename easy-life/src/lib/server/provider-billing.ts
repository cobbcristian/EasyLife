import { PROVIDER_PLANS, type ProviderPlanId } from "@/lib/provider-plans";
import { ensureStripeCustomer } from "@/lib/server/payment-methods";
import { upsertProviderSubscription } from "@/lib/server/provider-subscriptions";
import { getStripe, isStripeConfigured } from "@/lib/server/stripe";

export type { ProviderPlanId };
export { PROVIDER_PLANS };

export function getProviderPriceId(plan: ProviderPlanId): string | undefined {
  if (plan === "starter") {
    return process.env.STRIPE_PROVIDER_PRICE_ID;
  }
  return undefined;
}

export async function createProviderSubscriptionCheckout(input: {
  userEmail: string;
  name?: string;
  plan: ProviderPlanId;
  origin: string;
  returnPath?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured" };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured" };
  }

  const customerId = await ensureStripeCustomer(input.userEmail, input.name);
  if (!customerId) {
    return { error: "Could not create Stripe customer" };
  }

  await upsertProviderSubscription({
    userEmail: input.userEmail,
    businessName: input.name,
    planId: input.plan,
    status: "pending",
    stripeCustomerId: customerId,
  });

  const returnPath = input.returnPath ?? "/provider/subscribe?subscription=success";
  const priceId = getProviderPriceId(input.plan);
  const planMeta = PROVIDER_PLANS[input.plan];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "usd",
                product_data: { name: `Provider ${planMeta.name}` },
                unit_amount: 4900,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
      success_url: `${input.origin}${returnPath}`,
      cancel_url: `${input.origin}/provider/subscribe?subscription=cancelled`,
      metadata: { plan: input.plan, userEmail: input.userEmail },
    });

    if (!session.url) {
      return { error: "Could not start checkout" };
    }
    return { url: session.url };
  } catch {
    return { error: "Could not start checkout" };
  }
}

export async function createProviderBillingPortal(input: {
  userEmail: string;
  name?: string;
  origin: string;
  returnPath?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured" };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured" };
  }

  const customerId = await ensureStripeCustomer(input.userEmail, input.name);
  if (!customerId) {
    return { error: "No billing account found" };
  }

  const returnPath = input.returnPath ?? "/provider/account#billing";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${input.origin}${returnPath}`,
    });
    return { url: session.url };
  } catch {
    return { error: "Could not open billing portal" };
  }
}
