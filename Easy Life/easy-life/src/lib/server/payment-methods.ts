import { prisma } from "@/lib/server/prisma";
import { getStripe, isStripeConfigured } from "@/lib/server/stripe";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";

export type PaymentPreference = "always_prompt" | "store";

export interface PaymentMethodDTO {
  id: string;
  label: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface PaymentSettingsDTO {
  preference: PaymentPreference;
  methods: PaymentMethodDTO[];
  stripeEnabled: boolean;
  demoPaymentsAllowed: boolean;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function brandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
  };
  return map[brand.toLowerCase()] ?? brand;
}

function toDto(row: {
  id: string;
  label: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}): PaymentMethodDTO {
  return {
    id: row.id,
    label: row.label,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.expMonth,
    expYear: row.expYear,
    isDefault: row.isDefault,
  };
}

async function ensureProfileExt(userEmail: string) {
  const key = normalizeEmail(userEmail);
  return prisma.memberProfileExt.upsert({
    where: { userEmail: key },
    create: { userEmail: key },
    update: {},
  });
}

export async function getPaymentSettings(userEmail: string): Promise<PaymentSettingsDTO> {
  await ensureRecordsSeeded();
  const key = normalizeEmail(userEmail);
  const ext = await ensureProfileExt(key);
  const methods = await prisma.storedPaymentMethod.findMany({
    where: { userEmail: key },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const preference =
    ext.paymentPreference === "store" ? "store" : "always_prompt";
  return {
    preference,
    methods: methods.map(toDto),
    stripeEnabled: isStripeConfigured(),
    demoPaymentsAllowed: isDemoPaymentAllowed(),
  };
}

export async function updatePaymentPreference(
  userEmail: string,
  preference: PaymentPreference,
): Promise<PaymentSettingsDTO> {
  const key = normalizeEmail(userEmail);
  await ensureProfileExt(key);
  await prisma.memberProfileExt.update({
    where: { userEmail: key },
    data: { paymentPreference: preference },
  });
  return getPaymentSettings(userEmail);
}

export async function ensureStripeCustomer(
  userEmail: string,
  name?: string,
): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  const stripe = getStripe();
  if (!stripe) return null;

  const key = normalizeEmail(userEmail);
  const ext = await ensureProfileExt(key);
  if (ext.stripeCustomerId) return ext.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: userEmail,
    name: name ?? undefined,
    metadata: { userEmail: key },
  });
  await prisma.memberProfileExt.update({
    where: { userEmail: key },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function syncPaymentMethodsFromStripe(userEmail: string): Promise<PaymentSettingsDTO> {
  const key = normalizeEmail(userEmail);
  const ext = await prisma.memberProfileExt.findUnique({ where: { userEmail: key } });
  if (!ext?.stripeCustomerId || !isStripeConfigured()) {
    return getPaymentSettings(userEmail);
  }

  const stripe = getStripe();
  if (!stripe) return getPaymentSettings(userEmail);

  const listed = await stripe.paymentMethods.list({
    customer: ext.stripeCustomerId,
    type: "card",
  });

  const existing = await prisma.storedPaymentMethod.findMany({ where: { userEmail: key } });
  const byStripeId = new Map(
    existing.filter((m) => m.stripePaymentMethodId).map((m) => [m.stripePaymentMethodId!, m]),
  );

  for (const pm of listed.data) {
    const card = pm.card;
    if (!card) continue;
    const label = `${brandLabel(card.brand)} •••• ${card.last4}`;
    const current = byStripeId.get(pm.id);
    if (current) {
      await prisma.storedPaymentMethod.update({
        where: { id: current.id },
        data: {
          label,
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        },
      });
    } else {
      const hasDefault = existing.some((m) => m.isDefault);
      await prisma.storedPaymentMethod.create({
        data: {
          userEmail: key,
          stripePaymentMethodId: pm.id,
          label,
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          isDefault: !hasDefault && existing.length === 0,
        },
      });
    }
  }

  return getPaymentSettings(userEmail);
}

export async function addDemoPaymentMethod(
  userEmail: string,
  input: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    label?: string;
    setDefault?: boolean;
  },
): Promise<PaymentSettingsDTO> {
  if (!isDemoPaymentAllowed()) {
    throw new Error("Demo payment methods are disabled in production");
  }
  const key = normalizeEmail(userEmail);
  await ensureProfileExt(key);
  const last4 = input.last4.replace(/\D/g, "").slice(-4);
  if (last4.length !== 4) {
    throw new Error("Last four digits required");
  }

  const existing = await prisma.storedPaymentMethod.count({ where: { userEmail: key } });
  const makeDefault = input.setDefault ?? existing === 0;

  if (makeDefault) {
    await prisma.storedPaymentMethod.updateMany({
      where: { userEmail: key },
      data: { isDefault: false },
    });
  }

  const label =
    input.label?.trim() ||
    `${brandLabel(input.brand)} •••• ${last4}`;

  await prisma.storedPaymentMethod.create({
    data: {
      userEmail: key,
      label,
      brand: input.brand.toLowerCase(),
      last4,
      expMonth: input.expMonth,
      expYear: input.expYear,
      isDefault: makeDefault,
    },
  });

  return getPaymentSettings(userEmail);
}

export async function setDefaultPaymentMethod(
  userEmail: string,
  methodId: string,
): Promise<PaymentSettingsDTO> {
  const key = normalizeEmail(userEmail);
  const row = await prisma.storedPaymentMethod.findFirst({
    where: { id: methodId, userEmail: key },
  });
  if (!row) throw new Error("Payment method not found");

  await prisma.$transaction([
    prisma.storedPaymentMethod.updateMany({
      where: { userEmail: key },
      data: { isDefault: false },
    }),
    prisma.storedPaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    }),
  ]);

  return getPaymentSettings(userEmail);
}

