import {
  IRON_LAKE_COMMUNITY_ID,
  IRON_LAKE_TIER_DEFINITIONS,
  isIronLakeTierSlug,
  type IronLakeTierSlug,
} from "@/lib/iron-lake-tiers";

export type DefaultMembershipTierSlug =
  | "golf"
  | "national"
  | "tennis"
  | "social"
  | "social_tennis"
  | "social_gym"
  | "hoa";

export type MembershipTierSlug = DefaultMembershipTierSlug | IronLakeTierSlug;

export type AmenityAccessKind =
  | "court"
  | "golf_course"
  | "driving_range"
  | "gym"
  | "facility"
  | "dining"
  | "spa"
  | "store";

export type FbPeriodKind = "monthly" | "quarterly" | "semi_annual" | "annual";

export type MembershipTierDefinition = {
  name: string;
  accessKinds: AmenityAccessKind[];
  fbMinimumAmount: number;
  fbMinimumPeriod: FbPeriodKind;
};

/** Full amenity set — condo HOA residents book everything on property. */
export const HOA_RESIDENT_ACCESS_KINDS: AmenityAccessKind[] = [
  "court",
  "golf_course",
  "driving_range",
  "gym",
  "facility",
  "dining",
  "spa",
  "store",
];

export const MEMBERSHIP_TIER_DEFINITIONS: Record<
  DefaultMembershipTierSlug,
  MembershipTierDefinition
> = {
  golf: {
    name: "Golf",
    accessKinds: ["golf_course", "driving_range", "gym", "facility", "dining", "spa", "store"],
    fbMinimumAmount: 150,
    fbMinimumPeriod: "monthly",
  },
  national: {
    name: "National",
    accessKinds: [
      "court",
      "golf_course",
      "driving_range",
      "gym",
      "facility",
      "dining",
      "spa",
      "store",
    ],
    fbMinimumAmount: 200,
    fbMinimumPeriod: "monthly",
  },
  tennis: {
    name: "Tennis",
    accessKinds: ["court", "gym", "facility", "dining", "spa", "store"],
    fbMinimumAmount: 75,
    fbMinimumPeriod: "monthly",
  },
  social: {
    name: "Social",
    accessKinds: ["facility", "dining", "spa", "store"],
    fbMinimumAmount: 50,
    fbMinimumPeriod: "monthly",
  },
  social_tennis: {
    name: "Social with Tennis",
    accessKinds: ["court", "facility", "dining", "spa", "store"],
    fbMinimumAmount: 75,
    fbMinimumPeriod: "monthly",
  },
  social_gym: {
    name: "Social with Gym",
    accessKinds: ["gym", "facility", "dining", "spa", "store"],
    fbMinimumAmount: 50,
    fbMinimumPeriod: "monthly",
  },
  hoa: {
    name: "HOA Resident",
    accessKinds: HOA_RESIDENT_ACCESS_KINDS,
    fbMinimumAmount: 0,
    fbMinimumPeriod: "monthly",
  },
};

export function tierDefinitionsForCommunity(
  communityId: string,
): Record<string, MembershipTierDefinition> {
  if (communityId === IRON_LAKE_COMMUNITY_ID) {
    return Object.fromEntries(
      (Object.keys(IRON_LAKE_TIER_DEFINITIONS) as IronLakeTierSlug[]).map((slug) => {
        const def = IRON_LAKE_TIER_DEFINITIONS[slug];
        return [
          slug,
          {
            name: def.name,
            accessKinds: def.accessKinds as AmenityAccessKind[],
            fbMinimumAmount: def.fbMinimumAmount,
            fbMinimumPeriod: def.fbMinimumPeriod,
          } satisfies MembershipTierDefinition,
        ];
      }),
    );
  }
  // Plaza at Oceanside condo — one resident tier, all on-site amenities.
  if (communityId === "oceanside-residents") {
    return {
      hoa: {
        name: "HOA Resident",
        accessKinds: HOA_RESIDENT_ACCESS_KINDS,
        fbMinimumAmount: 0,
        fbMinimumPeriod: "monthly",
      },
    };
  }
  // Other HOA demos: club-style tiers but no F&B minimum.
  const hoaNoFbMin = new Set(["harbor-pointe", "willow-creek", "alliant"]);
  if (hoaNoFbMin.has(communityId)) {
    return Object.fromEntries(
      (Object.keys(MEMBERSHIP_TIER_DEFINITIONS) as DefaultMembershipTierSlug[])
        .filter((slug) => slug !== "hoa")
        .map((slug) => {
          const def = MEMBERSHIP_TIER_DEFINITIONS[slug];
          return [
            slug,
            {
              ...def,
              fbMinimumAmount: 0,
            } satisfies MembershipTierDefinition,
          ];
        }),
    );
  }
  return MEMBERSHIP_TIER_DEFINITIONS;
}

