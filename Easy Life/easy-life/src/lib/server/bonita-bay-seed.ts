import { brandAssets, imageForProviderCategory } from "@/lib/brand-assets";
import {
  defaultDailyHours,
  formatHoursSummary,
  type WeeklyHours,
} from "@/lib/hours";
import { isDemoSeedAllowed } from "@/lib/server/demo-mode";
import { ensureMembershipTiersSeeded } from "@/lib/server/membership";
import { hashPassword } from "@/lib/server/password";
import { prisma } from "@/lib/server/prisma";
import { easternDateOffset } from "@/lib/weather";

/**
 * Bonita Bay Club — Bonita Springs, FL demo tenant.
 * 26660 Country Club Drive, Bonita Springs, FL 34134 · (239) 495-0200 · bbcinfo@bonitabayclub.net
 * Five championship courses (90 holes), 16 Har-Tru, 15 pickleball, croquet, Fitness, Spa & Salon.
 * Dining: Breezeway Bar & Café, Wave Café, 55th Hole & Clubroom · https://bonitabayclub.blog/
 */
export const BONITA_BAY_COMMUNITY_ID = "bonita-bay";
const MEMBER_EMAIL = "member.demo@bonitabayclub.net";
const MEMBER_NAME = "Claire Montgomery";
const SOCIAL_EMAIL = "member.social@bonitabayclub.net";
const SOCIAL_NAME = "Robert Hale";
const PM_EMAIL = "pm.demo@bonitabayclub.net";
const PM_NAME = "Elena Vargas";
const BOARD_EMAIL = "board.demo@bonitabayclub.net";
const BOARD_NAME = "James Whitfield";
const CLUB_PHONE = "(239) 495-0200";
const CLUB_INFO_EMAIL = "bbcinfo@bonitabayclub.net";
const DINING_EMAIL = "dining@bonitabayclub.net";
const CLUB_ADDRESS = "26660 Country Club Drive, Bonita Springs, FL 34134";
const CLUB_BLOG_URL = "https://bonitabayclub.blog/";

const golfHours = defaultDailyHours("07:00", "18:30");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const clubhouseHours = defaultDailyHours("09:00", "21:00");

/** Breezeway Bar & Café — Sports Center open-air dining. */
const breezewayHours = defaultDailyHours("10:00", "18:00");

