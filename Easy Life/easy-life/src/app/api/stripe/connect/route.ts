import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getStripe } from "@/lib/server/stripe";

// Stripe Connect onboarding for provider payouts.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payouts are not configured. Add STRIPE_SECRET_KEY to enable Stripe Connect.",
      },
      { status: 503 },
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  try {
    const account = await stripe.accounts.create({ type: "express" });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/provider/account?connect=refresh`,
      return_url: `${origin}/provider/account?connect=done`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch {
    return NextResponse.json(
      { error: "Could not start payout onboarding" },
      { status: 502 },
    );
  }
}
