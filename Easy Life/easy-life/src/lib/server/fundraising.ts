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