/** 55th Hole & Clubroom — lunch buffet and holiday dining. */
const mainDiningHours: WeeklyHours = {
  mon: { open: "11:00", close: "15:00" },
  tue: { open: "11:00", close: "15:00" },
  wed: { open: "11:00", close: "15:00" },
  thu: { open: "11:00", close: "21:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "10:00", close: "15:00" },
};

/** Wave Café — Lifestyle Center healthy grab-and-go. */
const waveCafeHours = defaultDailyHours("07:00", "16:00");

type AmenitySeed = {
  id: string;
  name: string;
  description: string;
  kind: string;
  unitCount: number;
  holes: number | null;
  fee?: number;
  surface?: string;
  hoursJson: WeeklyHours;
};

const amenities: AmenitySeed[] = [
  {
    id: "bb-amenity-golf-marsh",
    name: "Marsh Course",
    description:
      "Arthur Hills design — rolling marshland views and strategic bunkering. One of five championship courses totaling 90 holes at Bonita Bay Club.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-golf-creekside",
    name: "Creekside Course",
    description:
      "Arthur Hills layout along natural creeks and mature oaks. Member tee times open daily through the Bonita Bay golf shop.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-golf-bay-island",
    name: "Bay Island Course",
    description:
      "Arthur Hills signature course with island greens and water carries — the most photographed layout on property.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-golf-sabal",
    name: "Sabal Course",
    description:
      "Tom Fazio design featuring wide fairways and dramatic elevation changes through native sabal palms.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-golf-cypress",
    name: "Cypress Course",
    description:
      "Tom Fazio championship layout winding through cypress preserves — strong finishing stretch and member-favorite conditioning.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-range",
    name: "Practice Range & Short Game",
    description:
      "Full driving range, chipping greens, and putting complex serving all five courses. PGA instruction available daily.",
    kind: "driving_range",
    unitCount: 24,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "bb-amenity-tennis",
    name: "Har-Tru Tennis Courts",
    description:
      "Sixteen Har-Tru green-clay courts with professional staff, leagues, and private lessons. Surface maintained daily.",
    kind: "court",
    unitCount: 16,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "bb-amenity-pickleball",
    name: "Pickleball Courts",
    description:
      "Fifteen dedicated pickleball courts — open play, ladders, clinics, and social round-robins throughout the week.",
    kind: "court",
    unitCount: 15,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "bb-amenity-croquet",
    name: "Championship Croquet Lawn",
    description:
      "Regulation championship croquet lawn for league play, tournaments, and social wickets with the Croquet Society.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    surface: "croquet",
    hoursJson: racquetHours,
  },
  {
    id: "bb-amenity-sports-pool",
    name: "Sports Center Pool",
    description:
      "Resort-style pool at the Sports Center with lap lanes, sun deck, and the Breezeway Bar & Café for open-air dining.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "bb-amenity-lifestyle-fitness",
    name: "Fitness",
    description:
      "Lifestyle Center fitness — cardio, strength, group classes, and personal training for Bonita Bay members.",
    kind: "gym",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "bb-amenity-lifestyle-spa",
    name: "Spa & Salon",
    description:
      "Full-service spa and salon at the Lifestyle Center — massage, facials, recovery, and salon services.",
    kind: "facility",
    unitCount: 6,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "bb-amenity-main-dining",
    name: "55th Hole & Clubroom",
    description:
      "Overlooking the course — daily lunch buffet, à la carte menu, and memorable Sunday and holiday dining.",
    kind: "restaurant",
    unitCount: 20,
    holes: null,
    hoursJson: mainDiningHours,
  },
  {
    id: "bb-amenity-breezeway",
    name: "Breezeway Bar & Café",
    description:
      "Sports Center favorite for open-air dining — frozen cocktails, paninis, seafood baskets, and salads after a match or by the pool.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: breezewayHours,
  },
  {
    id: "bb-amenity-lifestyle-cafe",
    name: "Wave Café",
    description:
      "Lifestyle Center café — organic juices, smoothies, and customizable wraps, bowls, and salads for healthy meals on the go.",
    kind: "restaurant",
    unitCount: 10,
    holes: null,
    hoursJson: waveCafeHours,
  },
  {
    id: "bb-amenity-sports-center",
    name: "Sports Center",
    description:
      "Sixteen Har-Tru tennis courts, fifteen pickleball courts, championship croquet lawn, pool, and Breezeway Bar & Café.",
    kind: "event_space",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
  {
    id: "bb-amenity-lifestyle-center",
    name: "Lifestyle Center",
    description:
      "Fitness, Spa & Salon, and Wave Café — wellness programming for the full Bonita Bay membership.",
    kind: "event_space",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const RETIRED_BB_AMENITY_IDS = [
  "bb-amenity-grill",
  "bb-amenity-cabana",
  "bb-amenity-naples-dining",
] as const;

const staff = [
  {
    id: "bb-staff-frederick",
    name: "Frederick Fung",
    title: "General Manager",
    department: "Club Management",
    email: "frederick.fung@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "bb-staff-elena",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "bb-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "bb-staff-michael",
    name: "Michael Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "bb-staff-laura",
    name: "Laura Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "laura.chen@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "bb-staff-david",
    name: "David Okonkwo",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "david.okonkwo@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "bb-staff-sophia",
    name: "Sophia Reyes",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "sophia.reyes@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "bb-staff-ethan",
    name: "Ethan Brooks",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "ethan.brooks@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "bb-staff-megan",
    name: "Megan Walsh",
    title: "Pickleball Director",
    department: "Pickleball",
    email: "megan.walsh@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 22,
  },
  {
    id: "bb-staff-oliver",
    name: "Oliver Grant",
    title: "Croquet & Racquets Coordinator",
    department: "Sports Center",
    email: "oliver.grant@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 23,
  },
  {
    id: "bb-staff-fitness",
    name: "Lifestyle Center Fitness Desk",
    title: "Personal Training & Group Classes",
    department: "Fitness",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 30,
  },
  {
    id: "bb-staff-dining",
    name: "Dining Reservations",
    title: "Breezeway · Wave Café · 55th Hole & Clubroom",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "bb-staff-info",
    name: "Club Information",
    title: "Member Services",
    department: "Front Desk",
    email: CLUB_INFO_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 32,
  },
  {
    id: "bb-staff-realtor",
    name: "Patricia Nolan",
    title: "Broker · Bonita Bay Realty",
    department: "Real Estate",
    email: "patricia.nolan@bonitabayclub.net",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "bb-pro-michael",
    name: "Michael Torres",
    email: "golf@bonitabayclub.net",
    category: "golf",
    description:
      "Director of Golf. Instruction across all five championship courses — Marsh, Creekside, Bay Island, Sabal, and Cypress.",
  },
  {
    id: "bb-pro-laura",
    name: "Laura Chen",
    email: "laura.chen@bonitabayclub.net",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on the practice range.",
  },
  {
    id: "bb-pro-sophia",
    name: "Sophia Reyes",
    email: "sophia.reyes@bonitabayclub.net",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on sixteen Har-Tru green clay courts.",
  },
  {
    id: "bb-pro-ethan",
    name: "Ethan Brooks",
    email: "ethan.brooks@bonitabayclub.net",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Doubles strategy, junior development, and match-play coaching.",
  },
  {
    id: "bb-pro-megan",
    name: "Megan Walsh",
    email: "megan.walsh@bonitabayclub.net",
    category: "pickleball",
    description:
      "Pickleball Director. Lessons and ladder play across fifteen dedicated courts at the Sports Center.",
  },
  {
    id: "bb-pro-oliver",
    name: "Oliver Grant",
    email: "oliver.grant@bonitabayclub.net",
    category: "pickleball",
    description:
      "Croquet & Racquets Coordinator. Croquet wickets clinics and introductory pickleball sessions.",
  },
] as const;

/** Breezeway Bar & Café, Wave Café, and 55th Hole & Clubroom menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "bb-menu-b-panini", name: "Breezeway Panini", price: 15, category: "Breezeway · Sandwiches" },
  { id: "bb-menu-b-seafood", name: "Seafood Basket", price: 18, category: "Breezeway · Favorites" },
  { id: "bb-menu-b-salad", name: "Sports Center Salad", price: 14, category: "Breezeway · Salads" },
  { id: "bb-menu-b-frozen", name: "Frozen Cocktail", price: 12, category: "Breezeway · Bar" },
  { id: "bb-menu-b-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Breezeway · Beverages" },
  { id: "bb-menu-w-juice", name: "Organic Green Juice", price: 9, category: "Wave Café · Juices" },
  { id: "bb-menu-w-smoothie", name: "Berry Protein Smoothie", price: 10, category: "Wave Café · Smoothies" },
  { id: "bb-menu-w-wrap", name: "Customizable Wrap", price: 13, category: "Wave Café · Lunch" },
  { id: "bb-menu-w-bowl", name: "Build-Your-Own Bowl", price: 14, category: "Wave Café · Lunch" },
  { id: "bb-menu-w-salad", name: "Wave Café Salad", price: 12, category: "Wave Café · Salads" },
  { id: "bb-menu-c-buffet", name: "Daily Lunch Buffet", price: 22, category: "55th Hole & Clubroom · Lunch" },
  { id: "bb-menu-c-burger", name: "Clubroom Burger", price: 17, category: "55th Hole & Clubroom · À la carte" },
  { id: "bb-menu-c-fish", name: "Gulf Grouper Sandwich", price: 19, category: "55th Hole & Clubroom · À la carte" },
  { id: "bb-menu-c-sunday", name: "Sunday Brunch Plate", price: 28, category: "55th Hole & Clubroom · Sunday" },
  { id: "bb-menu-c-holiday", name: "Holiday Dining Special", price: 45, category: "55th Hole & Clubroom · Holidays" },
];

async function seedAmenities() {
  for (const id of RETIRED_BB_AMENITY_IDS) {
    await prisma.amenity.deleteMany({ where: { id, communityId: BONITA_BAY_COMMUNITY_ID } });
  }
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        name: amenity.name,
        description: amenity.description,
        kind: amenity.kind,
        unitCount: amenity.unitCount,
        holes: amenity.holes,
        fee: amenity.fee ?? 0,
        surface: amenity.surface ?? null,
        hoursJson: JSON.stringify(amenity.hoursJson),
        schedule,
      },
      update: {
        name: amenity.name,
        description: amenity.description,
        kind: amenity.kind,
        unitCount: amenity.unitCount,
        holes: amenity.holes,
        fee: amenity.fee ?? 0,
        surface: amenity.surface ?? null,
        hoursJson: JSON.stringify(amenity.hoursJson),
        schedule,
      },
    });
  }
}

async function seedStaffAndPros() {
  for (const row of staff) {
    await prisma.clubStaff.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        name: row.name,
        title: row.title,
        department: row.department,
        email: row.email,
        phone: row.phone,
        category: row.category,
        sortOrder: row.sortOrder,
      },
      update: {
        name: row.name,
        title: row.title,
        department: row.department,
        email: row.email,
        phone: row.phone,
        category: row.category,
        sortOrder: row.sortOrder,
        active: true,
      },
    });
  }

  for (const pro of lessonPros) {
    const imageCategory =
      pro.category === "golf"
        ? "Golf"
        : pro.category === "tennis"
          ? "Tennis"
          : "Pickleball";
    await prisma.provider.upsert({
      where: { id: pro.id },
      create: {
        id: pro.id,
        name: pro.name,
        email: pro.email,
        description: pro.description,
        communityId: BONITA_BAY_COMMUNITY_ID,
        category: pro.category,
        type: "activity",
        rating: 5,
        listingKind: "club",
        phone: CLUB_PHONE,
        imageUrl: imageForProviderCategory(imageCategory, "activity", pro.name),
      },
      update: {
        name: pro.name,
        email: pro.email,
        description: pro.description,
        category: pro.category,
        type: "activity",
        listingKind: "club",
        phone: CLUB_PHONE,
        imageUrl: imageForProviderCategory(imageCategory, "activity", pro.name),
      },
    });
  }
}

async function seedDining() {
  await prisma.provider.upsert({
    where: { id: "bb-provider-dining" },
    create: {
      id: "bb-provider-dining",
      communityId: BONITA_BAY_COMMUNITY_ID,
      name: "Bonita Bay Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Breezeway Bar & Café at the Sports Center, Wave Café at the Lifestyle Center, and 55th Hole & Clubroom overlooking the course.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Bonita Bay Dining",
      rating: 4.9,
      description:
        "Breezeway Bar & Café at the Sports Center, Wave Café at the Lifestyle Center, and 55th Hole & Clubroom overlooking the course.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
  });

  await prisma.menuItem.deleteMany({ where: { providerEmail: DINING_EMAIL } });
  await prisma.menuItem.createMany({
    data: menuItems.map((m) => ({
      id: m.id,
      providerEmail: DINING_EMAIL,
      name: m.name,
      price: m.price,
      category: m.category,
      available: true,
    })),
  });
}

/** Approved nearby vendors for the member Vendors directory (not Local Pros / dining / lessons). */
const nearbyVendors = [
  {
    id: "bb-vendor-lawn",
    name: "Bay Harbor Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@bonitabayclub.net",
    phone: "(239) 555-4101",
    description:
      "Weekly mowing, edging, and seasonal color for Bonita Bay homes along Country Club Drive.",
  },
  {
    id: "bb-vendor-pool",
    name: "Gulf Gate Pool Service",
    category: "Pool",
    rating: 4.7,
    email: "pool@bonitabayclub.net",
    phone: "(239) 555-4102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment checks for Bonita Springs estates.",
  },
  {
    id: "bb-vendor-clean",
    name: "Coastal Nest Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@bonitabayclub.net",
    phone: "(239) 555-4103",
    description:
      "Housekeeping and deep cleans for golf villas, condos, and single-family homes in Bonita Bay.",
  },
  {
    id: "bb-vendor-hvac",
    name: "Bonita Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@bonitabayclub.net",
    phone: "(239) 555-4104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "bb-vendor-plumb",
    name: "Estero Bay Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@bonitabayclub.net",
    phone: "(239) 555-4105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Bonita Bay members.",
  },
  {
    id: "bb-vendor-windows",
    name: "Clear Lanai Window Care",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@bonitabayclub.net",
    phone: "(239) 555-4106",
    description:
      "Interior and exterior window cleaning for lanais, golf-course views, and multi-story homes.",
  },
  {
    id: "bb-vendor-pest",
    name: "Southwest Pest Solutions",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@bonitabayclub.net",
    phone: "(239) 555-4107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Bonita Bay properties.",
  },
  {
    id: "bb-vendor-handyman",
    name: "Clubside Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@bonitabayclub.net",
    phone: "(239) 555-4108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "bb-vendor-paint",
    name: "Palm Finish Painting",
    category: "Painting",
    rating: 4.5,
    email: "paint@bonitabayclub.net",
    phone: "(239) 555-4109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Bonita Bay.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        name: vendor.name,
        category: vendor.category,
        type: "service",
        rating: vendor.rating,
        description: vendor.description,
        phone: vendor.phone,
        email: vendor.email,
        imageUrl,
        listingKind: "club",
        escrowEnabled: true,
        calendarSharingEnabled: true,
      },
      update: {
        name: vendor.name,
        category: vendor.category,
        rating: vendor.rating,
        description: vendor.description,
        phone: vendor.phone,
        email: vendor.email,
        imageUrl,
        listingKind: "club",
        escrowEnabled: true,
        calendarSharingEnabled: true,
      },
    });
  }
}

async function seedEventsAndBookings() {
  const events = [
    {
      id: "bb-event-ladies-golf",
      title: "Ladies Day — Bay Island",
      description: "Weekly Ladies Day shotgun on Bay Island followed by lunch at the 55th Hole & Clubroom.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "Bay Island Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bb-event-mens-golf",
      title: "Men's Day — Sabal Course",
      description: "Tom Fazio Sabal Course member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "Sabal Course",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bb-event-couples",
      title: "Couples Scramble & Wine Dinner",
      description: "Nine-hole couples scramble on Creekside followed by wine dinner at the 55th Hole & Clubroom.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Creekside Course",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "bb-event-pickleball-social",
      title: "Pickleball Round-Robin Social",
      description: "Open round-robin across fifteen courts — all levels welcome at the Sports Center.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Pickleball Courts",
      category: "sports",
      isPromoted: true,
      capacity: 60,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bb-event-tennis-mixer",
      title: "Har-Tru Tennis Mixer",
      description: "Rotating partners on green clay — Sophia Reyes hosts courts 1–4.",
      date: easternDateOffset(6),
      time: "09:00",
      location: "Har-Tru Tennis Courts",
      category: "sports",
      isPromoted: false,
      capacity: 36,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bb-event-croquet",
      title: "Croquet Society Wickets",
      description: "Championship lawn wickets and refreshments on the Sports Center terrace.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Championship Croquet Lawn",
      category: "social",
      isPromoted: false,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bb-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines at the 55th Hole & Clubroom.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "55th Hole & Clubroom",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "bb-event-pool-social",
      title: "Sports Center Pool Social",
      description: "Live acoustic music and Breezeway Bar & Café happy hour at the Sports Center pool.",
      date: easternDateOffset(8),
      time: "17:00",
      location: "Sports Center Pool",
      category: "social",
      isPromoted: true,
      capacity: 150,
      requirePayment: false,
      feeCents: 0,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: BONITA_BAY_COMMUNITY_ID, createdBy: "Bonita Bay Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "bb-booking-golf",
      amenityId: "bb-amenity-golf-bay-island",
      unitNumber: 1,
      amenity: "Bay Island Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "bb-booking-tennis",
      amenityId: "bb-amenity-tennis",
      unitNumber: 3,
      amenity: "Har-Tru Tennis Courts",
      date: easternDateOffset(1),
      startTime: "10:00",
      endTime: "11:30",
    },
    {
      id: "bb-booking-pickleball",
      amenityId: "bb-amenity-pickleball",
      unitNumber: 7,
      amenity: "Pickleball Courts",
      date: easternDateOffset(3),
      startTime: "09:00",
      endTime: "10:30",
    },
  ] as const;

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        ...booking,
        communityId: BONITA_BAY_COMMUNITY_ID,
        memberEmail: MEMBER_EMAIL,
        memberName: MEMBER_NAME,
        status: "confirmed",
      },
      update: {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: "confirmed",
      },
    });
  }
}

