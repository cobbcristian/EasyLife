import { diningProviderEmail } from "@/lib/server/dining";

/**
 * POS menu sync must only target a dining provider that belongs to the
 * caller's club. Client-supplied emails are otherwise a cross-tenant wipe.
 */
export function isPosProviderEmailAllowedForCommunity(
  communityId: string,
  providerEmail: string,
  communityProviderEmails: ReadonlyArray<string | null | undefined> = [],
): boolean {
  const target = providerEmail.trim().toLowerCase();
  if (!target || !target.includes("@")) return false;

  const allowed = new Set<string>();
  const clubDining = diningProviderEmail(communityId).trim().toLowerCase();
  if (clubDining) allowed.add(clubDining);

  for (const email of communityProviderEmails) {
    const normalized = email?.trim().toLowerCase();
    if (normalized) allowed.add(normalized);
  }

  return allowed.has(target);
}
