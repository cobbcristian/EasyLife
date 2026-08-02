/**
 * Per-community product flags (amenities / modules that are not universal).
 */

/** Club restaurant / in-app Dining menus — not all HOAs have this. */
export function communityHasClubDining(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  // Oceanside Residents: amenities + HOA ops only — no clubhouse restaurant.
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Grab & Go coolers / walk-out retail — club amenity, not condo HOA. */
export function communityHasGrabGo(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Local Pros marketplace (outside home-service vendors). */
export function communityHasLocalPros(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** In-app club vendors / pros directory. */
export function communityHasVendors(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Club tournaments / brackets. */
export function communityHasTournaments(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Bike / equipment / club rentals. */
export function communityHasRentals(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Court / clinic guest fee invoices (club policy — not condo HOA). */
export function communityHasGuestFees(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** Food & beverage spending minimum on Payments / membership. */
export function communityHasFbMinimum(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (
    communityId === "oceanside-residents" ||
    communityId === "harbor-pointe" ||
    communityId === "willow-creek" ||
    communityId === "alliant"
  ) {
    return false;
  }
  return true;
}

/**
 * Club dependent / household age-out membership (sponsor address + age-out policy).
 * HOA residential communities typically do not use this.
 */
export function communityHasHouseholdMembership(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/**
 * Club resign / rejoin waiting period — not used for condo / HOA resident communities
 * where owners live on property rather than holding a resignable club membership.
 */
export function communityHasClubResignRejoin(
  communityId: string | null | undefined,
): boolean {
  if (!communityId) return true;
  if (communityId === "oceanside-residents") return false;
  return true;
}

/** True for condo / residential HOA communities (owners live on property). */
export function communityIsResidentialHoa(
  communityId: string | null | undefined,
): boolean {
  return communityId === "oceanside-residents";
}

/**
 * External HOA dues portal (e.g. ClickPay). When set, Easy Life does not collect
 * association assessments in-app — residents pay on the linked portal.
 */
export function communityHoaPaymentPortal(
  communityId: string | null | undefined,
): { label: string; url: string } | null {
  if (communityId === "oceanside-residents") {
    return {
      label: "ClickPay",
      // Resident login / Pay Now — https://www.clickpay.com/
      url: "https://www.clickpay.com/pay",
    };
  }
  return null;
}