async function seedEngagement() {
  const announcements = [
    {
      id: "bb-announcement-golf",
      title: "Five courses, 90 holes — summer tee times",
      body: "Marsh, Creekside, and Bay Island (Arthur Hills) plus Sabal and Cypress (Tom Fazio) are in peak summer condition. Book tee times through the golf shop — early mornings recommended for the coolest rounds.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "bb-announcement-tennis",
      title: "Sixteen Har-Tru courts — surface maintenance complete",
      body: "All sixteen Har-Tru courts at the Sports Center have completed rolling and irrigation calibration. Book courts in the member app or contact Sophia Reyes for lesson availability.",
      author: "Racquet Sports",
      priority: "normal",
    },
    {
      id: "bb-announcement-breezeway",
      title: "Breezeway Bar & Café open daily at the Sports Center",
      body: "Open-air dining at the Breezeway Bar & Café — frozen cocktails, paninis, seafood baskets, and salads after tennis or by the pool.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: BONITA_BAY_COMMUNITY_ID },
      update: {
        title: a.title,
        body: a.body,
        author: a.author,
        priority: a.priority,
      },
    });
  }
}

async function seedDocuments() {
  const documents = [
    {
      id: "bb-document-club-guide",
      title: "Bonita Bay Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 5,
    },
    {
      id: "bb-document-dues",
      title: "Membership Fees (Public Figures) — Golf & Sports",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 2,
    },
    {
      id: "bb-document-golf-courses",
      title: "Golf Course Guide — 5 Courses / 90 Holes",
      category: "golf",
      url: "#",
      uploadedBy: "Michael Torres · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "bb-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "bb-document-racquets",
      title: "Racquet Sports — 16 Tennis · 15 Pickleball · Croquet",
      category: "sports",
      url: "#",
      uploadedBy: "Sports Center",
      daysAgo: 10,
    },
    {
      id: "bb-document-dining",
      title: "Dining — Breezeway, Wave Café, 55th Hole & Clubroom",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "bb-document-lifestyle",
      title: "Lifestyle Center — Fitness, Spa & Salon",
      category: "membership",
      url: "#",
      uploadedBy: "Lifestyle Center",
      daysAgo: 12,
    },
    {
      id: "bb-document-blog",
      title: "Bonita Bay Club Blog",
      category: "membership",
      url: CLUB_BLOG_URL,
      uploadedBy: "Club Communications",
      daysAgo: 1,
    },
    {
      id: "bb-document-contact",
      title: "Club Contact — Address, Phone & Email",
      category: "membership",
      url: "#",
      uploadedBy: CLUB_INFO_EMAIL,
      daysAgo: 1,
    },
    {
      id: "bb-document-real-estate",
      title: "Featured Homes — Bonita Bay Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Patricia Nolan · Bonita Bay Realty",
      daysAgo: 4,
    },
    {
      id: "bb-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "James Whitfield · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        title: document.title,
        category: document.category,
        url: document.url,
        sizeLabel: "PDF",
        audience: "member",
        uploadedBy: document.uploadedBy,
        createdAt: new Date(Date.now() - document.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        title: document.title,
        category: document.category,
        url: document.url,
        sizeLabel: "PDF",
        audience: "member",
        uploadedBy: document.uploadedBy,
      },
    });
  }
}

