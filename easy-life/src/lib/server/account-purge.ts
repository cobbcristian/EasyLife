import { prisma } from "@/lib/server/prisma";
import { getStripe, isStripeConfigured } from "@/lib/server/stripe";

/**
 * Email-keyed rows that survive `User` delete and re-bind if the same email
 * registers again (saved cards, Stripe customer, RFID, rewards, native push).
 * Must run inside account deletion — async orphan crons are not enough.
 */
export async function purgeEmailBoundAccountData(email: string): Promise<void> {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) return;

  const profiles = await prisma.memberProfileExt.findMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
    select: { userEmail: true, stripeCustomerId: true },
  });

  if (isStripeConfigured()) {
    const stripe = getStripe();
    if (stripe) {
      for (const profile of profiles) {
        if (!profile.stripeCustomerId) continue;
        try {
          await stripe.customers.del(profile.stripeCustomerId);
        } catch {
          // Customer may already be gone in Stripe.
        }
      }
    }
  }

  await prisma.storedPaymentMethod.deleteMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
  });
  await prisma.memberProfileExt.deleteMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
  });
  await prisma.expoPushToken.deleteMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
  });
  await prisma.rewardTransaction.deleteMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
  });
  await prisma.rewardAccount.deleteMany({
    where: { userEmail: { equals: emailLower, mode: "insensitive" } },
  });
}
