/** Stripe Checkout options shared across routes — enables Apple Pay, Google Pay, Link, cards. */
export const stripeCheckoutPaymentOptions = {
  automatic_payment_methods: { enabled: true as const },
} as const;
