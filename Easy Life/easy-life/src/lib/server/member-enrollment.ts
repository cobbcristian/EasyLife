import { communityIsResidentialHoa } from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import type { AuthUser } from "@/lib/types";

export type EnrollmentStatus = "active" | "pending" | "frozen";

/**
 * Residential HOA communities (Oceanside): self-register → pending →
 * staff approve → directoryVisible. Clubs keep immediate-active join.
 */
export function communityRequiresEnrollmentApproval(
  communityId: string | null | undefined,
): boolean {
  return communityIsResidentialHoa(communityId);
}

export async function createPendingResident(input: {
  email: string;
  password: string;
  name: string;
  communityId: string;
  unit: string;
  /** Preference applied after approval; pending accounts stay out of the directory. */
  directoryVisible?: boolean;
}): Promise<AuthUser | { error: string }> {
  const unit = input.unit.trim();
  if (!unit) return { error: "Unit number is required" };

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const directoryVisible = Boolean(input.directoryVisible);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(input.password),
      role: "member",
      name: input.name.trim(),
      communityId: input.communityId,
      status: "pending",
    },
  });

  await prisma.memberProfileExt.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      unit,
      membershipTier: communityIsResidentialHoa(input.communityId)
        ? "hoa"
        : "social",
      residencyStatus: "resident",
      paysHoa: true,
      directoryVisible,
    },
    update: {
      unit,
      residencyStatus: "resident",
      paysHoa: true,
      directoryVisible,
    },
  });

  const alreadyMember = await prisma.communityMember.findFirst({
    where: { communityId: input.communityId, name: user.name },
  });
  if (!alreadyMember) {
    await prisma.communityMember.create({
      data: {
        communityId: input.communityId,
        name: user.name,
        role: "Resident",
        isManagement: false,
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: "member",
    name: user.name,
    communityId: user.communityId,
    status: "pending",
  };
}

export async function approvePendingMember(opts: {
  userId: string;
  communityId?: string | null;
}): Promise<
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string;
        communityId: string | null;
        status: EnrollmentStatus;
        unit: string | null;
      };
    }
  | { ok: false; error: string; status: number }
> {
  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  if (!user) return { ok: false, error: "Not found", status: 404 };
  if (opts.communityId && user.communityId !== opts.communityId) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  if (user.role !== "member") {
    return { ok: false, error: "Only resident members can be approved this way", status: 400 };
  }
  if (user.status === "frozen") {
    return { ok: false, error: "Unfreeze the account before approving", status: 400 };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { status: "active" },
  });

  const existingProfile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: user.email },
  });
  const directoryVisible = existingProfile?.directoryVisible ?? true;

  const hoaTier = communityIsResidentialHoa(user.communityId)
    ? "hoa"
    : "social";

  const profile = await prisma.memberProfileExt.upsert({
    where: { userEmail: user.email },
    create: {
      userEmail: user.email,
      residencyStatus: "resident",
      paysHoa: true,
      directoryVisible,
      membershipTier: hoaTier,
    },
    update: {
      residencyStatus: "resident",
      paysHoa: true,
      membershipTier: hoaTier,
      // Keep the preference they chose at signup.
      directoryVisible,
    },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      communityId: user.communityId,
      status: "active",
      unit: profile.unit,
    },
  };
}

export async function listPendingMembers(communityId: string) {
  const users = await prisma.user.findMany({
    where: {
      communityId,
      role: "member",
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });
  const emails = users.map((u) => u.email);
  const profiles = await prisma.memberProfileExt.findMany({
    where: { userEmail: { in: emails } },
  });
  const byEmail = new Map(profiles.map((p) => [p.userEmail, p]));
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    unit: byEmail.get(u.email)?.unit ?? null,
    createdAt: u.createdAt.toISOString(),
    status: "pending" as const,
  }));
}