export function isMembershipTierSlug(value: string): value is MembershipTierSlug {
  return value in MEMBERSHIP_TIER_DEFINITIONS || isIronLakeTierSlug(value);
}

export function normalizeMembershipTier(value: string | null | undefined): MembershipTierSlug {
  if (value && isMembershipTierSlug(value)) return value;
  const lower = value?.toLowerCase();
  // Condo / HOA seed slugs — full amenity access, not club "social".
  if (lower === "hoa" || lower === "resident") return "hoa";
  return "social";
}

export function resolveTierDefinition(
  slug: string,
  communityId?: string,
): MembershipTierDefinition {
  if (communityId) {
    const communityDef = tierDefinitionsForCommunity(communityId)[slug];
    if (communityDef) return communityDef;
  }
  if (isIronLakeTierSlug(slug)) {
    const def = IRON_LAKE_TIER_DEFINITIONS[slug];
    return {
      name: def.name,
      accessKinds: def.accessKinds as AmenityAccessKind[],
      fbMinimumAmount: def.fbMinimumAmount,
      fbMinimumPeriod: def.fbMinimumPeriod,
    };
  }
  const normalized = normalizeMembershipTier(slug);
  if (normalized in MEMBERSHIP_TIER_DEFINITIONS) {
    return MEMBERSHIP_TIER_DEFINITIONS[normalized as DefaultMembershipTierSlug];
  }
  return MEMBERSHIP_TIER_DEFINITIONS.social;
}

/** Map amenity.kind to access bucket (fitness center → gym). */
export function amenityKindToAccess(kind: string, amenityName?: string): AmenityAccessKind {
  const k = kind.toLowerCase();
  if (k === "court") return "court";
  if (k === "golf_course") return "golf_course";
  if (k === "driving_range") return "driving_range";
  if (k === "gym") return "gym";
  if (k === "dining" || k === "restaurant") return "dining";
  if (k === "spa") return "spa";
  if (k === "store" || k === "pro_shop") return "store";
  if (k === "clubhouse" || k === "lodging" || k === "event_space") return "facility";
  if (amenityName?.toLowerCase().includes("fitness") || amenityName?.toLowerCase().includes("gym")) {
    return "gym";
  }
  if (amenityName?.toLowerCase().includes("spa")) return "spa";
  return "facility";
}

export function tierAllowsAmenity(
  tierSlug: string,
  amenityKind: string,
  amenityName?: string,
  accessKindsOverride?: string[],
  communityId?: string,
): boolean {
  // Condo: every active resident books any on-site amenity.
  if (communityId === "oceanside-residents") return true;
  const kinds =
    accessKindsOverride ??
    resolveTierDefinition(tierSlug, communityId).accessKinds;
  const needed = amenityKindToAccess(amenityKind, amenityName);
  return kinds.includes(needed);
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function periodBounds(
  period: FbPeriodKind,
  asOf = new Date(),
): { start: string; end: string } {
  const y = asOf.getFullYear();
  const m = asOf.getMonth();
  if (period === "monthly") {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  if (period === "quarterly") {
    const q = Math.floor(m / 3) * 3;
    const start = new Date(y, q, 1);
    const end = new Date(y, q + 3, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  if (period === "semi_annual") {
    const half = m < 6 ? 0 : 6;
    const start = new Date(y, half, 1);
    const end = new Date(y, half + 6, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
