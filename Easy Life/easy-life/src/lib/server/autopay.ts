import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { chargeStoredPaymentMethod } from "@/lib/server/payment-methods";
import { isStripeConfigured } from "@/lib/server/stripe";
import { applyFundraisingDonationPaid } from "@/lib/server/fundraising";

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

export interface AutopaySettings {
  enabled: boolean;
  day: number;
  stripeConfigured: boolean;
}

export async function getAutopaySettings(userEmail: string): Promise<AutopaySettings> {
  await ensureRecordsSeeded();
  const ext = await prisma.memberProfileExt.findUnique({
    where: { userEmail: normalizeEmail(userEmail) },
  });
  return {
    enabled: ext?.autopayEnabled ?? false,
    day: ext?.autopayDay ?? 1,
    stripeConfigured: isStripeConfigured(),
  };
}

export async function updateAutopaySettings(
  userEmail: string,
  enabled: boolean,
  day: number,
): Promise<AutopaySettings> {
  await ensureRecordsSeeded();
  const key = normalizeEmail(userEmail);
  const safeDay = Math.min(28, Math.max(1, day));
  await prisma.memberProfileExt.upsert({
    where: { userEmail: key },
    create: { userEmail: key, autopayEnabled: enabled, autopayDay: safeDay },
    update: { autopayEnabled: enabled, autopayDay: safeDay },
  });
  return getAutopaySettings(key);
}

/**
 * Process autopay for members whose billing day matches today.
 * Only settles charges when Stripe (or demo) payment actually succeeds.
 */
export async function processAutopayDueToday(): Promise<{ processed: number; failed: number }> {
  await ensureRecordsSeeded();
  const today = new Date();
  const day = today.getDate();
  const profiles = await prisma.memberProfileExt.findMany({
    where: { autopayEnabled: true, autopayDay: day },
  });

  let processed = 0;
  let failed = 0;

  for (const profile of profiles) {
    const user = await prisma.user.findUnique({ where: { email: profile.userEmail } });
    if (!user || user.status !== "active") continue;

    // Claim due charges so concurrent cron runs cannot double-charge.
    const dueCharges = await prisma.memberCharge.findMany({
      where: {
        memberEmail: profile.userEmail,
        status: "due",
      },
    });
    if (dueCharges.length === 0) continue;

    const claimIds = dueCharges.map((c) => c.id);
    const claimed = await prisma.memberCharge.updateMany({
      where: { id: { in: claimIds }, status: "due" },
      data: { status: "autopay_pending" },
    });
    if (claimed.count === 0) continue;

    const claimedCharges = await prisma.memberCharge.findMany({
      where: { id: { in: claimIds }, status: "autopay_pending" },
    });
    const totalDue = claimedCharges.reduce((sum, c) => sum + c.amount, 0);
    if (totalDue <= 0) {
      await prisma.memberCharge.updateMany({
        where: { id: { in: claimIds }, status: "autopay_pending" },
        data: { status: "due" },
      });
      continue;
    }

    try {
      const result = await chargeStoredPaymentMethod({
        userEmail: profile.userEmail,
        amount: totalDue,
        description: `Auto-pay statement — ${today.toISOString().slice(0, 10)}`,
      });

      if (result.status !== "paid") {
        // 3DS / action required — release claim; do not mark paid.
        await prisma.memberCharge.updateMany({
          where: { id: { in: claimIds }, status: "autopay_pending" },
          data: { status: "due" },
        });
        failed += 1;
        continue;
      }

      for (const charge of claimedCharges) {
        await prisma.memberCharge.update({
          where: { id: charge.id },
          data: { status: "paid" },
        });
        if (charge.referenceType === "fundraising_donation") {
          await applyFundraisingDonationPaid(charge.id);
        }
      }
      processed += 1;
    } catch {
      await prisma.memberCharge.updateMany({
        where: { id: { in: claimIds }, status: "autopay_pending" },
        data: { status: "due" },
      });
      failed += 1;
    }
  }

  return { processed, failed };
}
