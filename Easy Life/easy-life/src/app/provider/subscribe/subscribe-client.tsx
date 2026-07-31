"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PROVIDER_PLANS, type ProviderPlanId } from "@/lib/provider-plans";
import { ManageSubscriptionButton } from "@/components/payments/manage-subscription-button";

export function SubscribeClient({
  planId,
  status,
  cancelled,
  stripeConfigured,
}: {
  planId: ProviderPlanId;
  status: string;
  cancelled: boolean;
  stripeConfigured: boolean;
}) {
  const plan = PROVIDER_PLANS[planId] ?? PROVIDER_PLANS.starter;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          returnPath: "/provider/subscribe?subscription=success",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Could not start checkout");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-12 font-[family-name:var(--font-poppins)]">
      <p className="text-sm font-medium text-[var(--mvp-blue)]">Billing</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Subscription required</h1>
      <p className="mt-2 text-sm text-grey">
        Activate your provider plan to unlock the dashboard, bookings, and
        messaging.
      </p>

      {cancelled ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout was cancelled. You can try again when you are ready.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 rounded-xl border-2 border-[var(--mvp-blue)] bg-[var(--mvp-blue)]/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">{plan.name}</p>
            <p className="mt-1 text-sm text-grey">{plan.description}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-grey">
              Status: {status}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ink">{plan.priceLabel}</p>
            <p className="text-xs text-grey">{plan.period}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-ink">
              <Check className="h-4 w-4 shrink-0 text-[var(--mvp-blue)]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-3">
        {stripeConfigured ? (
          <button
            type="button"
            disabled={loading}
            onClick={startCheckout}
            className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Opening Stripe..." : "Continue to payment"}
          </button>
        ) : (
          <p className="rounded-lg border border-border-2 bg-[#f7f8fa] px-4 py-3 text-sm text-grey">
            Stripe is not configured in this environment. Ask a super admin to
            mark your subscription active, or set Stripe keys to enable checkout.
          </p>
        )}
        <ManageSubscriptionButton
          variant="link"
          label="Already subscribed? Open Subscription Management"
          className="w-full text-center"
        />
      </div>
    </div>
  );
}
