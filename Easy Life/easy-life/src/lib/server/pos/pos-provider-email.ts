/**
 * Reject POS sync providerEmail overrides that are not this club's dining provider.
 * Client-supplied emails were previously trusted and wrote MenuItem rows cross-tenant.
 */
export function allowPosProviderEmailOverride(
  resolvedForCommunity: string,
  requested: string | null | undefined,
): { ok: true; email: string } | { ok: false; error: string } {
  const want = requested?.trim().toLowerCase();
  if (!want) return { ok: true, email: resolvedForCommunity };
  if (want !== resolvedForCommunity.toLowerCase()) {
    return {
      ok: false,
      error: "providerEmail must belong to this community's dining provider",
    };
  }
  return { ok: true, email: resolvedForCommunity };
}
