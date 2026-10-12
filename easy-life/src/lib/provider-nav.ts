/**
 * Provider portal nav capabilities — Clinics / Activities are for club
 * instructors, not Local Pros (lawn, pool, cleaning, etc.).
 */

export type ProviderNavProfile = {
  listingKind?: string | null;
  category?: string | null;
  type?: string | null;
  email?: string | null;
};

const HOME_SERVICE_CATEGORY =
  /lawn|landscap|garden|pool|hvac|clean|plumb|electric|paint|pest|handyman|irrigat|roof|maintenance/;

const HOME_SERVICE_EMAIL =
  /(^|\.)lawn@|cypress\.lawn@|@ironcrest\.services$|pool@|hvac@|clean@|pest@/i;

function isHomeServiceProvider(input: ProviderNavProfile): boolean {
  const kind = (input.listingKind ?? "").toLowerCase();
  if (kind === "local_pro") return true;

  const category = (input.category ?? "").toLowerCase();
  if (HOME_SERVICE_CATEGORY.test(category)) return true;

  const email = (input.email ?? "").toLowerCase();
  if (HOME_SERVICE_EMAIL.test(email)) return true;

  return false;
}

/** Group clinic invites (tennis / golf / bocce style). */
export function providerShowsGroupClinics(input: ProviderNavProfile): boolean {
  if (isHomeServiceProvider(input)) return false;
  const type = (input.type ?? "").toLowerCase();
  if (type === "activity") return true;
  const category = (input.category ?? "").toLowerCase();
  return /golf|tennis|pickle|fitness|yoga|swim|instruct|coach|spa|clinic|bocce/.test(
    category,
  );
}

/** Club activity offerings catalog — not used by Local Pros. */
export function providerShowsActivities(input: ProviderNavProfile): boolean {
  if (isHomeServiceProvider(input)) return false;
  const type = (input.type ?? "").toLowerCase();
  if (type === "activity") return true;
  const category = (input.category ?? "").toLowerCase();
  return /golf|tennis|pickle|fitness|yoga|swim|instruct|coach|spa|activity/.test(
    category,
  );
}
