import { IRON_LAKE_COMMUNITY_ID } from "@/lib/iron-lake-tiers";
import type { IronLakeTierSlug } from "@/lib/iron-lake-tiers";

export { IRON_LAKE_COMMUNITY_ID } from "@/lib/iron-lake-tiers";

/** IronCrest lawn vendor — provider portal demo login. */
export const IRON_CREST_LAWN_PROVIDER_EMAIL = "lawn@ironcrest.services";
export const IRON_CREST_LAWN_BUSINESS_NAME = "Iron Crest Lawn & Landscape";
export {
  IRON_LAKE_TIER_DEFINITIONS,
  isIronLakeTierSlug,
  type IronLakeTierSlug,
} from "@/lib/iron-lake-tiers";
export {
  IRON_LAKE_GUEST_FEES,
  IRON_LAKE_MEMBERSHIP_SCHEDULE,
  IRON_LAKE_MEMBER_SERVICE_CHARGES,
  IRON_LAKE_EVENTS_NOTES,
  IRON_LAKE_CLUB_CONTACT,
} from "@/lib/iron-lake-fees";
export {
  IRON_LAKE_CLUB_FACILITIES,
  IRON_LAKE_CATEGORY_PRIVILEGES,
  IRON_LAKE_SPECIAL_BENEFITS,
  IRON_LAKE_FAMILY_GUEST_SUMMARY,
  IRON_LAKE_MANDATORY_MEMBERSHIP,
  IRON_LAKE_MEMBERSHIP_YEAR,
  SOCIAL_PLUS_SPORTS_GOLF_ROUNDS_PER_YEAR,
} from "@/lib/iron-lake-plan";

/** Demo logins for role walkthrough (password: `password`, provider: `password1!`). */
export const IRON_LAKE_DEMO_USERS = [
  {
    id: "u-il-admin",
    email: "admin@theclubatironlake.com",
    password: "password",
    role: "admin" as const,
    name: "Iron Lake Club Admin",
    communityId: IRON_LAKE_COMMUNITY_ID,
  },
  {
    id: "u-il-member-golf",
    email: "member.golf@theclubatironlake.com",
    password: "password",
    role: "member" as const,
    name: "Caroline Whitmore",
    communityId: IRON_LAKE_COMMUNITY_ID,
    tier: "full_golf" as IronLakeTierSlug,
    unit: "Lot 42",
  },
  {
    id: "u-il-member-national",
    email: "member.national@theclubatironlake.com",
    password: "password",
    role: "member" as const,
    name: "David Chen",
    communityId: IRON_LAKE_COMMUNITY_ID,
    tier: "national_golf" as IronLakeTierSlug,
    unit: "Guest Member",
  },
  {
    id: "u-il-member-social",
    email: "member.social@theclubatironlake.com",
    password: "password",
    role: "member" as const,
    name: "Elena Vargas",
    communityId: IRON_LAKE_COMMUNITY_ID,
    tier: "social_dining" as IronLakeTierSlug,
    unit: "Lot 18",
  },
  {
    id: "u-il-member-sports",
    email: "member.sports@theclubatironlake.com",
    password: "password",
    role: "member" as const,
    name: "Marcus Hale",
    communityId: IRON_LAKE_COMMUNITY_ID,
    tier: "social_plus_sports" as IronLakeTierSlug,
    unit: "Lot 7",
  },
  {
    id: "u-il-member-equestrian",
    email: "member.equestrian@theclubatironlake.com",
    password: "password",
    role: "member" as const,
    name: "Sophia Langford",
    communityId: IRON_LAKE_COMMUNITY_ID,
    tier: "equestrian_golf" as IronLakeTierSlug,
    unit: "Equestrian Estate 3",
  },
  {
    id: "u-il-board",
    email: "board@ironcrest.com",
    password: "password",
    role: "board" as const,
    name: "Robert Keene",
    communityId: IRON_LAKE_COMMUNITY_ID,
  },
  {
    id: "u-il-pm",
    email: "pm@ironcrest.com",
    password: "password",
    role: "pm" as const,
    name: "Natalie Brooks",
    communityId: IRON_LAKE_COMMUNITY_ID,
  },
  {
    id: "u-il-provider",
    email: IRON_CREST_LAWN_PROVIDER_EMAIL,
    password: "password1!",
    role: "provider" as const,
    name: IRON_CREST_LAWN_BUSINESS_NAME,
    communityId: IRON_LAKE_COMMUNITY_ID,
  },
] as const;

