import { prisma } from "@/lib/server/prisma";

export type RefundStatus = "pending" | "approved" | "denied" | "refunded";

export type RefundRequestRow = {
  id: string;
  communityId: string;
  bookingId: string;
  bookingType: string;
  title: string;
  memberEmail: string;
  memberName: string;
  providerEmail: string | null;
  amountCents: number;
  reason: string;
  status: RefundStatus;
  paymentLabel: string;
  dateLabel: string;
  timeLabel: string;
  locationLine1: string;
  locationLine2: string;
  rateLabel: string;
  createdAt: string;
  resolvedAt: string | null;
};

function toStatus(raw: string): RefundStatus {
  switch (raw) {
    case "pending":
    case "approved":
    case "denied":
    case "refunded":
      return raw;
    default:
      return "pending";
  }
}

function mapRow(row: {
  id: string;
  communityId: string;
  bookingId: string;
  bookingType: string;
  title: string;
  memberEmail: string;
  memberName: string;
  providerEmail: string | null;
  amountCents: number;
  reason: string;
  status: string;
  paymentLabel: string;
  dateLabel: string;
  timeLabel: string;
  locationLine1: string;
  locationLine2: string;
  rateLabel: string;
  createdAt: Date;
  resolvedAt: Date | null;
}): RefundRequestRow {
  return {
    id: row.id,
    communityId: row.communityId,
    bookingId: row.bookingId,
    bookingType: row.bookingType,
    title: row.title,
    memberEmail: row.memberEmail,
    memberName: row.memberName,
    providerEmail: row.providerEmail,
    amountCents: row.amountCents,
    reason: row.reason,
    status: toStatus(row.status),
    paymentLabel: row.paymentLabel,
    dateLabel: row.dateLabel,
    timeLabel: row.timeLabel,
    locationLine1: row.locationLine1,
    locationLine2: row.locationLine2,
    rateLabel: row.rateLabel,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export async function createRefundRequest(input: {
  communityId?: string | null;
  bookingId: string;
  bookingType?: string;
  title: string;
  memberEmail: string;
  memberName: string;
  providerEmail?: string | null;
  amountCents: number;
  reason: string;
  paymentLabel?: string;
  dateLabel?: string;
  timeLabel?: string;
  locationLine1?: string;
  locationLine2?: string;
  rateLabel?: string;
}): Promise<RefundRequestRow> {
  const row = await prisma.refundRequest.create({
    data: {
      communityId: input.communityId?.trim() || "__missing_community__",
      bookingId: input.bookingId,
      bookingType: input.bookingType ?? "activity",
      title: input.title.trim(),
      memberEmail: input.memberEmail.trim().toLowerCase(),
      memberName: input.memberName.trim(),
      providerEmail: input.providerEmail?.trim().toLowerCase() ?? null,
      amountCents: input.amountCents,
      reason: input.reason.trim(),
      status: "pending",
      paymentLabel: input.paymentLabel ?? "VISA ··· 7281",
      dateLabel: input.dateLabel ?? "",
      timeLabel: input.timeLabel ?? "",
      locationLine1: input.locationLine1 ?? "",
      locationLine2: input.locationLine2 ?? "",
      rateLabel: input.rateLabel ?? "",
    },
  });
  return mapRow(row);
}

export async function listRefundRequestsForMember(
  memberEmail: string,
): Promise<RefundRequestRow[]> {
  const rows = await prisma.refundRequest.findMany({
    where: { memberEmail: memberEmail.trim().toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function listRefundRequestsForProvider(
  providerEmail: string,
): Promise<RefundRequestRow[]> {
  const rows = await prisma.refundRequest.findMany({
    where: {
      OR: [
        { providerEmail: providerEmail.trim().toLowerCase() },
        { providerEmail: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function getRefundRequestById(
  id: string,
): Promise<RefundRequestRow | null> {
  const row = await prisma.refundRequest.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function resolveRefundRequest(input: {
  id: string;
  status: Exclude<RefundStatus, "pending">;
}): Promise<RefundRequestRow | null> {
  try {
    const row = await prisma.refundRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        resolvedAt: new Date(),
      },
    });
    return mapRow(row);
  } catch {
    return null;
  }
}
