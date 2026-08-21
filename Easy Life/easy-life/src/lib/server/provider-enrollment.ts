import { brandAssets, imageForProviderCategory } from "@/lib/brand-assets";
import { communityIsResidentialHoa } from "@/lib/community-features";
import type { ProviderPlanId } from "@/lib/provider-plans";
import { hashPassword } from "@/lib/server/password";
import { prisma } from "@/lib/server/prisma";
import { createPromotion } from "@/lib/server/records";
import { upsertProviderSubscription } from "@/lib/server/provider-subscriptions";
import type { AuthUser } from "@/lib/types";
import { upsertMembership } from "@/lib/server/memberships";
import { recordProviderActivation } from "@/lib/server/commissions";

function titleCaseCategory(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return "Other";
  return cleaned
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Self-serve provider signup: User login + directory Provider + optional
 * Featured/Sponsored home placement (instant go-live).
 */
export async function registerServiceProvider(input: {
  email: string;
  password: string;
  businessName: string;
  communityId: string;
  phone?: string;
  category?: string;
  type?: "service" | "activity";
  contactName?: string;
  address?: string;
  description?: string;
  planId?: ProviderPlanId;
  /** Place on member home Featured / Sponsored row. Default true. */
  featured?: boolean;
}): Promise<
  | (AuthUser & { providerId: string })
  | { error: string }
> {
  const email = input.email.trim().toLowerCase();
  const businessName = input.businessName.trim();
  const communityId = input.communityId.trim();
  if (!email || !businessName || !communityId || !input.password) {
    return { error: "Business name, email, password, and community are required" };
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, name: true },
  });
  if (!community) {
    return { error: "Community not found" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const residential = communityIsResidentialHoa(communityId);
  const type: "service" | "activity" =
    input.type === "activity" ? "activity" : "service";
  const listingKind = residential || type === "service" ? "local_pro" : "club";
  const category = titleCaseCategory(input.category ?? "Other");
  const contactName = input.contactName?.trim() || businessName;
  const phone = input.phone?.trim() || null;
  const description =
    input.description?.trim() ||
    (input.address?.trim()
      ? `Serving ${community.name}. ${input.address.trim()}`
      : `Serving ${community.name} residents.`);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(input.password),
      role: "provider",
      name: contactName,
      communityId,
      status: "active",
    },
  });

  await upsertMembership({
    userId: user.id,
    communityId,
    role: "provider",
    status: "active",
    isPrimary: true,
  });

  void recordProviderActivation({
    communityId,
    userId: user.id,
  }).catch(() => {});

  const provider = await prisma.provider.create({
    data: {
      communityId,
      name: businessName,
      category,
      type,
      email,
      phone,
      listingKind,
      description,
      status: "active",
      imageUrl: imageForProviderCategory(category, undefined, businessName),
    },
  });

  await prisma.community.update({
    where: { id: communityId },
    data:
      type === "service"
        ? { serviceCount: { increment: 1 } }
        : { activityCount: { increment: 1 } },
  });

  await upsertProviderSubscription({
    userEmail: email,
    businessName,
    planId: input.planId ?? "starter",
    // Instant go-live for self-serve — payment can upgrade later.
    status: "active",
  });

  // Draft Featured row only — unpaid (paidCents=0) until Stripe settles.
  // listPaidFeaturedTiles filters paidCents > 0, so this stays off member home.
  const wantFeatured = input.featured !== false;
  if (wantFeatured) {
    const existingFeatured = await prisma.promotion.findFirst({
      where: {
        providerEmail: email,
        communityId,
        type: "featured",
        status: "active",
      },
    });
    if (!existingFeatured) {
      await createPromotion({
        providerEmail: email,
        communityId,
        title: businessName,
        type: "featured",
        detail: description,
        status: "active",
        subtitle: category,
        rating: "New",
        priceLabel: "Sponsored",
        imageUrl:
          provider.imageUrl ||
          imageForProviderCategory(category) ||
          brandAssets.serviceCleaningSupplies,
        href: `/member/local-pros?highlight=${provider.id}`,
        paidCents: 0,
      });
    }
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: "provider",
    name: user.name,
    communityId: user.communityId,
    status: "active",
    providerId: provider.id,
  };
}
