import { IRON_LAKE_TIER_DEFINITIONS, type IronLakeTierSlug } from "@/lib/iron-lake-tiers";

export type FeeBilling = "per_round" | "per_player_per_round" | "annual" | "monthly" | "percent" | "flat" | "night" | "hour" | "bespoke";

export type MemberServiceCharge = {
  id: string;
  section: string;
  name: string;
  amount: number | null;
  billing: FeeBilling;
  note?: string;
  complimentary?: boolean;
};

/** Full Golf…Social schedule rows for display (May 2026). */
export const IRON_LAKE_MEMBERSHIP_SCHEDULE: Array<{
  slug: IronLakeTierSlug | "corporate";
  name: string;
  eligibility: string;
  initiationFee: number | null;
  monthlyDues: number | null;
  annualDues: number | null;
  fbMinimumAnnual: number | null;
  bespoke?: boolean;
}> = [
  {
    slug: "full_golf",
    name: "Full Golf",
    eligibility:
      "Primary or secondary residence in Florida within a 100-mile radius of Iron Lake (majority of the year)",
    initiationFee: 35000,
    monthlyDues: 1250,
    annualDues: 15000,
    fbMinimumAnnual: 3000,
  },
  {
    slug: "all_florida_golf",
    name: "All-Florida Golf",
    eligibility: "Primary or secondary residence in Florida greater than 100 miles from Iron Lake",
    initiationFee: 30000,
    monthlyDues: 900,
    annualDues: 10800,
    fbMinimumAnnual: 2250,
  },
  {
    slug: "national_golf",
    name: "National Golf",
    eligibility: "Resides outside the state of Florida",
    initiationFee: 22500,
    monthlyDues: 800,
    annualDues: 9600,
    fbMinimumAnnual: 1500,
  },
  {
    slug: "young_executive_golf",
    name: "Young Executive Golf",
    eligibility: "Age 43 and younger as of the beginning of any Membership Year",
    initiationFee: 17500,
    monthlyDues: 675,
    annualDues: 8100,
    fbMinimumAnnual: 1500,
  },
  {
    slug: "senior_golf",
    name: "Senior Golf",
    eligibility: "Age 65 or older as of the beginning of any Membership Year",
    initiationFee: 17500,
    monthlyDues: 575,
    annualDues: 6900,
    fbMinimumAnnual: 1250,
  },
  {
    slug: "clergy_golf",
    name: "Clergy Golf",
    eligibility:
      "Full-time clergy for an established church, synagogue, or mosque, or retired from such capacity",
    initiationFee: 9500,
    monthlyDues: 550,
    annualDues: 6600,
    fbMinimumAnnual: 1500,
  },
  {
    slug: "equestrian_golf",
    name: "Equestrian Professional Golf",
    eligibility:
      "Primary employment and income from professional riding, training, or breeding of horses and/or equestrian riders",
    initiationFee: 15000,
    monthlyDues: 575,
    annualDues: 6900,
    fbMinimumAnnual: 2000,
  },
  {
    slug: "social_dining",
    name: "Social & Dining",
    eligibility: "Dining and social activities; minimum category for mandatory Membership Property owners",
    initiationFee: 2750,
    monthlyDues: 500,
    annualDues: 6000,
    fbMinimumAnnual: 3000,
  },
  {
    slug: "social_plus_sports",
    name: "Social plus Sports",
    eligibility:
      "Dining, social, pool, fitness, spa, and racquets — plus six golf rounds per Membership Year",
    initiationFee: 5500,
    monthlyDues: 550,
    annualDues: 6600,
    fbMinimumAnnual: 3000,
  },
  {
    slug: "corporate",
    name: "Corporate Membership",
    eligibility:
      "Bona fide business entity with a Primary Designee; privileges per Corporate Membership Agreement",
    initiationFee: null,
    monthlyDues: null,
    annualDues: null,
    fbMinimumAnnual: null,
    bespoke: true,
  },
];

