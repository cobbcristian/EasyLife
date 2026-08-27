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
 * Start a donation: creates a due MemberCharge + donation row.
 * raisedAmount is NOT updated until the charge is marked paid.
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
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
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

  const donorEmail = input.donorEmail.toLowerCase();
  const charge = await prisma.memberCharge.create({
    data: {
      communityId: input.communityId,
      memberEmail: donorEmail,
      memberName: input.donorName,
      category: "fundraising",
      description: `Donation — ${campaign.title}`,
      amount: input.amount,
      status: "due",
      referenceType: "fundraising_donation",
      referenceId: campaign.id,
    },
  });

  const donation = await prisma.fundraisingDonation.create({
    data: {
      campaignId: input.campaignId,
      donorName: input.donorName,
      donorEmail,
      amount: input.amount,
      message: input.message ?? "",
      anonymous: input.anonymous ?? false,
      chargeId: charge.id,
    },
  });

  return { donation, charge, campaign };
}

/** Recompute raisedAmount from donations whose linked charge is paid. */
export async function refreshCampaignRaisedAmount(campaignId: string) {
  const donations = await prisma.fundraisingDonation.findMany({
    where: { campaignId },
    select: { amount: true, chargeId: true },
  });
  const chargeIds = donations
    .map((d) => d.chargeId)
    .filter((id): id is string => Boolean(id));
  const paidCharges = chargeIds.length
    ? await prisma.memberCharge.findMany({
        where: { id: { in: chargeIds }, status: "paid" },
        select: { id: true },
      })
    : [];
  const paidIds = new Set(paidCharges.map((c) => c.id));
  const raised = donations.reduce(
    (sum, d) => (d.chargeId && paidIds.has(d.chargeId) ? sum + d.amount : sum),
    0,
  );
  await prisma.fundraisingCampaign.update({
    where: { id: campaignId },
    data: { raisedAmount: raised },
  });
  return raised;
}

/** After a MemberCharge is paid, apply it to the campaign total. */
export async function applyFundraisingDonationPaid(chargeId: string) {
  const donation = await prisma.fundraisingDonation.findFirst({
    where: { chargeId },
  });
  if (!donation) return null;
  await refreshCampaignRaisedAmount(donation.campaignId);
  return donation;
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
