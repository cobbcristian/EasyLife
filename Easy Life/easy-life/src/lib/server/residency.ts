import { prisma } from "@/lib/server/prisma";

export function memberPaysHoa(profile: {
  residencyStatus?: string | null;
  paysHoa?: boolean | null;
}): boolean {
  if (profile.residencyStatus === "non_resident") return false;
  if (profile.residencyStatus === "resident") return profile.paysHoa !== false;
  return Boolean(profile.paysHoa);
}

export async function getMemberResidency(email: string) {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email.toLowerCase() },
    select: { residencyStatus: true, paysHoa: true, unit: true, membershipTier: true },
  });
  const residencyStatus = profile?.residencyStatus === "resident" ? "resident" : "non_resident";
  return {
    residencyStatus,
    paysHoa: memberPaysHoa({
      residencyStatus,
      paysHoa: profile?.paysHoa,
    }),
    unit: profile?.unit ?? null,
    membershipTier: profile?.membershipTier ?? "social",
  };
}

/** Create an HOA / dues charge only for on-property residents who pay HOA. */
export async function createHoaChargeIfEligible(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  description: string;
  amount: number;
  dueDate?: string;
}) {
  const residency = await getMemberResidency(input.memberEmail);
  if (!residency.paysHoa) {
    return { created: false as const, reason: "Member does not pay HOA (non-resident or opted out)." };
  }
  const charge = await prisma.memberCharge.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      category: "hoa",
      description: input.description,
      amount: input.amount,
      status: "due",
      dueDate: input.dueDate ?? new Date().toISOString().slice(0, 10),
      referenceType: "hoa_dues",
    },
  });
  return { created: true as const, charge };
}

export async function listClubStaff(communityId: string) {
  return prisma.clubStaff.findMany({
    where: { communityId, active: true },
    orderBy: [{ sortOrder: "asc" }, { department: "asc" }, { name: "asc" }],
  });
}

export async function ensureClubStaffSeeded(communityId: string) {
  // Club-scoped demo emails — never plant @easylife.com into a tenant directory.
  const domain = `${communityId.replace(/-/g, "")}.demo`;

  // Repair leftover Easy Life staff emails from older seeds (e.g. Front Desk on IronCrest).
  const leaked = await prisma.clubStaff.findMany({
    where: { communityId, email: { endsWith: "@easylife.com" } },
  });
  for (const row of leaked) {
    const local = (row.email ?? "staff").split("@")[0]?.trim() || "staff";
    await prisma.clubStaff.update({
      where: { id: row.id },
      data: { email: `${local}@${domain}` },
    });
  }

  const count = await prisma.clubStaff.count({ where: { communityId } });
  if (count > 0) return;

  await prisma.clubStaff.createMany({
    data: [
      {
        communityId,
        name: "Maria Santos",
        title: "General Manager",
        department: "Club Management",
        email: `gm@${domain}`,
        phone: "(352) 555-0100",
        category: "management",
        sortOrder: 1,
      },
      {
        communityId,
        name: "Chris Nolan",
        title: "Membership Director",
        department: "Membership",
        email: `membership@${domain}`,
        phone: "(352) 555-0101",
        category: "management",
        sortOrder: 2,
      },
      {
        communityId,
        name: "Alex Rivera",
        title: "Head Tennis Professional",
        department: "Tennis",
        email: `tennis.pro@${domain}`,
        phone: "(352) 555-0110",
        category: "tennis_pro",
        sortOrder: 10,
      },
      {
        communityId,
        name: "Jordan Blake",
        title: "Head Golf Professional",
        department: "Golf",
        email: `golf.pro@${domain}`,
        phone: "(352) 555-0120",
        category: "golf_pro",
        sortOrder: 11,
      },
      {
        communityId,
        name: "Priya Desai",
        title: "Spa Director",
        department: "Spa & Wellness",
        email: `spa@${domain}`,
        phone: "(352) 555-0130",
        category: "spa",
        sortOrder: 20,
      },
      {
        communityId,
        name: "Louis Chen",
        title: "Executive Chef",
        department: "Dining",
        email: `dining@${domain}`,
        phone: "(352) 555-0140",
        category: "dining",
        sortOrder: 30,
      },
      {
        communityId,
        name: "Front Desk",
        title: "Member Services",
        department: "Front Desk",
        email: `frontdesk@${domain}`,
        phone: "(352) 555-0100",
        extension: "0",
        category: "front_desk",
        sortOrder: 40,
      },
    ],
  });
}