/** Golf / racquet / admin / locker / cart — Member Services & Charges (May 2026). */
export const IRON_LAKE_MEMBER_SERVICE_CHARGES: MemberServiceCharge[] = [
  {
    id: "cart-round",
    section: "Member Cart Program",
    name: "Cart fee",
    amount: 30,
    billing: "per_player_per_round",
    note: "$30 fee per player, per round",
  },
  {
    id: "cart-annual",
    section: "Member Cart Program",
    name: "Annual preferred cart program",
    amount: 2500,
    billing: "annual",
    note: "Optional annual program for added ease and continuity — $2,500 per member per annum",
  },
  {
    id: "guest-golf-accomp",
    section: "Guest Fees (Golf)",
    name: "Accompanied Guest Fee",
    amount: 125,
    billing: "flat",
  },
  {
    id: "guest-golf-unaccomp",
    section: "Guest Fees (Golf)",
    name: "Unaccompanied Guest Fee",
    amount: 300,
    billing: "flat",
  },
  {
    id: "bag-storage",
    section: "Golf Bag Storage",
    name: "Bag storage",
    amount: 200,
    billing: "annual",
    note: "No bag storage in individual lockers",
  },
  {
    id: "locker-day",
    section: "Locker Privileges",
    name: "Day Locker Room Access",
    amount: 0,
    billing: "flat",
    complimentary: true,
    note: "Complimentary — available to all Members and their Guests for daily use",
  },
  {
    id: "locker-half",
    section: "Locker Privileges",
    name: "Personal Half Locker",
    amount: 300,
    billing: "annual",
    note: "Personalized nameplate, daily cleaning and reset, towel service",
  },
  {
    id: "locker-full",
    section: "Locker Privileges",
    name: "Personal Full Locker",
    amount: 600,
    billing: "annual",
    note: "Personalized nameplate, daily cleaning and reset, towel service",
  },
  {
    id: "forecaddie",
    section: "Forecaddie Program",
    name: "Forecaddie service",
    amount: 50,
    billing: "per_player_per_round",
    note: "Course navigation, yardage, ball tracking, bunker raking, and green support",
  },
  {
    id: "court-guest-accomp",
    section: "Racquet Sports Services",
    name: "Accompanied Guest Court Fee",
    amount: 25,
    billing: "flat",
    note: "Court usage complimentary for eligible members",
  },
  {
    id: "court-guest-unaccomp",
    section: "Racquet Sports Services",
    name: "Unaccompanied Guest Court Fee",
    amount: 50,
    billing: "flat",
  },
  {
    id: "tennis-ball-machine",
    section: "Racquet Sports Services",
    name: "Tennis Ball Machine Rental",
    amount: 25,
    billing: "hour",
    note: "On-court ball machine available for member rental — pair with a court reservation",
  },
  {
    id: "ev-charging",
    section: "Member Administrative Services",
    name: "EV Charging Stations",
    amount: 0,
    billing: "flat",
    complimentary: true,
    note: "Two on-site stations — reserve while on property",
  },
  {
    id: "cc-fee",
    section: "Member Administrative Services",
    name: "Credit card processing",
    amount: 3,
    billing: "percent",
  },
  {
    id: "late-fee",
    section: "Member Administrative Services",
    name: "Late Fee",
    amount: 50,
    billing: "flat",
  },
  {
    id: "nsf-fee",
    section: "Member Administrative Services",
    name: "Returned Payment Fee (NSF)",
    amount: 35,
    billing: "flat",
  },
  {
    id: "sky-suite",
    section: "Tower Lodging & Event Space",
    name: "5th Floor Sky Suite",
    amount: 550,
    billing: "night",
  },
  {
    id: "exec-king",
    section: "Tower Lodging & Event Space",
    name: "3rd Floor Executive King Bedroom",
    amount: 375,
    billing: "night",
  },
  {
    id: "dual-king",
    section: "Tower Lodging & Event Space",
    name: "3rd Floor Dual Executive King Reservation",
    amount: 575,
    billing: "night",
  },
  {
    id: "event-space",
    section: "Tower Lodging & Event Space",
    name: "4th Floor Event Space",
    amount: 150,
    billing: "hour",
    note: "Or bespoke charge for special events greater than 3 hours",
  },
];

export const IRON_LAKE_EVENTS_NOTES = [
  "Member events — select events included; specialty events priced accordingly.",
  "Tournament entry fees vary by format and level of competition.",
  "Private event hosting is customized with the club based on scope and service.",
] as const;

export const IRON_LAKE_CLUB_CONTACT = {
  web: "TheClubatIronLake.com",
  phone: "352-400-4653",
  email: "Membership@TheClubatIronLake.com",
  address: "950 NW 75th St, Ocala, FL 34475",
  ratesAsOf: "May, 2026",
  /** Public listing hours (Opendi / business directories): daily 9:00 AM – 5:00 PM */
  publishedHoursLabel: "Daily 9:00 AM – 5:00 PM",
  publishedHoursOpen: "09:00",
  publishedHoursClose: "17:00",
} as const;

/** Keep GUEST_FEES map in sync for booking copy elsewhere. */
export const IRON_LAKE_GUEST_FEES = {
  golfAccompanied: 125,
  golfUnaccompanied: 300,
  courtAccompanied: 25,
  courtUnaccompanied: 50,
  tennisBallMachinePerHour: 25,
  cartPerRound: 30,
  annualCartProgram: 2500,
  forecaddiePerRound: 50,
  halfLocker: 300,
  fullLocker: 600,
  bagStorage: 200,
  lateFee: 50,
  nsfFee: 35,
  cardProcessingPercent: 3,
} as const;

export function formatIronLakeCharge(
  amount: number | null,
  billing: FeeBilling,
  complimentary?: boolean,
): string {
  if (complimentary || amount === 0) return "Complimentary";
  if (amount == null || billing === "bespoke") return "Bespoke";
  if (billing === "percent") return `${amount}%`;
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
  switch (billing) {
    case "per_round":
      return `${money} / round`;
    case "per_player_per_round":
      return `${money} / player / round`;
    case "annual":
      return `${money} / year`;
    case "monthly":
      return `${money} / month`;
    case "night":
      return `${money} / night`;
    case "hour":
      return `${money} / hour`;
    case "flat":
      return money;
    default: {
      const _exhaustive: never = billing;
      return _exhaustive;
    }
  }
}

export function ironLakeTierDisplay(slug: string) {
  if (slug in IRON_LAKE_TIER_DEFINITIONS) {
    return IRON_LAKE_TIER_DEFINITIONS[slug as IronLakeTierSlug];
  }
  return null;
}
