/**
 * Member-facing summary of The Club at Iron Lake Membership Plan (May 2026).
 * Not a substitute for the governing Membership Plan, Rules & Regulations,
 * or Membership Agreement.
 */

export const IRON_LAKE_MEMBERSHIP_YEAR = {
  label: "Membership Year",
  description: "January 1 through December 31, unless otherwise established by the Club.",
} as const;

export const IRON_LAKE_OPERATOR = {
  name: "Iron Lake Management, LLC",
  doingBusinessAs: "The Club at Iron Lake",
  note: "Where the Membership Plan refers to the Club taking action, that reference means the Company doing business as The Club at Iron Lake.",
} as const;

export const IRON_LAKE_CLUB_FACILITIES = [
  "18-hole championship golf course and golf practice facilities, including a range and putting green",
  "Clubhouse with an onsite restaurant, full-service golf shop, and men’s and women’s locker rooms",
  "Swim and fitness complex with fitness center, spa, and swimming pool",
  "7 lighted tennis courts",
  "4 pickleball courts",
  "2 EV charging stations",
] as const;

export const IRON_LAKE_SPECIAL_BENEFITS = [
  {
    title: "Transferability",
    body: "A membership is transferable to the subsequent purchaser of the member’s residence or homesite in the Community, subject to Club approval and the Membership Plan.",
  },
  {
    title: "Immediate Family Privileges",
    body: "A member’s Immediate Family Members are entitled to the same use privileges as the member without additional membership dues.",
  },
  {
    title: "No Assessments",
    body: "Members are not subject to operating assessments by the Club. Capital assessments require member approval as provided in the Membership Plan.",
  },
] as const;

export const IRON_LAKE_FAMILY_GUEST_SUMMARY = [
  "Immediate Family Members include the member’s spouse or Designated Family Member, and their children under age 24.",
  "An unmarried member may designate one household Designated Family Member (Club approval required; one redesignation per Membership Year with a redesignation fee).",
  "Guests use Club Facilities per membership category and guest policies. Accompanied and unaccompanied guest fees apply as posted.",
  "Members are responsible for all charges and the conduct of Immediate Family Members and guests.",
  "Corporate designee privileges are set in the Corporate Membership Agreement.",
] as const;

export const IRON_LAKE_MANDATORY_MEMBERSHIP = {
  title: "Mandatory Membership — IronCrest Property Owners",
  body: "Owners of residences or homesites subject to the Club Declaration must apply for, acquire, and maintain at least a Social & Dining membership for which they are eligible, unless exempt. Membership is an integral part of the Community.",
} as const;

export const IRON_LAKE_WAITING_LIST_FULL_GOLF = [
  "Eligible Social plus Sports Members who own property in the Community and desire to upgrade",
  "Eligible Social & Dining Members who own property in the Community and desire to upgrade",
  "Eligible Social plus Sports Members who do not own property in the Community and desire to upgrade",
  "Eligible Social & Dining Members who do not own property in the Community and desire to upgrade",
  "All other persons or entities who desire a Full Golf Membership",
] as const;

export const IRON_LAKE_PLAN_NOTICES = [
  "Memberships are offered exclusively for recreational use of the Club Facilities and should not be viewed as an investment.",
  "Rely only on the Membership Plan and referenced documents; verbal statements do not amend membership terms.",
  "In a conflict with other printed materials, the Membership Plan, Rules and Regulations, and Membership Agreement govern.",
] as const;

export type IronLakePrivilegeSummary = {
  slug: string;
  facilityAccess: string;
  golfPrivileges: string;
  racquetPrivileges: string;
  otherNotes?: string;
};

/** Per-category use privileges (Membership Plan § II). */
export const IRON_LAKE_CATEGORY_PRIVILEGES: IronLakePrivilegeSummary[] = [
  {
    slug: "full_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
  },
  {
    slug: "all_florida_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
  },
  {
    slug: "national_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
    otherNotes:
      "Prospective National members with a part-time Florida residence may be considered case-by-case.",
  },
  {
    slug: "young_executive_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
    otherNotes: "Eligibility: age 43 or younger as of the beginning of the Membership Year.",
  },
  {
    slug: "senior_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
    otherNotes: "Eligibility: age 65 or older as of the beginning of the Membership Year.",
  },
  {
    slug: "equestrian_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
    otherNotes:
      "Eligibility: primary employment/income from professional riding, training, or breeding of horses and/or equestrian riders.",
  },
  {
    slug: "clergy_golf",
    facilityAccess: "All Club Facilities",
    golfPrivileges:
      "No greens fees or range-ball fees. Cart fees, F&B, and caddie/forecaddie charges apply as posted.",
    racquetPrivileges: "No court fees. Advance tee/court sign-up per Club policy.",
    otherNotes:
      "Eligibility: full-time clergy for an established church, synagogue, or mosque, or retired from such capacity.",
  },
  {
    slug: "social_dining",
    facilityAccess: "Dining and social activities at Club Facilities",
    golfPrivileges: "No golf course privileges under this category.",
    racquetPrivileges: "No racquet court privileges under this category.",
    otherNotes: "Use and consumption charges (including F&B) apply as posted. Minimum Social & Dining category for mandatory Membership Property owners.",
  },
  {
    slug: "social_plus_sports",
    facilityAccess: "Dining, social, pool, fitness, spa, and racquets",
    golfPrivileges:
      "Limited to six (6) rounds per Membership Year (including Club-sponsored member golf events). No greens fee on those rounds; cart fee and caddie/forecaddie (if applicable) required. Range balls charged. Practice facilities only when playing a round.",
    racquetPrivileges: "Court usage per eligible member policies; guest court fees apply.",
  },
  {
    slug: "corporate",
    facilityAccess: "As specified in the Corporate Membership Agreement",
    golfPrivileges: "As specified for designated users under the Corporate Membership Agreement",
    racquetPrivileges: "As specified for designated users under the Corporate Membership Agreement",
    otherNotes:
      "Available to a bona fide business entity. Requires a Primary Designee at all times; additional designees subject to Club approval and a Corporate Member Designee Agreement.",
  },
];

export const IRON_LAKE_UPGRADE_NOTE =
  "Members may upgrade to a higher eligible category when available by paying the difference in Initiation Fees then in effect, then dues for the new category.";

export const SOCIAL_PLUS_SPORTS_GOLF_ROUNDS_PER_YEAR = 6;