async function seedGroups() {
  const groups = [
    {
      id: "bb-group-golfers",
      name: "Bonita Bay Golfers",
      description:
        "Five championship courses, 90 holes — Marsh, Creekside, Bay Island, Sabal, and Cypress. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "bb-group-ladies-golf",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on Bay Island and rotating courses — 55th Hole & Clubroom lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "bb-group-tennis",
      name: "Har-Tru Tennis",
      description: "Sixteen green-clay courts — lessons with Sophia Reyes & Ethan Brooks, leagues, and mixers.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "bb-group-pickleball",
      name: "Pickleball Round-Robin",
      description: "Fifteen courts — open play, ladders, and clinics with Megan Walsh at the Sports Center.",
      color: "from-sky-400 to-blue-700",
      members: 248,
    },
    {
      id: "bb-group-croquet",
      name: "Croquet Society",
      description: "Championship croquet lawn — wickets, tournaments, and terrace socials.",
      color: "from-amber-400 to-orange-700",
      members: 54,
    },
    {
      id: "bb-group-fitness",
      name: "Lifestyle Center Fitness",
      description: "Group classes, personal training, Spa & Salon recovery, and Wave Café meetups.",
      color: "from-teal-400 to-cyan-700",
      members: 312,
    },
    {
      id: "bb-group-social",
      name: "Bonita Bay Social Scene",
      description: "Sunday dining, pool socials, and Lifestyle Center evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "bb-group-neighbors",
      name: "Neighbors at Bonita Bay",
      description: "Welcome notes, ride shares, and recommendations around Country Club Drive and the community.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: BONITA_BAY_COMMUNITY_ID,
      },
      update: {
        name: group.name,
        description: group.description,
        color: group.color,
        members: group.members,
      },
    });
  }

  for (const groupId of [
    "bb-group-golfers",
    "bb-group-ladies-golf",
    "bb-group-tennis",
    "bb-group-pickleball",
  ]) {
    await prisma.groupMembership.upsert({
      where: {
        groupId_userEmail: { groupId, userEmail: MEMBER_EMAIL },
      },
      create: { groupId, userEmail: MEMBER_EMAIL },
      update: {},
    });
  }

  for (const groupId of [
    "bb-group-social",
    "bb-group-pickleball",
    "bb-group-croquet",
    "bb-group-fitness",
    "bb-group-neighbors",
  ]) {
    await prisma.groupMembership.upsert({
      where: {
        groupId_userEmail: { groupId, userEmail: SOCIAL_EMAIL },
      },
      create: { groupId, userEmail: SOCIAL_EMAIL },
      update: {},
    });
  }
}

