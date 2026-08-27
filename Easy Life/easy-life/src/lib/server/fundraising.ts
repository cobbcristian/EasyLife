import { fundraisingCountsTowardRaised } from "@/lib/fundraising-donate-policy";
import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

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

/**
 * Start a donation: create a due MemberCharge only.
 * Do NOT bump raisedAmount until the charge is paid (see confirmFundraisingDonationByCharge).
 */
export async function startFundraisingDonation(input: {
  communityId: string;
  campaignId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}) {
  if (!(input.amount > 0)) {
    throw new Error("Donation amount must be positive");
  }

  const campaign = await prisma.fundraisingCampaign.findFirst({
    where: { id: input.campaignId, communityId: input.communityId },
  });
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  if (campaign.status !== "active") {
    throw new Error("Campaign is not accepting donations");
  }

  const charge = await prisma.memberCharge.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.donorEmail.toLowerCase(),
      memberName: input.donorName,
      category: "fundraising",
      description: `Donation — ${campaign.title}`,
      amount: input.amount,
      status: "due",
      dueDate: new Date().toISOString().slice(0, 10),
      referenceType: "fundraising_donation",
      referenceId: campaign.id,
    },
  });

  return { campaign, charge, message: input.message ?? "", anonymous: input.anonymous ?? false };
}

/** After a fundraising MemberCharge is paid, record the donation and update raised totals. */
export async function confirmFundraisingDonationByCharge(chargeId: string) {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.referenceType !== "fundraising_donation" || !charge.referenceId) {
    return null;
  }
  if (
    !fundraisingCountsTowardRaised({
      chargeStatus: charge.status === "paid" ? "paid" : "due",
    })
  ) {
    return null;
  }

  const existing = await prisma.fundraisingDonation.findFirst({
    where: { chargeId },
  });
  if (existing) return existing;

  return recordDonation({
    campaignId: charge.referenceId,
    donorName: charge.memberName,
    donorEmail: charge.memberEmail ?? undefined,
    amount: charge.amount,
    chargeId: charge.id,
  });
}

export async function recordDonation(input: {
  campaignId: string;
  donorName: string;
  donorEmail?: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
  chargeId?: string;
}) {
  const donation = await prisma.fundraisingDonation.create({
    data: {
      campaignId: input.campaignId,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      amount: input.amount,
      message: input.message ?? "",
      anonymous: input.anonymous ?? false,
      chargeId: input.chargeId,
    },
  });

  const total = await prisma.fundraisingDonation.aggregate({
    where: { campaignId: input.campaignId },
    _sum: { amount: true },
  });

  await prisma.fundraisingCampaign.update({
    where: { id: input.campaignId },
    data: { raisedAmount: total._sum.amount ?? 0 },
  });

  return donation;
}

export async function getCampaignWithDonations(campaignId: string) {
  const campaign = await prisma.fundraisingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      donations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  return campaign;
}
