import { PROVIDER_PLANS, type ProviderPlanId } from "@/lib/provider-plans";
import { prisma } from "@/lib/server/prisma";
import { getStripe, isStripeConfigured } from "@/lib/server/stripe";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type ProviderSubscriptionRow = {
  id: string;
  userEmail: string;
  businessName: string;
  planId: ProviderPlanId;
  planName: string;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
  createdAt: string;
};

function toStatus(raw: string): SubscriptionStatus {
  switch (raw) {
    case "pending":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
      return raw;
    case "trialing":
      return "active";
    case "unpaid":
      return "past_due";
    case "incomplete_expired":
    case "cancelled":
      return "canceled";
    default:
      return "pending";
  }
}

function mapRow(row: {
  id: string;
  userEmail: string;
  businessName: string;
  planId: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
  createdAt: Date;
}): ProviderSubscriptionRow {
  const planId = (row.planId in PROVIDER_PLANS
    ? row.planId
    : "starter") as ProviderPlanId;
  return {
    id: row.id,
    userEmail: row.userEmail,
    businessName: row.businessName,
    planId,
    planName: PROVIDER_PLANS[planId].name,
    status: toStatus(row.status),
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertProviderSubscription(input: {
  userEmail: string;
  businessName?: string;
  planId?: ProviderPlanId;
  status?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<ProviderSubscriptionRow> {
  const email = input.userEmail.trim().toLowerCase();
  const row = await prisma.providerSubscription.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      businessName: input.businessName?.trim() || "",
      planId: input.planId ?? "starter",
      status: input.status ?? "pending",
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    },
    update: {
      ...(input.businessName !== undefined
        ? { businessName: input.businessName.trim() }
        : {}),
      ...(input.planId !== undefined ? { planId: input.planId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.stripeCustomerId !== undefined
        ? { stripeCustomerId: input.stripeCustomerId }
        : {}),
      ...(input.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: input.stripeSubscriptionId }
        : {}),
      ...(input.currentPeriodEnd !== undefined
        ? { currentPeriodEnd: input.currentPeriodEnd }
        : {}),
      ...(input.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
        : {}),
    },
  });
  return mapRow(row);
}

export async function getProviderSubscription(
  userEmail: string,
): Promise<ProviderSubscriptionRow | null> {
  const row = await prisma.providerSubscription.findUnique({
    where: { userEmail: userEmail.trim().toLowerCase() },
  });
  return row ? mapRow(row) : null;
}

export async function listProviderSubscriptions(): Promise<
  ProviderSubscriptionRow[]
> {
  const rows = await prisma.providerSubscription.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapRow);
}

export function isSubscriptionAccessGranted(
  status: SubscriptionStatus | null | undefined,
): boolean {
  if (!isStripeConfigured()) return true;
  if (!status) return false;
  return status === "active" || status === "past_due";
}

export async function syncProviderSubscriptionFromStripe(
  userEmail: string,
): Promise<ProviderSubscriptionRow | null> {
  const email = userEmail.trim().toLowerCase();
  const existing = await getProviderSubscription(email);
  if (!isStripeConfigured()) {
    if (!existing) return null;
    return upsertProviderSubscription({
      userEmail: email,
      status: "active",
      businessName: existing.businessName,
      planId: existing.planId,
    });
  }

  const stripe = getStripe();
  if (!stripe) return existing;

  const customerId = existing?.stripeCustomerId;
  type StripeCustomer = {
    id: string;
    deleted?: boolean;
  };

  let customer: StripeCustomer | null = null;
  if (customerId != null) {
    const retrieved = await stripe.customers.retrieve(customerId).catch(() => null);
    if (retrieved && !("deleted" in retrieved && retrieved.deleted)) {
      customer = { id: retrieved.id };
    }
  }

  if (!customer) {
    const found = await stripe.customers.list({ email, limit: 1 });
    const first = found.data[0];
    customer = first ? { id: first.id } : null;
  }

  if (!customer) {
    return (
      existing ??
      (await upsertProviderSubscription({
        userEmail: email,
        status: "pending",
      }))
    );
  }

  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 5,
  });
  const sub =
    subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
    subs.data.find((s) => s.status === "past_due") ??
    subs.data[0];

  if (!sub) {
    return upsertProviderSubscription({
      userEmail: email,
      businessName: existing?.businessName,
      planId: existing?.planId,
      status: "pending",
      stripeCustomerId: customer.id,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  const planFromMeta = sub.metadata?.plan;
  const planId =
    planFromMeta && planFromMeta in PROVIDER_PLANS
      ? (planFromMeta as ProviderPlanId)
      : (existing?.planId ?? "starter");

  const periodEndUnix = (() => {
    const raw = sub as unknown as { current_period_end?: number };
    return typeof raw.current_period_end === "number" ? raw.current_period_end : null;
  })();

  return upsertProviderSubscription({
    userEmail: email,
    businessName: existing?.businessName,
    planId,
    status: toStatus(sub.status),
    stripeCustomerId: customer.id,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  });
}

export async function setProviderSubscriptionStatus(input: {
  userEmail: string;
  status: SubscriptionStatus;
}): Promise<ProviderSubscriptionRow | null> {
  const existing = await getProviderSubscription(input.userEmail);
  if (!existing) return null;
  return upsertProviderSubscription({
    userEmail: input.userEmail,
    status: input.status,
    businessName: existing.businessName,
    planId: existing.planId,
  });
}

export async function ensureSeedProviderSubscriptions(): Promise<void> {
  const count = await prisma.providerSubscription.count();
  if (count > 0) return;
  // Seed from real provider users — never plant Cassie into an empty multi-club DB.
  const providers = await prisma.user.findMany({
    where: { role: "provider" },
    select: { email: true, name: true },
    take: 50,
  });
  for (const provider of providers) {
    await upsertProviderSubscription({
      userEmail: provider.email,
      businessName: provider.name?.trim() || "Provider",
      planId: "starter",
      status: "active",
    });
  }
}