async function seedFavorites() {
  const plans: Array<{ email: string; label: string; href: string }> = [
    { email: MEMBER_EMAIL, label: "Book Bay Island golf", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Five-course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "55th Hole & Clubroom", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Pickleball courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Sports Center pool", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Breezeway Bar & Café", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Croquet lawn", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Lifestyle Center fitness", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Wave Café", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: SOCIAL_EMAIL, label: "Pay dues", href: "/member/payments" },
  ];

  for (const plan of plans) {
    const email = plan.email.toLowerCase();
    const existing = await prisma.memberFavorite.findFirst({
      where: { userEmail: email, label: plan.label, href: plan.href },
    });
    if (existing) continue;
    await prisma.memberFavorite.create({
      data: { userEmail: email, label: plan.label, href: plan.href },
    });
  }
}

async function seedMessages() {
  const claire = { email: MEMBER_EMAIL, name: MEMBER_NAME };
  const robert = { email: SOCIAL_EMAIL, name: SOCIAL_NAME };
  const michael = { email: "golf@bonitabayclub.net", name: "Michael Torres" };
  const laura = { email: "laura.chen@bonitabayclub.net", name: "Laura Chen" };
  const sophia = { email: "sophia.reyes@bonitabayclub.net", name: "Sophia Reyes" };
  const megan = { email: "megan.walsh@bonitabayclub.net", name: "Megan Walsh" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: "patricia.nolan@bonitabayclub.net", name: "Patricia Nolan" };
  const frederick = { email: "frederick.fung@bonitabayclub.net", name: "Frederick Fung" };
  const james = { email: BOARD_EMAIL, name: BOARD_NAME };

  const threads: Array<{
    id: string;
    kind?: "dm" | "group";
    title?: string | null;
    createdBy: string;
    participants: Array<{ email: string; name: string }>;
    messages: Array<{ author: { email: string; name: string }; body: string; hoursAgo: number }>;
  }> = [
    {
      id: "bb-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Michael — can we do a playing lesson on Bay Island Friday? Want to work on approach shots into the island greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on Bay Island — we'll focus on club selection and wind off the marsh.",
          hoursAgo: 38,
        },
        {
          author: claire,
          body: "Perfect. Should I warm up on the range first?",
          hoursAgo: 36,
        },
        {
          author: michael,
          body: "Yes — arrive by 8:30. The Fazio courses are firm this week, so we'll talk landing areas too.",
          hoursAgo: 2,
        },
      ],
    },
    {
      id: "bb-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Claire — Court 4 is open Saturday at 10 for your Har-Tru lesson. We'll work on your kick serve.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: sophia,
          body: "Hopper is ready on Court 4 — just water and a visor. Booked 10:00–11:00.",
          hoursAgo: 24,
        },
      ],
    },
    {
      id: "bb-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two at the 55th Hole & Clubroom Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 at the 55th Hole & Clubroom. The snapper and filet are chef's highlights this week.",
          hoursAgo: 18,
        },
        {
          author: claire,
          body: "Wonderful — thank you!",
          hoursAgo: 17,
        },
      ],
    },
    {
      id: "bb-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Claire — saw you signed up for pickleball. Anything specific to focus on?",
          hoursAgo: 10,
        },
        {
          author: claire,
          body: "Mostly third-shot drops — I keep popping them up at the kitchen.",
          hoursAgo: 8,
        },
        {
          author: megan,
          body: "Classic. We'll drill resets on Court 8 — you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
      id: "bb-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Claire — croquet wickets tonight at 5 if you're free. Loser buys Wave Café smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got Bay Island in the morning — rain check for the pool social Friday?",
          hoursAgo: 7,
        },
        {
          author: robert,
          body: "Friday works. See you at the Sports Center pool.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "bb-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold Wave Café seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Wave Café table held for noon. Breezeway happy hour starts at 4 if you want to linger.",
          hoursAgo: 14,
        },
        {
          author: robert,
          body: "Perfect, thank you!",
          hoursAgo: 13,
        },
      ],
    },
    {
      id: "bb-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Laura — guest rate for my sister on Cypress Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies — I can put you on a 2:30 tee on Cypress. Fazio conditions are excellent this week.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Book it please — she'll love the course.",
          hoursAgo: 27,
        },
      ],
    },
    {
      id: "bb-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Elena — my guest pass for Saturday Cypress still shows pending. Can Membership confirm?",
          hoursAgo: 12,
        },
        {
          author: elena,
          body: "Confirmed and emailed. Your sister is cleared for the 2:30 tee time. Call the golf shop if anything changes.",
          hoursAgo: 4,
        },
      ],
    },
    {
      id: "bb-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Claire — 27150 Bay Harbor Drive is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about Bay Island views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Bonita Bay Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "bb-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Claire — any member comments for the July board packet? We're covering Sports Center hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the pool socials on the calendar through October — they've been wonderful for the community.",
          hoursAgo: 42,
        },
        {
          author: frederick,
          body: "Noted — Elena will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "bb-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Claire — board meeting next week covers the Lifestyle Center spa renovation timeline. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Spa recovery after morning rounds would be great — early appointment slots if possible.",
          hoursAgo: 48,
        },
        {
          author: james,
          body: "Thank you — I'll share that with Frederick and the Lifestyle team.",
          hoursAgo: 46,
        },
      ],
    },
    {
      id: "bb-chat-pickleball-group",
      kind: "group",
      title: "Pickleball Round-Robin",
      createdBy: megan.email,
      participants: [claire, robert, megan],
      messages: [
        {
          author: megan,
          body: "Round-robin Thursday at 4 across Courts 1–6. All levels — borrow a paddle at the desk if needed.",
          hoursAgo: 15,
        },
        {
          author: robert,
          body: "I'm in. Anyone up for Court 12 after if it frees up?",
          hoursAgo: 12,
        },
        {
          author: claire,
          body: "Yes — see you at 4. Loser buys Wave Café smoothies?",
          hoursAgo: 3,
        },
      ],
    },
  ];

  const threadIds = threads.map((t) => t.id);
  await prisma.chatMessage.deleteMany({
    where: { threadId: { in: threadIds } },
  });
  await prisma.chatParticipant.deleteMany({
    where: { threadId: { in: threadIds } },
  });
  await prisma.chatThread.deleteMany({
    where: { id: { in: threadIds } },
  });

  for (const thread of threads) {
    const lastHoursAgo = Math.min(...thread.messages.map((m) => m.hoursAgo));
    await prisma.chatThread.create({
      data: {
        id: thread.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        kind: thread.kind ?? "dm",
        title: thread.title ?? null,
        createdBy: thread.createdBy.toLowerCase(),
        updatedAt: new Date(Date.now() - lastHoursAgo * 60 * 60 * 1000),
      },
    });
    await prisma.chatParticipant.createMany({
      data: thread.participants.map((p) => ({
        threadId: thread.id,
        userEmail: p.email.toLowerCase(),
        userName: p.name,
      })),
    });
    for (const [index, msg] of thread.messages.entries()) {
      await prisma.chatMessage.create({
        data: {
          id: `${thread.id}-m${index}`,
          threadId: thread.id,
          authorEmail: msg.author.email.toLowerCase(),
          authorName: msg.author.name,
          body: msg.body,
          createdAt: new Date(Date.now() - msg.hoursAgo * 60 * 60 * 1000),
        },
      });
    }
  }
}

