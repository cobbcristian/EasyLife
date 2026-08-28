import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { chargeStoredPaymentMethod } from "@/lib/server/payment-methods";
import { settleMemberChargePaid } from "@/lib/server/settle-charge";
import { isStripeConfigured } from "@/lib/server/stripe";

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

/** Process autopay for members whose billing day matches today. */
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

    const dueCharges = await prisma.memberCharge.findMany({
      where: {
        memberEmail: profile.userEmail,
        status: "due",
      },
    });
    const totalDue = dueCharges.reduce((sum, c) => sum + c.amount, 0);
    if (totalDue <= 0) continue;

    try {
      await chargeStoredPaymentMethod({
        userEmail: profile.userEmail,
        amount: totalDue,
        description: `Auto-pay statement — ${today.toISOString().slice(0, 10)}`,
      });
      for (const charge of dueCharges) {
        await settleMemberChargePaid(charge.id);
      }
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, failed };
}