/** Club employees (directory) — not external vendors. */
export const IRON_LAKE_CLUB_STAFF = [
  {
    name: "Jordan Blake",
    title: "Head Golf Professional / Instructor",
    department: "Golf",
    email: "golf.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    name: "Alex Rivera",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "tennis.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "tennis_pro",
    sortOrder: 10,
  },
  {
    name: "Sam Ortega",
    title: "Head Pickleball Professional",
    department: "Pickleball",
    email: "pickleball.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "pickleball_pro",
    sortOrder: 12,
  },
  {
    name: "Priya Desai",
    title: "Spa Director",
    department: "Spa & Wellness",
    email: "spa@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "spa",
    sortOrder: 20,
  },
  {
    name: "Louis Chen",
    title: "Executive Chef",
    department: "Dining",
    email: "dining@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "dining",
    sortOrder: 30,
  },
  {
    name: "Maria Santos",
    title: "General Manager",
    department: "Club Management",
    email: "gm@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "management",
    sortOrder: 1,
  },
  {
    name: "Chris Nolan",
    title: "Membership Director",
    department: "Membership",
    email: "membership@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "management",
    sortOrder: 2,
  },
  {
    name: "Front Desk",
    title: "Member Services",
    department: "Front Desk",
    email: "frontdesk@theclubatironlake.com",
    phone: "(352) 400-4653",
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/**
 * External HOA/home services vendors (local pros) — not club golf/tennis instructors.
 */
export const IRON_LAKE_VENDORS = [
  {
    name: IRON_CREST_LAWN_BUSINESS_NAME,
    category: "Lawn Maintenance",
    type: "service" as const,
    rating: 4.7,
    email: IRON_CREST_LAWN_PROVIDER_EMAIL,
    phone: "(352) 555-2101",
    description: "Weekly lawn care, shrub trimming, and irrigation checks for IronCrest residences.",
    listingKind: "local_pro" as const,
  },
  {
    name: "Quarry Pool & Aquatic",
    category: "Pool Maintenance",
    type: "service" as const,
    rating: 4.6,
    email: "pool@ironcrest.services",
    phone: "(352) 555-2102",
    description: "Residential and club pool chemistry, cleaning, and seasonal openings.",
    listingKind: "local_pro" as const,
  },
  {
    name: "Canopy Clean Co.",
    category: "Cleaning",
    type: "service" as const,
    rating: 4.8,
    email: "cleaning@ironcrest.services",
    phone: "(352) 555-2103",
    description: "Housekeeping and move-in/move-out cleans for IronCrest homes.",
    listingKind: "local_pro" as const,
  },
  {
    name: "Ocala Climate HVAC",
    category: "HVAC",
    type: "service" as const,
    rating: 4.5,
    email: "hvac@ironcrest.services",
    phone: "(352) 555-2104",
    description: "AC service, filter changes, and emergency cooling repair.",
    listingKind: "local_pro" as const,
  },
] as const;

/**
 * Club activity providers / instructors (listingKind = club, type = activity).
 * Appear on admin Activities and Private Lessons (golf/tennis/pickleball) — not member Vendors.
 * Not Local Pros — those use IRON_LAKE_VENDORS (listingKind = local_pro).
 */
export const IRON_LAKE_LESSON_PROS = [
  {
    name: "Jordan Blake — Golf Pro",
    category: "golf",
    type: "activity" as const,
    rating: 4.9,
    email: "golf.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "PGA Head Golf Professional — private range lessons and on-course instruction at The Club at Iron Lake.",
    listingKind: "club" as const,
  },
  {
    name: "Casey Morgan — Associate Golf Pro",
    category: "golf",
    type: "activity" as const,
    rating: 4.7,
    email: "golf.associate@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Associate teaching professional — short game, full swing, and junior golf lessons.",
    listingKind: "club" as const,
  },
  {
    name: "Alex Rivera — Tennis Pro",
    category: "tennis",
    type: "activity" as const,
    rating: 4.9,
    email: "tennis.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Head Tennis Professional — private and semi-private lessons on green-clay courts.",
    listingKind: "club" as const,
  },
  {
    name: "Riley Quinn — Associate Tennis Pro",
    category: "tennis",
    type: "activity" as const,
    rating: 4.8,
    email: "tennis.associate@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Associate tennis professional — stroke fundamentals, match play, and junior development.",
    listingKind: "club" as const,
  },
  {
    name: "Sam Ortega — Pickleball Pro",
    category: "pickleball",
    type: "activity" as const,
    rating: 4.9,
    email: "pickleball.pro@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Head Pickleball Professional — private and semi-private lessons on the Iron Lake pickleball courts.",
    listingKind: "club" as const,
  },
  {
    name: "Jamie Park — Associate Pickleball Pro",
    category: "pickleball",
    type: "activity" as const,
    rating: 4.8,
    email: "pickleball.associate@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Associate pickleball professional — dinking, third-shot drop, doubles strategy, and junior clinics.",
    listingKind: "club" as const,
  },
  {
    name: "Limestone Spa Therapies",
    category: "spa",
    type: "activity" as const,
    rating: 4.8,
    email: "spa@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Massage, facials, and wellness treatments in the Iron Lake Spa & Wellness complex.",
    listingKind: "club" as const,
  },
  {
    name: "Quarry Fitness Coaching",
    category: "fitness",
    type: "activity" as const,
    rating: 4.7,
    email: "fitness@theclubatironlake.com",
    phone: "(352) 400-4653",
    description:
      "Personal training and small-group fitness coaching in the swim and fitness complex.",
    listingKind: "club" as const,
  },
] as const;

/** Old provider listing names to remove when correcting club-vs-vendor roles. */
export const IRON_LAKE_LEGACY_ACTIVITY_PROVIDERS = [
  "Quarry View Golf Instruction",
  "Iron Lake Racquet Academy",
  "WEC Equestrian Concierge",
] as const;
