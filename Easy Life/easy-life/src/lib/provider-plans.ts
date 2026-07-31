export const PROVIDER_PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "$49",
    period: "/month",
    description: "List your services, accept bookings, and manage your provider dashboard.",
    features: [
      "Provider dashboard & menu",
      "Booking management",
      "Member messaging",
      "Stripe payout setup",
    ],
  },
} as const;

export type ProviderPlanId = keyof typeof PROVIDER_PLANS;
