import { prisma } from "@/lib/server/prisma";

export const CROSS_CLUB_MESSAGE =
  "You can only message people in your own club.";

export class ChatCommunityScopeError extends Error {
  readonly status = 403;

  constructor(message: string = CROSS_CLUB_MESSAGE) {
    super(message);
    this.name = "ChatCommunityScopeError";
  }
}

/**
 * True when the email is a user, club staff contact, or provider
 * (dining / vendor / local pro) for this community.
 */
export async function emailBelongsToCommunity(
  email: string,
  communityId: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { communityId: true },
  });
  if (user?.communityId === communityId) return true;

  // Exact match (seeds store lowercase). Avoid Prisma `mode: "insensitive"`
  // — unsupported on SQLite used in local/dev.
  const [staff, provider] = await Promise.all([
    prisma.clubStaff.findFirst({
      where: { communityId, active: true, email: normalized },
      select: { id: true },
    }),
    prisma.provider.findFirst({
      where: { communityId, email: normalized },
      select: { id: true },
    }),
  ]);

  return Boolean(staff || provider);
}

/** Throws ChatCommunityScopeError if any email is outside the club. */
export async function assertEmailsBelongToCommunity(
  emails: string[],
  communityId: string,
): Promise<void> {
  const unique = [
    ...new Set(
      emails
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  for (const email of unique) {
    if (!(await emailBelongsToCommunity(email, communityId))) {
      throw new ChatCommunityScopeError();
    }
  }
}
