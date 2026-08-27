import { prisma } from "@/lib/server/prisma";
import { createMemberCharge, ensureRecordsSeeded } from "@/lib/server/records";

export async function listCampaigns(communityId: string, activeOnly = false) {
  await ensureRecordsSeeded();
  return prisma.fundraisingCampaign.findMany({
    where: {
      communityId,
      ...(activeOnly ? { status: "active" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCampaign(input: {
  communityId: string;
  title: string;
  description?: string;
  goalAmount: number;
  eventDate?: string;
  status?: string;
  imageUrl?: string;
}) {
  return prisma.fundraisingCampaign.create({
    data: {
      communityId: input.communityId,
      title: input.title,
      description: input.description ?? "",
      goalAmount: input.goalAmount,
      eventDate: input.eventDate,
      status: input.status ?? "draft",
      imageUrl: input.imageUrl,
    },
  });
}

/** Clamp and validate a donation amount. Returns null if invalid. */
export function normalizeDonationAmount(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // Cap prevents accidental / malicious mega-pledges on member accounts.
  if (amount > 50_000) return null;
  return Math.round(amount * 100) / 100;
}

/**
 * Record a donation against a campaign in the caller's club.
 * Posts a member charge so raised totals cannot be inflated without billing.
 */
export async function recordDonation(input: {
  communityId: string;
  campaignId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}) {
  const amount = normalizeDonationAmount(input.amount);
  if (amount == null) {
    throw new Error("Invalid donation amount");
  }

  const campaign = await prisma.fundraisingCampaign.findFirst({
    where: {
      id: input.campaignId,
      communityId: input.communityId,
      status: "active",
    },
  });
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const charge = await createMemberCharge({
    communityId: input.communityId,
    memberEmail: input.donorEmail.toLowerCase(),
    memberName: input.donorName,
    category: "fundraising",
    description: `Donation — ${campaign.title}`,
    amount,
    status: "due",
    referenceType: "fundraising_donation",
    referenceId: campaign.id,
  });

  const donation = await prisma.fundraisingDonation.create({
    data: {
      campaignId: campaign.id,
      donorName: input.donorName,
      donorEmail: input.donorEmail.toLowerCase(),
      amount,
      message: input.message ?? "",
      anonymous: input.anonymous ?? false,
      chargeId: charge.id,
    },
  });

  const total = await prisma.fundraisingDonation.aggregate({
    where: { campaignId: campaign.id },
    _sum: { amount: true },
  });

  await prisma.fundraisingCampaign.update({
    where: { id: campaign.id },
    data: { raisedAmount: total._sum.amount ?? 0 },
  });

  return { donation, chargeId: charge.id };
}

export async function getCampaignWithDonations(
  campaignId: string,
  communityId: string,
) {
  const campaign = await prisma.fundraisingCampaign.findFirst({
    where: { id: campaignId, communityId },
    include: {
      donations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  return campaign;
}