export async function deletePaymentMethod(
  userEmail: string,
  methodId: string,
): Promise<PaymentSettingsDTO> {
  const key = normalizeEmail(userEmail);
  const row = await prisma.storedPaymentMethod.findFirst({
    where: { id: methodId, userEmail: key },
  });
  if (!row) throw new Error("Payment method not found");

  if (row.stripePaymentMethodId && isStripeConfigured()) {
    const stripe = getStripe();
    try {
      await stripe?.paymentMethods.detach(row.stripePaymentMethodId);
    } catch {
      // already detached
    }
  }

  await prisma.storedPaymentMethod.delete({ where: { id: methodId } });

  if (row.isDefault) {
    const next = await prisma.storedPaymentMethod.findFirst({
      where: { userEmail: key },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.storedPaymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return getPaymentSettings(userEmail);
}

export async function getDefaultPaymentMethod(userEmail: string) {
  const key = normalizeEmail(userEmail);
  return prisma.storedPaymentMethod.findFirst({
    where: { userEmail: key, isDefault: true },
  });
}

export async function createStripeSetupCheckout(
  userEmail: string,
  name: string,
  returnPath: string,
  origin: string,
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe not configured");

  const customerId = await ensureStripeCustomer(userEmail, name);
  if (!customerId) throw new Error("Could not create customer");

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}${returnPath}?payment_setup=success`,
    cancel_url: `${origin}${returnPath}?payment_setup=cancelled`,
  });
  if (!session.url) throw new Error("Could not start card setup");
  return session.url;
}

export async function chargeStoredPaymentMethod(input: {
  userEmail: string;
  amount: number;
  description: string;
  paymentMethodId?: string;
}): Promise<{ status: "paid" | "action_required"; url?: string }> {
  const key = normalizeEmail(input.userEmail);
  const method =
    input.paymentMethodId != null
      ? await prisma.storedPaymentMethod.findFirst({
          where: { id: input.paymentMethodId, userEmail: key },
        })
      : await getDefaultPaymentMethod(key);

  if (!method) {
    throw new Error("No payment method on file");
  }

  if (!method.stripePaymentMethodId || !isStripeConfigured()) {
    return { status: "paid" };
  }

  const stripe = getStripe();
  if (!stripe) return { status: "paid" };

  const ext = await ensureProfileExt(key);
  const customerId =
    ext.stripeCustomerId ?? (await ensureStripeCustomer(input.userEmail));
  if (!customerId) throw new Error("No Stripe customer");

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(input.amount * 100),
    currency: "usd",
    customer: customerId,
    payment_method: method.stripePaymentMethodId,
    description: input.description,
    confirm: true,
    off_session: false,
    payment_method_types: ["card"],
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/member/payments?payment=success`,
  });

  if (intent.status === "succeeded") {
    return { status: "paid" };
  }
  if (intent.status === "requires_action" && intent.next_action?.redirect_to_url?.url) {
    return { status: "action_required", url: intent.next_action.redirect_to_url.url };
  }
  throw new Error("Payment could not be completed");
}