export async function ensureBonitaBayDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: BONITA_BAY_COMMUNITY_ID },
    create: {
      id: BONITA_BAY_COMMUNITY_ID,
      name: "Bonita Bay Club",
      location: "Bonita Springs, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#0c4a6e] to-[#38bdf8]",
      logoUrl: brandAssets.communityBonitaBay,
      primaryColor: "#0c4a6e",
      appDisplayName: "Bonita Bay",
      inviteCode: "bonita-bay-demo",
    },
    update: {
      name: "Bonita Bay Club",
      location: "Bonita Springs, FL",
      logoUrl: brandAssets.communityBonitaBay,
      primaryColor: "#0c4a6e",
      appDisplayName: "Bonita Bay",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-bb-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-bb-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-bb-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-bb-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: BONITA_BAY_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: BONITA_BAY_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "27150 Bay Harbor Drive",
      householdAddress: "27150 Bay Harbor Drive, Bonita Springs, FL 34134",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "26601 Country Club Drive",
      householdAddress: "26601 Country Club Drive, Bonita Springs, FL 34134",
    },
  ] as const) {
    await prisma.memberProfileExt.upsert({
      where: { userEmail: profile.email },
      create: {
        userEmail: profile.email,
        membershipTier: profile.membershipTier,
        residencyStatus: "resident",
        paysHoa: true,
        unit: profile.unit,
        householdAddress: profile.householdAddress,
        directoryVisible: true,
      },
      update: {
        membershipTier: profile.membershipTier,
        residencyStatus: "resident",
        paysHoa: true,
        unit: profile.unit,
        householdAddress: profile.householdAddress,
        directoryVisible: true,
      },
    });
  }

  await ensureMembershipTiersSeeded(BONITA_BAY_COMMUNITY_ID);
  await seedAmenities();
  await seedStaffAndPros();
  await seedDining();
  await seedNearbyVendors();
  await seedEventsAndBookings();
  await seedEngagement();
  await seedDocuments();
  await seedGroups();
  await seedFavorites();
  await seedMessages();
  await seedServiceRequests();
  await seedApparel();
  await seedMarketplace();
  await seedBlog();
  await seedNewsletters();
  await seedGallery();
  await seedProperties();
  await seedRealEstate();
}

/** Idempotent service-request fixtures for member / PM demos. */
export async function ensureBonitaBayDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureBonitaBayDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureBonitaBayDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureBonitaBayDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureBonitaBayDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureBonitaBayDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureBonitaBayDemoPropertiesAndRealEstate(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedProperties();
  await seedRealEstate();
}

