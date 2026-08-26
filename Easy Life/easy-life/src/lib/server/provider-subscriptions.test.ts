import { describe, expect, it } from "vitest";
import {
  initialProviderSubscriptionStatus,
  providerSubscriptionFromCheckoutSession,
} from "@/lib/server/provider-subscriptions";

describe("initialProviderSubscriptionStatus", () => {
  it("stays pending when Stripe billing is configured", () => {
    expect(initialProviderSubscriptionStatus(true)).toBe("pending");
  });

  it("allows instant go-live when Stripe is off (demo)", () => {
    expect(initialProviderSubscriptionStatus(false)).toBe("active");
  });
});

describe("providerSubscriptionFromCheckoutSession", () => {
  it("activates from a paid subscription Checkout session", () => {
    const result = providerSubscriptionFromCheckoutSession({
      mode: "subscription",
      payment_status: "paid",
      metadata: { userEmail: "Pro@Club.com", plan: "starter" },
      customer: "cus_123",
      subscription: "sub_456",
    });
    expect(result).toEqual({
      userEmail: "pro@club.com",
      planId: "starter",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
    });
  });

  it("ignores payment Checkout and unpaid sessions", () => {
    expect(
      providerSubscriptionFromCheckoutSession({
        mode: "payment",
        payment_status: "paid",
        metadata: { userEmail: "pro@club.com" },
      }),
    ).toBeNull();
    expect(
      providerSubscriptionFromCheckoutSession({
        mode: "subscription",
        payment_status: "unpaid",
        metadata: { userEmail: "pro@club.com" },
      }),
    ).toBeNull();
    expect(
      providerSubscriptionFromCheckoutSession({
        mode: "subscription",
        payment_status: "paid",
        metadata: {},
      }),
    ).toBeNull();
  });
});
