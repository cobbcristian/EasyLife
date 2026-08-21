import type {
  AnalyticsPoint,
  Community,
  CommunityMember,
  Provider,
  ServiceBooking,
} from "./types";
import { brandAssets } from "./brand-assets";
import { easternDateOffset } from "./weather";

const residentNames = [
  "Lisa Clarizio",
  "Kendra Carter",
  "Greg Sherman",
  "Michael Carter",
  "Brendan Dawson",
  "Jack Graffagnino",
  "Michael McDowell",
  "Eric Bonfiglio",
  "Rachel Clouse",
  "Simon Ferguson",
];

function makeResidents(count: number): CommunityMember[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r-${i}`,
    name: residentNames[i % residentNames.length],
    role: "Resident",
    isManagement: false,
  }));
}

const goldenOcalaManagement: CommunityMember[] = [
  { id: "m1", name: "Dave Mathieu", role: "Community Admin", isManagement: true },
  { id: "m2", name: "Kendra Carter", role: "Management", isManagement: true },
  { id: "m3", name: "Rachel Clouse", role: "Management", isManagement: true },
  { id: "m4", name: "Simon Ferguson", role: "Management", isManagement: true },
  { id: "m5", name: "Casper DeClose", role: "Management", isManagement: true },
];

const goldenOcalaProviders: Provider[] = [
  {
    id: "p1",
    name: "Cassie's Meticulous Touch",
    category: "Cleaning",
    type: "service",
    rating: 4.9,
    imageUrl: brandAssets.serviceCleaningSupplies,
  },
  {
    id: "p2",
    name: "Premier Carpet Care",
    category: "Carpet Cleaning",
    type: "service",
    rating: 4.8,
    imageUrl: brandAssets.serviceCarpet,
  },
  {
    id: "p2b",
    name: "Greenscape Lawn Care",
    category: "Landscaping",
    type: "service",
    rating: 4.7,
    imageUrl: brandAssets.serviceLandscaping,
  },
  {
    id: "p3",
    name: "AquaFit Swim Lessons",
    category: "Pool",
    type: "activity",
    rating: 4.8,
    imageUrl: brandAssets.servicePool,
  },
  {
    id: "p4",
    name: "Sunset Yoga Collective",
    category: "Wellness",
    type: "activity",
    rating: 5.0,
    imageUrl: brandAssets.serviceYoga,
  },
  {
    id: "p4b",
    name: "Ocala Fitness Center",
    category: "Fitness",
    type: "activity",
    rating: 4.7,
    imageUrl: brandAssets.serviceFitness,
  },
];

export const communities: Community[] = [
  {
    id: "golden-ocala",
    name: "Golden Ocala",
    location: "Ocala, FL",
    residentCount: 192,
    serviceCount: 3,
    activityCount: 3,
    coverColor: "from-brand-400 to-brand-600",
    logoUrl: brandAssets.communityGoldenOcala,
    management: goldenOcalaManagement,
    residents: makeResidents(192),
    providers: goldenOcalaProviders,
  },
  {
    id: "harbor-pointe",
    name: "Harbor Pointe",
    location: "Naples, FL",
    residentCount: 420,
    serviceCount: 3,
    activityCount: 6,
    coverColor: "from-cyan-400 to-blue-600",
    logoUrl: brandAssets.communityHarborPointe,
    primaryColor: "#0c4a6e",
    appDisplayName: "Harbor Pointe",
    management: [
      { id: "hp-m1", name: "Olivia Reed", role: "Community Admin", isManagement: true },
      { id: "hp-m2", name: "Marcus Lane", role: "Property Manager", isManagement: true },
      { id: "hp-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "hp-r1", name: "Jordan Blake", role: "Homeowner", isManagement: false },
      { id: "hp-r2", name: "Casey Wells", role: "Homeowner", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `hp-rx-${i}` })),
    ],
    providers: [
      {
        id: "hp-p1",
        name: "BlueWave Pool Service",
        category: "Maintenance",
        type: "service",
        rating: 4.6,
        imageUrl: brandAssets.servicePool,
      },
    ],
  },
  {
    id: "willow-creek",
    name: "Willow Creek",
    location: "Fort Myers, FL",
    residentCount: 380,
    serviceCount: 2,
    activityCount: 5,
    coverColor: "from-emerald-400 to-teal-600",
    logoUrl: brandAssets.communityWillowCreek,
    primaryColor: "#064e3b",
    appDisplayName: "Willow Creek",
    management: [
      { id: "wc-m1", name: "Priya Nair", role: "Community Admin", isManagement: true },
      { id: "wc-m2", name: "Alex Morgan", role: "Property Manager", isManagement: true },
      { id: "wc-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "wc-r1", name: "Jordan Blake", role: "Homeowner", isManagement: false },
      { id: "wc-r2", name: "Casey Wells", role: "Homeowner", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `wc-rx-${i}` })),
    ],
    providers: [
      {
        id: "wc-p1",
        name: "Gulf Coast Tennis Pros",
        category: "Sports",
        type: "activity",
        rating: 4.8,
        imageUrl: brandAssets.serviceCourt,
      },
    ],
  },
  {
    id: "iron-lake",
    name: "The Club at Iron Lake",
    location: "Ocala, FL",
    residentCount: 48,
    serviceCount: 3,
    activityCount: 3,
    coverColor: "from-stone-700 to-amber-900",
    logoUrl: brandAssets.communityIroncrest,
    primaryColor: "#1c1917",
    appDisplayName: "IronCrest",
    management: [
      { id: "il-m1", name: "Iron Lake Club Admin", role: "Club Admin", isManagement: true },
      { id: "il-m2", name: "Natalie Brooks", role: "Property Manager", isManagement: true },
      { id: "il-m3", name: "Robert Keene", role: "Board Advisor", isManagement: true },
    ],
    residents: [
      { id: "il-r1", name: "Caroline Whitmore", role: "Full Golf Member", isManagement: false },
      { id: "il-r2", name: "David Chen", role: "National Golf Member", isManagement: false },
      { id: "il-r3", name: "Elena Vargas", role: "Social & Dining Member", isManagement: false },
      { id: "il-r4", name: "Marcus Hale", role: "Social plus Sports Member", isManagement: false },
      { id: "il-r5", name: "Sophia Langford", role: "Equestrian Golf Member", isManagement: false },
      ...makeResidents(43).map((r, i) => ({ ...r, id: `il-rx-${i}` })),
    ],
    providers: [
      {
        id: "il-p1",
        name: "Iron Crest Lawn & Landscape",
        category: "Lawn Maintenance",
        type: "service",
        rating: 4.7,
        imageUrl: brandAssets.serviceLandscaping,
      },
      {
        id: "il-p2",
        name: "Quarry Pool & Aquatic",
        category: "Pool Maintenance",
        type: "service",
        rating: 4.6,
        imageUrl: brandAssets.servicePool,
      },
      {
        id: "il-p3",
        name: "Canopy Clean Co.",
        category: "Cleaning",
        type: "service",
        rating: 4.8,
        imageUrl: brandAssets.serviceCleaningSupplies,
      },
      {
        id: "il-p4",
        name: "Ocala Climate HVAC",
        category: "HVAC",
        type: "service",
        rating: 4.5,
        imageUrl: brandAssets.serviceCleaning,
      },
    ],
  },
  {
    id: "heritage-bay",
    name: "Heritage Bay Golf & Country Club",
    location: "Naples, FL",
    residentCount: 1250,
    serviceCount: 2,
    activityCount: 8,
    coverColor: "from-[#1f2937] to-[#c9a84c]",
    logoUrl: brandAssets.communityHeritageBay,
    primaryColor: "#1f2937",
    appDisplayName: "Heritage Bay",
    management: [
      { id: "hb-m1", name: "Doug Brown", role: "General Manager / COO", isManagement: true },
      { id: "hb-m2", name: "Lina Blount", role: "Chief Financial Officer", isManagement: true },
      {
        id: "hb-m3",
        name: "Stephanie McIntosh",
        role: "Chief Administrative Officer",
        isManagement: true,
      },
      {
        id: "hb-m4",
        name: "Justin McCarraher, PGA",
        role: "Director of Golf Operations",
        isManagement: true,
      },
    ],
    residents: [
      { id: "hb-r1", name: "Kelly Anderson", role: "Golf Member", isManagement: false },
      ...makeResidents(59).map((r, i) => ({ ...r, id: `hb-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "hunters-ridge",
    name: "Hunters Ridge Golf & Country Club",
    location: "Bonita Springs, FL",
    residentCount: 420,
    serviceCount: 2,
    activityCount: 10,
    coverColor: "from-[#14532d] to-[#caa64b]",
    logoUrl: brandAssets.communityHuntersRidge,
    primaryColor: "#14532d",
    appDisplayName: "Hunters Ridge",
    management: [
      { id: "hr-m1", name: "Don Huprich", role: "General Manager", isManagement: true },
      { id: "hr-m2", name: "Steve Pinger", role: "Director of Golf", isManagement: true },
      {
        id: "hr-m3",
        name: "Benjamin Gensmer",
        role: "First Assistant Professional",
        isManagement: true,
      },
      {
        id: "hr-m4",
        name: "Jose Garcia",
        role: "Golf Course Superintendent",
        isManagement: true,
      },
      {
        id: "hr-m5",
        name: "Naomi Weathers",
        role: "Membership / Communications",
        isManagement: true,
      },
    ],
    residents: [
      { id: "hr-r1", name: "Grace Holloway", role: "Golf Member", isManagement: false },
      ...makeResidents(41).map((r, i) => ({ ...r, id: `hr-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "bonita-bay",
    name: "Bonita Bay Club",
    location: "Bonita Springs, FL",
    residentCount: 1250,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#0f3d2e] to-[#c5a35a]",
    logoUrl: brandAssets.communityBonitaBay,
    primaryColor: "#0f3d2e",
    appDisplayName: "Bonita Bay Club",
    management: [
      { id: "bb-m1", name: "Frederick Fung", role: "CEO / General Manager", isManagement: true },
      { id: "bb-m2", name: "Elena Vargas", role: "Membership / Club Admin", isManagement: true },
      { id: "bb-m3", name: "James Whitfield", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "bb-r1", name: "Claire Montgomery", role: "Golf Member", isManagement: false },
      { id: "bb-r2", name: "Robert Hale", role: "Sports Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `bb-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "shadow-wood",
    name: "Shadow Wood Country Club",
    location: "Estero, FL",
    residentCount: 1850,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1b4332] to-[#95d5b2]",
    logoUrl: brandAssets.communityShadowWood,
    primaryColor: "#1b4332",
    appDisplayName: "Shadow Wood",
    management: [
      { id: "sw-m1", name: "Thomas Brennan", role: "General Manager", isManagement: true },
      { id: "sw-m2", name: "Amanda Reeves", role: "Membership / Communications", isManagement: true },
      { id: "sw-m3", name: "Richard Coleman", role: "Board President", isManagement: true },
      { id: "sw-m4", name: "Danita Osborn", role: "Membership / Real Estate", isManagement: true },
    ],
    residents: [
      { id: "sw-r1", name: "Lauren Hayes", role: "Golf Member", isManagement: false },
      { id: "sw-r2", name: "David Chen", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `sw-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "heron-creek",
    name: "Heron Creek Golf & Country Club",
    location: "North Port, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityHeronCreek,
    primaryColor: "#1a4a3a",
    appDisplayName: "Heron Creek",
    management: [
      { id: "hc-m1", name: "Marcus Hale", role: "General Manager", isManagement: true },
      { id: "hc-m2", name: "Richelle Harris", role: "Membership / Communications", isManagement: true },
      { id: "hc-m3", name: "Alan Briggs", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "hc-r1", name: "Megan Torres", role: "Golf Member", isManagement: false },
      { id: "hc-r2", name: "Ryan Patel", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `hc-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "debary",
    name: "DeBary Golf & Country Club",
    location: "DeBary, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityDebary,
    primaryColor: "#1a4a3a",
    appDisplayName: "DeBary",
    management: [
      { id: "db-m1", name: "Dan Flood", role: "General Manager", isManagement: true },
      { id: "db-m2", name: "Dan Flood", role: "Membership / Communications", isManagement: true },
      { id: "db-m3", name: "Patricia Owens", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "db-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "db-r2", name: "Casey Nguyen", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `db-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "jacaranda",
    name: "Jacaranda Golf Club",
    location: "Plantation, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityJacaranda,
    primaryColor: "#1a4a3a",
    appDisplayName: "Jacaranda",
    management: [
      { id: "jc-m1", name: "Andrew Michael", role: "General Manager", isManagement: true },
      { id: "jc-m2", name: "Andrew Michael", role: "Membership / Communications", isManagement: true },
      { id: "jc-m3", name: "Kathy Gazda", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "jc-r1", name: "Alex Rivera", role: "Golf Member", isManagement: false },
      { id: "jc-r2", name: "Sam Ortiz", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `jc-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "the-dunes",
    name: "The Dunes Golf & Tennis Club",
    location: "Sanibel, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityTheDunes,
    primaryColor: "#1a4a3a",
    appDisplayName: "The Dunes",
    management: [
      { id: "td-m1", name: "Dana Swanson", role: "General Manager", isManagement: true },
      { id: "td-m2", name: "Dana Swanson", role: "Membership / Communications", isManagement: true },
      { id: "td-m3", name: "Chris Adler", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "td-r1", name: "Taylor Quinn", role: "Golf Member", isManagement: false },
      { id: "td-r2", name: "Morgan Ellis", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `td-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "martin-downs",
    name: "Martin Downs Golf Club",
    location: "Palm City, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityMartinDowns,
    primaryColor: "#1a4a3a",
    appDisplayName: "Martin Downs",
    management: [
      { id: "md-m1", name: "Jamie Reed", role: "General Manager", isManagement: true },
      { id: "md-m2", name: "Jamie Reed", role: "Membership / Communications", isManagement: true },
      { id: "md-m3", name: "Robin Castillo", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "md-r1", name: "Cameron Walsh", role: "Golf Member", isManagement: false },
      { id: "md-r2", name: "Avery Brooks", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `md-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "the-nest",
    name: "The Nest Golf Club",
    location: "Bonita Springs, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityTheNest,
    primaryColor: "#1a4a3a",
    appDisplayName: "The Nest",
    management: [
      { id: "tn-m1", name: "AJ Szymanski", role: "Director of Membership Sales", isManagement: true },
      { id: "tn-m2", name: "AJ Szymanski", role: "Membership / Communications", isManagement: true },
      { id: "tn-m3", name: "Jordan Hale", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "tn-r1", name: "Blake Avery", role: "Golf Member", isManagement: false },
      { id: "tn-r2", name: "Riley Santos", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `tn-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "seagate",
    name: "Seagate Country Club",
    location: "Delray Beach, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communitySeagate,
    primaryColor: "#1a4a3a",
    appDisplayName: "Seagate",
    management: [
      { id: "sg-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "sg-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "sg-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "sg-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "sg-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `sg-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "copperleaf",
    name: "Copperleaf Golf Club",
    location: "Bonita Springs, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#8B4513] to-[#1b4332]",
    logoUrl: brandAssets.communityCopperleaf,
    primaryColor: "#1b4332",
    appDisplayName: "Copperleaf",
    management: [
      { id: "cl-m1", name: "Chris Coleman", role: "General Manager", isManagement: true },
      { id: "cl-m2", name: "Chris Coleman", role: "Membership / Communications", isManagement: true },
      { id: "cl-m3", name: "Jordan Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "cl-r1", name: "Morgan Blake", role: "Golf Member", isManagement: false },
      { id: "cl-r2", name: "Taylor Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `cl-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "worthington",
    name: "Worthington Country Club",
    location: "Bonita Springs, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityWorthington,
    primaryColor: "#1a4a3a",
    appDisplayName: "Worthington",
    management: [
      { id: "wo-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "wo-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "wo-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "wo-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "wo-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `wo-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "club-renaissance",
    name: "Club Renaissance Golf Club",
    location: "Sun City Center, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityClubRenaissance,
    primaryColor: "#1a4a3a",
    appDisplayName: "Club Renaissance",
    management: [
      { id: "cr-m1", name: "Alexis Macon", role: "Membership Sales", isManagement: true },
      { id: "cr-m2", name: "Alexis Macon", role: "Membership / Communications", isManagement: true },
      { id: "cr-m3", name: "Drew Hoffman", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "cr-r1", name: "Sam Parker", role: "Golf Member", isManagement: false },
      { id: "cr-r2", name: "Riley Chen", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `cr-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "falls-club",
    name: "The Falls Club of the Palm Beaches",
    location: "Lake Worth, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communityFallsClub,
    primaryColor: "#1a4a3a",
    appDisplayName: "The Falls Club",
    management: [
      { id: "fc-m1", name: "Jamie Reed", role: "General Manager", isManagement: true },
      { id: "fc-m2", name: "Jamie Reed", role: "Membership / Communications", isManagement: true },
      { id: "fc-m3", name: "Robin Castillo", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "fc-r1", name: "Cameron Walsh", role: "Golf Member", isManagement: false },
      { id: "fc-r2", name: "Avery Brooks", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `fc-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "estero",
    name: "Estero Country Club",
    location: "Estero, FL",
    residentCount: 920,
    serviceCount: 2,
    activityCount: 12,
    coverColor: "from-[#1b4332] to-[#95d5b2]",
    logoUrl: brandAssets.communityEstero,
    primaryColor: "#1b4332",
    appDisplayName: "Estero CC",
    management: [
      { id: "ec-m1", name: "Jamie Reed", role: "General Manager", isManagement: true },
      { id: "ec-m2", name: "Jamie Reed", role: "Membership / Communications", isManagement: true },
      { id: "ec-m3", name: "Robin Castillo", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "ec-r1", name: "Cameron Walsh", role: "Golf Member", isManagement: false },
      { id: "ec-r2", name: "Avery Brooks", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `ec-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "wildcat-run",
    name: "Wildcat Run Golf & Country Club",
    location: "Estero, FL",
    residentCount: 980,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1a365d] to-[#c9a227]",
    logoUrl: brandAssets.communityWildcatRun,
    primaryColor: "#1a365d",
    appDisplayName: "Wildcat Run",
    management: [
      { id: "wr-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "wr-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "wr-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "wr-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "wr-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `wr-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "highland-woods",
    name: "Highland Woods Golf & Country Club",
    location: "Bonita Springs, FL",
    residentCount: 799,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1b4332] to-[#95d5b2]",
    logoUrl: brandAssets.communityHighlandWoods,
    primaryColor: "#1b4332",
    appDisplayName: "Highland Woods",
    management: [
      { id: "hw-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "hw-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "hw-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "hw-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "hw-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `hw-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "bonita-national",
    name: "Bonita National Golf & Country Club",
    location: "Bonita Springs, FL",
    residentCount: 1240,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#1a4d2e] to-[#c9a227]",
    logoUrl: brandAssets.communityBonitaNational,
    primaryColor: "#1a4d2e",
    appDisplayName: "Bonita National",
    management: [
      { id: "bn-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "bn-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "bn-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "bn-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "bn-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `bn-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "windsor",
    name: "The Windsor Club",
    location: "Vero Beach, FL",
    residentCount: 350,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#0c2340] to-[#c5a572]",
    logoUrl: brandAssets.communityWindsor,
    primaryColor: "#0c2340",
    appDisplayName: "Windsor Club",
    management: [
      { id: "wi-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "wi-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "wi-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "wi-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "wi-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `wi-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "carrollwood",
    name: "Carrollwood Country Club",
    location: "Tampa, FL",
    residentCount: 1420,
    serviceCount: 2,
    activityCount: 14,
    coverColor: "from-[#0d3b66] to-[#c5a028]",
    logoUrl: brandAssets.communityCarrollwood,
    primaryColor: "#0d3b66",
    appDisplayName: "Carrollwood CC",
    management: [
      { id: "cw-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "cw-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "cw-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "cw-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "cw-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `cw-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "spanish-wells",
    name: "Spanish Wells Golf & Country Club",
    location: "Bonita Springs, FL",
    residentCount: 1200,
    serviceCount: 2,
    activityCount: 16,
    coverColor: "from-[#1a4a3a] to-[#7eb8a0]",
    logoUrl: brandAssets.communitySpanishWells,
    primaryColor: "#1a4a3a",
    appDisplayName: "Spanish Wells",
    management: [
      { id: "sp-m1", name: "Alex Morgan", role: "General Manager", isManagement: true },
      { id: "sp-m2", name: "Alex Morgan", role: "Membership / Communications", isManagement: true },
      { id: "sp-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "sp-r1", name: "Jordan Blake", role: "Golf Member", isManagement: false },
      { id: "sp-r2", name: "Casey Wells", role: "Social Member", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `sp-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "alliant",
    name: "Alliant Association Management",
    location: "Fort Myers, FL",
    residentCount: 2400,
    serviceCount: 4,
    activityCount: 8,
    coverColor: "from-[#1e3a5f] to-[#4a90c8]",
    logoUrl: brandAssets.communityAlliant,
    primaryColor: "#1e3a5f",
    appDisplayName: "Alliant",
    management: [
      { id: "al-m1", name: "Alex Morgan", role: "Property Manager", isManagement: true },
      { id: "al-m2", name: "Alex Morgan", role: "Association Manager", isManagement: true },
      { id: "al-m3", name: "Pat Rivera", role: "Board President", isManagement: true },
    ],
    residents: [
      { id: "al-r1", name: "Jordan Blake", role: "Resident", isManagement: false },
      { id: "al-r2", name: "Casey Wells", role: "Resident", isManagement: false },
      ...makeResidents(48).map((r, i) => ({ ...r, id: `al-rx-${i}` })),
    ],
    providers: [],
  },
  {
    id: "oceanside-residents",
    name: "The Plaza at Oceanside",
    location: "1 North Ocean Blvd, Pompano Beach, FL 33062",
    residentCount: 108,
    serviceCount: 0,
    activityCount: 0,
    coverColor: "from-cyan-500 to-blue-600",
    logoUrl: brandAssets.communityOceanside,
    primaryColor: "#0891b2",
    appDisplayName: "The Plaza at Oceanside",
    customDomain: "oceansideresidents.com",
    management: [
      { id: "or-m1", name: "Dugald Yska", role: "Board", isManagement: true },
      { id: "or-m2", name: "Ralph Grittani", role: "Board", isManagement: true },
      { id: "or-m3", name: "Robert DiColo", role: "Board", isManagement: true },
      { id: "or-m4", name: "Piero Carbone", role: "Board", isManagement: true },
    ],
    residents: [],
    providers: [],
  },
];

export function getCommunity(id: string) {
  return communities.find((c) => c.id === id);
}

/** Figma Service Booking List View (4616:14330) — Golden Ocala / default demo. */
const sampleBookings: ServiceBooking[] = [
  {
    id: "sb1",
    resident: "Mike Smith",
    provider: "Cassie's Meticulous Touch",
    service: "Full House Cleaning, Carpet Cleaning",
    date: "2026-07-08",
    time: "10:00 AM",
    status: "pending",
    amount: 250,
  },
  {
    id: "sb2",
    resident: "Tom Jones",
    provider: "Cassie's Meticulous Touch",
    service: "Full House Cleaning",
    date: "2026-07-08",
    time: "1:00 PM",
    status: "accepted",
    amount: 250,
  },
  {
    id: "sb3",
    resident: "Bill Reilly",
    provider: "Cassie's Meticulous Touch",
    service: "Carpet Cleaning",
    date: "2026-07-10",
    time: "4:00 PM",
    status: "accepted",
    amount: 150,
  },
  {
    id: "sb4",
    resident: "Frank Diller",
    provider: "Cassie's Meticulous Touch",
    service: "Full House Cleaning, Carpet Cleaning",
    date: "2026-07-15",
    time: "4:00 PM",
    status: "accepted",
    amount: 350,
  },
  {
    id: "sb5",
    resident: "Laura Bennett",
    provider: "Cassie's Meticulous Touch",
    service: "Carpet Cleaning",
    date: "2026-07-22",
    time: "12:00 PM",
    status: "cancelled",
    amount: 150,
  },
  {
    id: "sb6",
    resident: "Jud Thomas",
    provider: "Cassie's Meticulous Touch",
    service: "Carpet Cleaning",
    date: "2026-08-05",
    time: "12:00 PM",
    status: "accepted",
    amount: 150,
  },
  {
    id: "sb7",
    resident: "Mike Wright",
    provider: "Cassie's Meticulous Touch",
    service: "Full House Cleaning",
    date: "2026-08-12",
    time: "9:00 AM",
    status: "accepted",
    amount: 250,
  },
  {
    id: "sb8",
    resident: "Sarah Mitchell",
    provider: "Cassie's Meticulous Touch",
    service: "Carpet Cleaning",
    date: "2026-08-19",
    time: "10:00 AM",
    status: "pending",
    amount: 150,
  },
  {
    id: "sb9",
    resident: "Greg Sherman",
    provider: "Greenscape Lawn Care",
    service: "Lawn Mowing",
    date: "2026-07-27",
    time: "8:00 AM",
    status: "accepted",
    amount: 65,
  },
  {
    id: "sb10",
    resident: "Brendan Dawson",
    provider: "AquaFit Swim Lessons",
    service: "Private Lesson",
    date: "2026-08-18",
    time: "4:30 PM",
    status: "completed",
    amount: 45,
  },
  // Figma Activity Booking List (5687:15225) — Court # / Going #
  {
    id: "sb-court-1",
    resident: "Mike Smith",
    provider: "Cassie's Meticulous Touch",
    service: "Court 2",
    date: "2026-07-08",
    time: "10:00 AM",
    endTime: "12:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 1,
  },
  {
    id: "sb-court-2",
    resident: "Tom Jones",
    provider: "Cassie's Meticulous Touch",
    service: "Court 3",
    date: "2026-07-10",
    time: "1:00 PM",
    endTime: "2:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 3,
  },
  {
    id: "sb-court-3",
    resident: "Bill Reilly",
    provider: "Cassie's Meticulous Touch",
    service: "Court 1",
    date: "2026-08-05",
    time: "5:00 PM",
    endTime: "7:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 4,
  },
  {
    id: "sb-court-4",
    resident: "Laura Bennett",
    provider: "Cassie's Meticulous Touch",
    service: "Court 5",
    date: "2026-08-12",
    time: "9:00 AM",
    endTime: "10:00 AM",
    status: "cancelled",
    amount: 0,
    goingCount: 2,
  },
];

/** Iron Lake / IronCrest admin bookings — July & August 2026, local vendors. */
const ironLakeBookings: ServiceBooking[] = [
  {
    id: "il-sb1",
    resident: "Caroline Whitmore",
    provider: "Iron Crest Lawn & Landscape",
    service: "Weekly Lawn Care + Irrigation Check",
    date: "2026-07-08",
    time: "8:00 AM",
    status: "pending",
    amount: 95,
  },
  {
    id: "il-sb2",
    resident: "David Chen",
    provider: "Canopy Clean Co.",
    service: "Full House Cleaning",
    date: "2026-07-10",
    time: "10:00 AM",
    status: "accepted",
    amount: 250,
  },
  {
    id: "il-sb3",
    resident: "Elena Vargas",
    provider: "Quarry Pool & Aquatic",
    service: "Pool Chemistry & Cleaning",
    date: "2026-07-15",
    time: "9:00 AM",
    status: "accepted",
    amount: 120,
  },
  {
    id: "il-sb4",
    resident: "Marcus Hale",
    provider: "Ocala Climate HVAC",
    service: "AC Service + Filter Change",
    date: "2026-07-22",
    time: "1:00 PM",
    status: "accepted",
    amount: 185,
  },
  {
    id: "il-sb5",
    resident: "Sophia Langford",
    provider: "Canopy Clean Co.",
    service: "Move-in Deep Clean",
    date: "2026-07-29",
    time: "11:00 AM",
    status: "cancelled",
    amount: 320,
  },
  {
    id: "il-sb6",
    resident: "Caroline Whitmore",
    provider: "Iron Crest Lawn & Landscape",
    service: "Hedge Trimming",
    date: "2026-08-05",
    time: "8:30 AM",
    status: "accepted",
    amount: 140,
  },
  {
    id: "il-sb7",
    resident: "David Chen",
    provider: "Quarry Pool & Aquatic",
    service: "Seasonal Pool Opening",
    date: "2026-08-12",
    time: "10:00 AM",
    status: "accepted",
    amount: 175,
  },
  {
    id: "il-sb8",
    resident: "Elena Vargas",
    provider: "Canopy Clean Co.",
    service: "Carpet Cleaning",
    date: "2026-08-19",
    time: "2:00 PM",
    status: "pending",
    amount: 150,
  },
  {
    id: "il-sb9",
    resident: "Marcus Hale",
    provider: "Iron Crest Lawn & Landscape",
    service: "Lawn Mowing",
    date: "2026-08-22",
    time: "7:30 AM",
    status: "accepted",
    amount: 65,
  },
  {
    id: "il-sb10",
    resident: "Sophia Langford",
    provider: "Ocala Climate HVAC",
    service: "Emergency Cooling Repair",
    date: "2026-08-26",
    time: "3:00 PM",
    status: "completed",
    amount: 240,
  },
  {
    id: "il-din-1",
    resident: "Caroline Whitmore",
    provider: "Clubhouse Dining",
    service: "Clubhouse Dinner for Two",
    date: "2026-07-22",
    time: "6:30 PM",
    endTime: "8:00 PM",
    status: "pending",
    amount: 85,
    goingCount: 2,
  },
  {
    id: "il-din-2",
    resident: "Elena Vargas",
    provider: "Clubhouse Dining",
    service: "Terrace Lunch Package",
    date: "2026-07-24",
    time: "12:00 PM",
    endTime: "1:30 PM",
    status: "accepted",
    amount: 160,
    goingCount: 4,
  },
  {
    id: "il-din-3",
    resident: "Marcus Hale",
    provider: "Clubhouse Dining",
    service: "Wine Pairing Dinner",
    date: "2026-07-26",
    time: "7:00 PM",
    endTime: "9:00 PM",
    status: "accepted",
    amount: 145,
    goingCount: 2,
  },
  {
    id: "il-din-4",
    resident: "David Chen",
    provider: "Clubhouse Dining",
    service: "Private Dining — Quarry Room",
    date: "2026-08-02",
    time: "6:00 PM",
    endTime: "9:00 PM",
    status: "accepted",
    amount: 650,
    goingCount: 12,
  },
  {
    id: "il-din-5",
    resident: "Sophia Langford",
    provider: "Clubhouse Dining",
    service: "Saturday Brunch Service",
    date: "2026-08-09",
    time: "11:00 AM",
    endTime: "12:30 PM",
    status: "pending",
    amount: 45,
    goingCount: 3,
  },
  {
    id: "il-din-6",
    resident: "Caroline Whitmore",
    provider: "Clubhouse Dining",
    service: "Member Mixer — Appetizers",
    date: "2026-07-12",
    time: "5:30 PM",
    endTime: "7:00 PM",
    status: "completed",
    amount: 380,
    goingCount: 18,
  },
  {
    id: "il-court-1",
    resident: "Caroline Whitmore",
    provider: "Alex Rivera",
    service: "Court 2",
    date: "2026-07-09",
    time: "10:00 AM",
    endTime: "12:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 1,
  },
  {
    id: "il-court-2",
    resident: "Marcus Hale",
    provider: "Alex Rivera",
    service: "Court 3",
    date: "2026-07-16",
    time: "1:00 PM",
    endTime: "2:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 3,
  },
  {
    id: "il-court-3",
    resident: "David Chen",
    provider: "Jordan Blake",
    service: "Court 1",
    date: "2026-08-06",
    time: "5:00 PM",
    endTime: "7:00 PM",
    status: "accepted",
    amount: 0,
    goingCount: 4,
  },
  {
    id: "il-court-4",
    resident: "Elena Vargas",
    provider: "Alex Rivera",
    service: "Court 5",
    date: "2026-08-20",
    time: "9:00 AM",
    endTime: "10:00 AM",
    status: "cancelled",
    amount: 0,
    goingCount: 2,
  },
];

function remapDemoBooking(communityId: string, booking: ServiceBooking): ServiceBooking {
  return {
    ...booking,
    id: `${communityId}-${booking.id}`,
    resident: /sarah\s+mitchell/i.test(booking.resident) ? "Member" : booking.resident,
    provider: /cassie/i.test(booking.provider) ? "Club Services" : booking.provider,
    service: booking.service.replace(/Cassie'?s Meticulous Touch/gi, "Club Services"),
  };
}

/** Per-club mutable copies so remapped demos don't share Golden Ocala seed state. */
const remappedBookingStore = new Map<string, ServiceBooking[]>();

function bookingsForCommunity(id: string): ServiceBooking[] {
  if (id === "iron-lake") return ironLakeBookings;
  if (id === "golden-ocala") return sampleBookings;
  if (
    !id ||
    id === "__missing_community__" ||
    id === "spanish-wells" ||
    id === "harbor-pointe" ||
    id === "willow-creek" ||
    id === "alliant" ||
    id === "oceanside-residents"
  ) {
    return [];
  }
  let list = remappedBookingStore.get(id);
  if (!list) {
    list = sampleBookings.map((b) => remapDemoBooking(id, b));
    remappedBookingStore.set(id, list);
  }
  return list;
}

/** Resolve a booking row in its own community store (never mutate shared GO seed for remaps). */
function underlyingBooking(id: string): ServiceBooking | undefined {
  const direct =
    sampleBookings.find((b) => b.id === id) ??
    ironLakeBookings.find((b) => b.id === id);
  if (direct) return direct;

  for (const list of remappedBookingStore.values()) {
    const hit = list.find((b) => b.id === id);
    if (hit) return hit;
  }

  for (const b of sampleBookings) {
    const suffix = `-${b.id}`;
    if (id.endsWith(suffix) && id.length > suffix.length) {
      const communityId = id.slice(0, -suffix.length);
      return bookingsForCommunity(communityId).find((row) => row.id === id);
    }
  }
  for (const b of ironLakeBookings) {
    const suffix = `-${b.id}`;
    if (id.endsWith(suffix) && id.length > suffix.length) {
      return { ...b, id };
    }
  }
  return undefined;
}

function bookingViewForId(id: string): ServiceBooking | undefined {
  return underlyingBooking(id);
}

export function getCommunityBookings(id: string): ServiceBooking[] {
  const rows = bookingsForCommunity(id);
  const today = new Date().toISOString().slice(0, 10);
  const needsShift = rows.some(
    (b) => b.status !== "cancelled" && b.status !== "completed" && b.date < today,
  );
  if (!needsShift) return rows;

  // Keep demo bookings upcoming. Put the first approved visit on today so gate /
  // front desk can admit that provider without calling the member.
  let nextDay = 1;
  let placedApprovedToday = false;
  return rows.map((b) => {
    if (b.status === "cancelled" || b.status === "completed") {
      return { ...b, date: easternDateOffset(30) };
    }
    if (
      !placedApprovedToday &&
      (b.status === "accepted" || b.status === "upcoming")
    ) {
      placedApprovedToday = true;
      return { ...b, date: easternDateOffset(0) };
    }
    const date = easternDateOffset(nextDay);
    nextDay += 1;
    return { ...b, date };
  });
}

export function addCommunityBooking(
  booking: Omit<ServiceBooking, "id"> & { id?: string; communityId?: string },
): ServiceBooking {
  const row: ServiceBooking = {
    id: booking.id ?? `sb-${Date.now()}`,
    resident: booking.resident,
    provider: booking.provider,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    endTime: booking.endTime,
    status: booking.status,
    amount: booking.amount,
    goingCount: booking.goingCount,
  };
  const list = bookingsForCommunity(booking.communityId?.trim() || "__missing_community__");
  list.unshift(row);
  return row;
}

export function updateCommunityBookingStatus(
  id: string,
  status: ServiceBooking["status"],
): ServiceBooking | null {
  const row = underlyingBooking(id);
  if (!row) return null;
  row.status = status;
  return row;
}

/**
 * Update status only when the booking is assigned to `providerName`.
 * Callers that update-then-check leave rival providers' cancels/completions
 * persisted even when they return 404 — always authorize before mutating.
 */
export function updateCommunityBookingStatusForProvider(
  id: string,
  status: ServiceBooking["status"],
  providerName: string,
): ServiceBooking | null {
  const row = underlyingBooking(id);
  if (!row || row.provider !== providerName) return null;
  row.status = status;
  return row;
}

export function getCommunityBookingById(id: string): ServiceBooking | undefined {
  return bookingViewForId(id);
}

/** Demo provider inbox target — never leak IronCrest/Cassie emails on remapped rows. */
export function providerEmailForBooking(booking: ServiceBooking): string | undefined {
  if (/cassie/i.test(booking.provider)) return "cassiesmeticuloustouch@gmail.com";
  if (/club services/i.test(booking.provider)) return undefined;
  if (/greenscape|lawn/i.test(booking.provider) && booking.id.startsWith("il-")) {
    return "lawn@ironcrest.services";
  }
  return undefined;
}

export const userEngagement: AnalyticsPoint[] = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 55 },
  { label: "Mar", value: 48 },
  { label: "Apr", value: 67 },
  { label: "May", value: 74 },
  { label: "Jun", value: 82 },
];

export const tabUsage = {
  serviceBooking: 64,
  mapViews: 36,
};

export const superAdmin = {
  name: "Easy Life Admin",
  email: "superadmin@gmail.com",
};