async function seedServiceRequests() {
  const rows = [
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      title: "Guest pass pending for Saturday Cypress tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on Cypress — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      title: "Irrigation overspray on Bay Harbor driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 27150 Bay Harbor soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      title: "Har-Tru Court 6 net needs tightening",
      category: "Amenities",
      description: "Net sags in the middle on Court 6 — Saturday mixer is affected.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "26601 Country Club Drive",
      title: "Breezeway patio lights out",
      category: "Maintenance",
      description: "Half the Breezeway patio string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "26601 Country Club Drive",
      title: "Sports Center towel cabinet empty",
      category: "Amenities",
      description: "Poolside towel stock at the Sports Center was empty twice this week after noon.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      title: "Pickleball Court 8 wind screen torn",
      category: "Maintenance",
      description: "Wind screen on Court 8 has a tear near the post — affects afternoon play.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: BONITA_BAY_COMMUNITY_ID,
        memberEmail: row.memberEmail,
        title: row.title,
      },
    });
    if (existing) {
      if (existing.status !== row.status) {
        await prisma.serviceRequest.update({
          where: { id: existing.id },
          data: { status: row.status, description: row.description },
        });
      }
      continue;
    }
    await prisma.serviceRequest.create({
      data: {
        communityId: BONITA_BAY_COMMUNITY_ID,
        memberEmail: row.memberEmail,
        memberName: row.memberName,
        unit: row.unit,
        title: row.title,
        category: row.category,
        description: row.description,
        status: row.status,
        createdAt: new Date(Date.now() - row.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedApparel() {
  const proShop = "Bonita Bay Pro Shop";
  const apparel = [
    {
      id: "bb-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered Bonita Bay crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/bb-apparel-polo-navy.png",
    },
    {
      id: "bb-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for tennis and pickleball.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/bb-apparel-ladies-polo.png",
    },
    {
      id: "bb-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool Bonita mornings on Bay Island or Cypress.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/bb-apparel-quarter-zip.png",
    },
    {
      id: "bb-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered Bonita Bay crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bb-apparel-cap-navy.png",
    },
    {
      id: "bb-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for Har-Tru tennis and Sports Center pool days.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bb-apparel-visor-black.png",
    },
    {
      id: "bb-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bb-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        vendorName: proShop,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        sizesJson: item.sizesJson,
        imageUrl: item.imageUrl,
        active: true,
      },
      update: {
        vendorName: proShop,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        sizesJson: item.sizesJson,
        imageUrl: item.imageUrl,
        active: true,
      },
    });
  }

  const existingOrder = await prisma.apparelOrder.findFirst({
    where: {
      communityId: BONITA_BAY_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — Bay Island tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: BONITA_BAY_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "bb-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "bb-apparel-cap",
            name: "Performance Cap — Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo — Bay Island tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "bb-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup at Bay Harbor after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "bb-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Country Club Drive only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "26601 Country Club Drive",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "bb-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Fitness",
      seller: "Sophia Reyes",
      unit: "26880 Marsh Landing Circle",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "bb-marketplace-racquet",
      title: "Kids' Tennis Racquet",
      description: "Lightly used junior racquet for ages 8–12. Fresh grip and cover included.",
      price: 32,
      category: "Tennis",
      seller: "Ethan Brooks",
      unit: "27022 Creekside Crossing",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 4,
    },
    {
      id: "bb-marketplace-polo",
      title: "Bonita Bay Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "27150 Bay Harbor Drive",
      imageUrl: "/brand/apparel/bb-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "bb-marketplace-paddle",
      title: "Selkirk Pickleball Paddle",
      description: "Midweight paddle with edge guard — great for Sports Center round-robins.",
      price: 85,
      category: "Pickleball",
      seller: SOCIAL_NAME,
      unit: "26601 Country Club Drive",
      imageUrl: brandAssets.marketplacePickleballPaddle,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        seller: listing.seller,
        unit: listing.unit,
        imageUrl: listing.imageUrl,
        createdAt: new Date(Date.now() - listing.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        seller: listing.seller,
        unit: listing.unit,
        imageUrl: listing.imageUrl,
      },
    });
  }
}

async function seedBlog() {
  const posts = [
    {
      id: "bb-blog-five-courses",
      title: "Playing all five courses this season",
      excerpt:
        "Director of Golf Michael Torres shares routing tips for Marsh, Creekside, Bay Island, Sabal, and Cypress.",
      body: "Bonita Bay members enjoy 90 holes across five distinct layouts. Arthur Hills courses reward precision off the tee; Tom Fazio's Sabal and Cypress favor confident carries. Book early mornings for the coolest conditions and ask the golf shop about multi-course member events.",
      author: "Michael Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "bb-blog-breezeway",
      title: "Breezeway Bar & Café favorites after tennis",
      excerpt:
        "Post-match smoothies, salads, and poolside seating at the Sports Center.",
      body: "After Har-Tru tennis or a lap swim, the Breezeway Bar & Café is the easy stop for frozen cocktails, paninis, and seafood baskets. Wave Café covers healthy grab-and-go at the Lifestyle Center.",
      author: "Bonita Bay Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "bb-blog-pickleball",
      title: "Fifteen courts, one thriving community",
      excerpt:
        "Pickleball Director Megan Walsh previews Thursday round-robins and beginner clinics.",
      body: "With fifteen dedicated courts, Bonita Bay runs rotating partners and skill-based pods so everyone meets more members. Borrow a paddle at the Sports Center desk, arrive ten minutes early, and stay for Breezeway refreshments afterward.",
      author: "Megan Walsh",
      category: "Racquets",
      daysAgo: 5,
    },
    {
      id: "bb-blog-tennis",
      title: "Har-Tru care and court booking tips",
      excerpt:
        "Head Pro Sophia Reyes on clay-court etiquette and the best lesson times.",
      body: "Our sixteen Har-Tru courts are rolled and irrigated daily. Slide into shots, avoid dragging feet at the baseline, and book lessons mid-morning when the surface is firmest. Ethan Brooks runs junior clinics on weekends.",
      author: "Sophia Reyes",
      category: "Racquets",
      daysAgo: 7,
    },
    {
      id: "bb-blog-lifestyle",
      title: "Lifestyle Center summer programming",
      excerpt:
        "Fitness classes, Spa & Salon recovery, and Wave Café hours for the warm season.",
      body: "Train before tee times in Fitness, then recover at Spa & Salon. Group classes fill quickly — check the calendar. Wave Café opens early for organic juices, smoothies, wraps, and bowls.",
      author: "Lifestyle Center Team",
      category: "Wellness",
      daysAgo: 9,
    },
    {
      id: "bb-blog-welcome",
      title: "Welcome to Bonita Bay Club",
      excerpt:
        "Simple ways to settle in — golf, racquets, dining, and community groups.",
      body: "Start with a casual meal at Breezeway or Wave Café, join a community group in the app, and book one clinic on the calendar. Questions: bbcinfo@bonitabayclub.net · (239) 495-0200.",
      author: "Elena Vargas",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        category: post.category,
        createdAt: new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        category: post.category,
      },
    });
  }

  const comments = [
    {
      id: "bb-blog-comment-golf-1",
      postId: "bb-blog-five-courses",
      author: MEMBER_NAME,
      body: "Bay Island at dawn is unbeatable — thanks for the routing tips, Michael!",
    },
    {
      id: "bb-blog-comment-golf-2",
      postId: "bb-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Cypress was in perfect shape last weekend.",
    },
    {
      id: "bb-blog-comment-breezeway-1",
      postId: "bb-blog-breezeway",
      author: MEMBER_NAME,
      body: "Breezeway Bar & Café after tennis is our Saturday ritual now.",
    },
    {
      id: "bb-blog-comment-pickle-1",
      postId: "bb-blog-pickleball",
      author: SOCIAL_NAME,
      body: "Round-robin was packed but so welcoming. Counting me in next Thursday.",
    },
  ] as const;

  for (const comment of comments) {
    await prisma.blogComment.upsert({
      where: { id: comment.id },
      create: comment,
      update: {
        postId: comment.postId,
        author: comment.author,
        body: comment.body,
      },
    });
  }
}

