export const IRON_LAKE_COMMUNITY_ID = "iron-lake";

export type IronLakeAmenityAccessKind =
  | "court"
  | "golf_course"
  | "driving_range"
  | "gym"
  | "facility"
  | "dining"
  | "spa"
  | "store";

export type IronLakeTierSlug =
  | "full_golf"
  | "all_florida_golf"
  | "national_golf"
  | "young_executive_golf"
  | "senior_golf"
  | "clergy_golf"
  | "equestrian_golf"
  | "social_dining"
  | "social_plus_sports"
  | "corporate";

const FULL_CLUB_ACCESS: IronLakeAmenityAccessKind[] = [
  "court",
  "golf_course",
  "driving_range",
  "gym",
  "facility",
  "dining",
  "spa",
  "store",
];

/**
 * The Club at Iron Lake membership categories (May 2026 schedule).
 * Dues are monthly; F&B minimums are annual.
 */
export const IRON_LAKE_TIER_DEFINITIONS: Record<
  IronLakeTierSlug,
  {
    name: string;
    accessKinds: IronLakeAmenityAccessKind[];
    fbMinimumAmount: number;
    fbMinimumPeriod: "monthly" | "quarterly" | "semi_annual" | "annual";
    initiationFee: number;
    monthlyDues: number;
    description: string;
  }
> = {
  full_golf: {
    name: "Full Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 3000,
    fbMinimumPeriod: "annual",
    initiationFee: 35000,
    monthlyDues: 1250,
    description: "Primary/secondary Florida residence within 100 miles of the Club.",
  },
  all_florida_golf: {
    name: "All-Florida Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 2250,
    fbMinimumPeriod: "annual",
    initiationFee: 30000,
    monthlyDues: 900,
    description: "Florida residence greater than 100 miles from the Club.",
  },
  national_golf: {
    name: "National Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 1500,
    fbMinimumPeriod: "annual",
    initiationFee: 22500,
    monthlyDues: 800,
    description: "Resides outside the state of Florida.",
  },
  young_executive_golf: {
    name: "Young Executive Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 1500,
    fbMinimumPeriod: "annual",
    initiationFee: 17500,
    monthlyDues: 675,
    description:
      "Age 43 and younger as of the beginning of any Membership Year (Jan 1–Dec 31).",
  },
  senior_golf: {
    name: "Senior Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 1250,
    fbMinimumPeriod: "annual",
    initiationFee: 17500,
    monthlyDues: 575,
    description:
      "Age 65 or older as of the beginning of any Membership Year (Jan 1–Dec 31).",
  },
  clergy_golf: {
    name: "Clergy Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 1500,
    fbMinimumPeriod: "annual",
    initiationFee: 9500,
    monthlyDues: 550,
    description:
      "Full-time clergy for an established church, synagogue, or mosque, or retired from such capacity.",
  },
  equestrian_golf: {
    name: "Equestrian Professional Golf",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 2000,
    fbMinimumPeriod: "annual",
    initiationFee: 15000,
    monthlyDues: 575,
    description:
      "Primary employment and income from professional riding, training, or breeding of horses and/or equestrian riders.",
  },
  social_dining: {
    name: "Social & Dining",
    accessKinds: ["facility", "dining", "store"],
    fbMinimumAmount: 3000,
    fbMinimumPeriod: "annual",
    initiationFee: 2750,
    monthlyDues: 500,
    description: "Dining and social activities at Club Facilities.",
  },
  social_plus_sports: {
    name: "Social plus Sports",
    accessKinds: [
      "court",
      "gym",
      "facility",
      "dining",
      "spa",
      "store",
      "golf_course",
      "driving_range",
    ],
    fbMinimumAmount: 3000,
    fbMinimumPeriod: "annual",
    initiationFee: 5500,
    monthlyDues: 550,
    description:
      "Dining and social plus pool, fitness, spa, and racquets; six golf rounds per Membership Year.",
  },
  corporate: {
    name: "Corporate Membership",
    accessKinds: FULL_CLUB_ACCESS,
    fbMinimumAmount: 3000,
    fbMinimumPeriod: "annual",
    initiationFee: 0,
    monthlyDues: 0,
    description:
      "Bespoke program for bona fide business entities with a Primary Designee and Club-approved designees.",
  },
};

export function isIronLakeTierSlug(value: string): value is IronLakeTierSlug {
  return value in IRON_LAKE_TIER_DEFINITIONS;
}