async function seedNewsletters() {
  const newsletters = [
    {
      id: "bb-newsletter-july-2026",
      title: "Bonita Bay Club Summer Update — July 2026",
      summary:
        "Five courses in peak condition, Sports Center pool socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Bonita Bay Club. All five championship courses — Marsh, Creekside, Bay Island, Sabal, and Cypress — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Breezeway Bar & Café, Wave Café, and 55th Hole & Clubroom — reserve in Dining",
        "• Sports Center pool social with live music",
        "• Pickleball round-robin on fifteen courts — Thursdays",
        "• Sixteen Har-Tru tennis courts, fifteen pickleball courts, and championship croquet lawn",
        "",
        "Questions: bbcinfo@bonitabayclub.net · (239) 495-0200 · 26660 Country Club Drive, Bonita Springs, FL 34134 · bonitabayclub.blog",
        "",
        "— Elena Vargas",
        "Membership & Communications",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "bb-newsletter-golf-racquets",
      title: "Golf & Racquets Roundup",
      summary:
        "Course notes from Michael Torres, Har-Tru tennis, pickleball clinics, and croquet society events.",
      body: [
        "Golf & Racquets members,",
        "",
        "Golf: Arthur Hills and Tom Fazio courses are playing firm and fast. Warm up on the practice range, then book lessons with Michael Torres or Laura Chen.",
        "",
        "Racquets: Sophia Reyes and Ethan Brooks are booking tennis on green clay; Megan Walsh covers pickleball across fifteen courts. Oliver Grant coordinates croquet wickets on the championship lawn.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app.",
        "",
        "— Golf Shop & Racquet Pros",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "bb-newsletter-dining",
      title: "Dining at Bonita Bay — Midsummer Menus",
      summary:
        "55th Hole lunch buffet, Clubroom Sunday dining, Breezeway poolside, and Wave Café.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Breezeway Bar & Café, Wave Café, and 55th Hole & Clubroom. After tennis or a lap swim, Breezeway is the open-air favorite. Sunday and holiday dining at the Clubroom book quickly.",
        "",
        "Daily lunch buffet and à la carte at 55th Hole & Clubroom overlook the course — reserve through Dining.",
        "",
        "— Bonita Bay Dining",
        "dining@bonitabayclub.net",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "bb-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Bonita Bay Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Bonita Bay neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "For orientation, Documents now includes a Membership Fees summary based on publicly reported figures (approximate — confirm with Membership):",
        "• Golf — initiation ~$225,000 · annual dues ~$22,500",
        "• Sports — initiation ~$90,000 · annual dues ~$11,670",
        "Full Golf remains waitlisted; Sports membership includes club amenities with limited golf access.",
        "",
        "For real-estate questions, Patricia Nolan remains our on-site broker. Property Management can help with irrigation, amenities, and Sports Center access.",
        "",
        "Thank you for making Bonita Bay Club a vibrant member-owned community.",
        "",
        "— Club Administration · Frederick Fung, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        title: newsletter.title,
        summary: newsletter.summary,
        body: newsletter.body,
        createdAt: new Date(Date.now() - newsletter.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        title: newsletter.title,
        summary: newsletter.summary,
        body: newsletter.body,
      },
    });
  }
}

async function seedGallery() {
  const images = [
    {
      id: "bb-gallery-bay-island",
      title: "Bay Island 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Michael Torres",
      daysAgo: 1,
    },
    {
      id: "bb-gallery-clubhouse",
      title: "Clubroom terrace overlooking the course",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "bb-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Laura Chen",
      daysAgo: 3,
    },
    {
      id: "bb-gallery-pickleball",
      title: "Pickleball courts — round-robin",
      category: "Racquets",
      url: brandAssets.amenityPickleball,
      uploadedBy: "Megan Walsh",
      daysAgo: 4,
    },
    {
      id: "bb-gallery-tennis",
      title: "Har-Tru green clay courts",
      category: "Racquets",
      url: brandAssets.amenityTennisClay,
      uploadedBy: "Sophia Reyes",
      daysAgo: 5,
    },
    {
      id: "bb-gallery-croquet",
      title: "Championship croquet lawn",
      category: "Social",
      url: brandAssets.amenityBocce,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 6,
    },
    {
      id: "bb-gallery-fitness",
      title: "Lifestyle Center fitness",
      category: "Wellness",
      url: brandAssets.amenityFitness,
      uploadedBy: "Lifestyle Center Team",
      daysAgo: 7,
    },
    {
      id: "bb-gallery-dining",
      title: "55th Hole & Clubroom",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Bonita Bay Dining",
      daysAgo: 8,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        title: image.title,
        category: image.category,
        url: image.url,
        uploadedBy: image.uploadedBy,
        createdAt: new Date(Date.now() - image.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        title: image.title,
        category: image.category,
        url: image.url,
        uploadedBy: image.uploadedBy,
      },
    });
  }
}

async function seedProperties() {
  const properties = [
    {
      id: "bb-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "27150 Bay Harbor Drive, Bonita Springs, FL 34134",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "bb-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "26880 Marsh Landing Circle, Bonita Springs, FL 34134",
      type: "Investment property",
      owner: true,
    },
    {
      id: "bb-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "26601 Country Club Drive, Bonita Springs, FL 34134",
      type: "Primary residence",
      owner: true,
    },
  ] as const;

  for (const property of properties) {
    await prisma.memberProperty.upsert({
      where: { id: property.id },
      create: {
        id: property.id,
        userEmail: property.userEmail,
        address: property.address,
        type: property.type,
        owner: property.owner,
      },
      update: {
        address: property.address,
        type: property.type,
        owner: property.owner,
      },
    });
  }
}

async function seedRealEstate() {
  const patriciaEmail = "patricia.nolan@bonitabayclub.net";
  const listings = [
    {
      id: "bb-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Bay Harbor Estate with Bay Island Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Bay Island views and easy access to the Sports Center. Listed with Patricia Nolan, Bonita Bay Realty.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "27188 Bay Harbor Drive",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "bb-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Country Club Drive Villa",
      description:
        "Bright three-bedroom villa with screened lanai and preserve backdrop. Walking distance to pickleball, croquet, and Breezeway Bar & Café.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "26620 Country Club Drive",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "bb-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Marsh Landing Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking Arthur Hills marshland. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "26880 Marsh Landing Circle",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.amenitySpa],
      daysAgo: 6,
    },
    {
      id: "bb-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — Creekside Crossing",
      description:
        "Turnkey three-bedroom seasonal rental near the Lifestyle Center. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "27022 Creekside Crossing",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.amenityFitness],
      daysAgo: 8,
    },
    {
      id: "bb-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Lifestyle Center Adjacent Condo",
      description:
        "Two-bedroom condo steps from Fitness, Spa & Salon, and Wave Café — lock-and-leave for snowbirds with full social and racquet access.",
      type: "sale",
      price: 695000,
      beds: 2,
      baths: 2,
      sqft: 1580,
      unit: "850 Neapolitan Way #1204",
      color: "from-amber-400 to-stone-700",
      images: [brandAssets.amenityEventSpace, brandAssets.amenityPickleball],
      daysAgo: 10,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.realEstateListing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: BONITA_BAY_COMMUNITY_ID,
        memberEmail: listing.memberEmail,
        title: listing.title,
        description: listing.description,
        type: listing.type,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        unit: listing.unit,
        color: listing.color,
        imagesJson: JSON.stringify(listing.images),
        createdAt: new Date(Date.now() - listing.daysAgo * 24 * 60 * 60 * 1000),
      },
      update: {
        memberEmail: listing.memberEmail,
        title: listing.title,
        description: listing.description,
        type: listing.type,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        unit: listing.unit,
        color: listing.color,
        imagesJson: JSON.stringify(listing.images),
      },
    });
  }
}
