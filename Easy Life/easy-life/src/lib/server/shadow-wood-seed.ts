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
 * Shadow Wood Country Club — Estero, FL demo tenant.
 * Member-owned private club · 22801 Oakwilde Blvd, Estero, FL 34135 · (239) 992-6000
 * Three courses / 54 holes (North, South, Preserve), 8 Har-Tru tennis, 6 indoor pickleball, 3 bocce.
 */
export const SHADOW_WOOD_COMMUNITY_ID = "shadow-wood";
const MEMBER_EMAIL = "member.demo@shadowwoodcc.com";
const MEMBER_NAME = "Natalie Brooks";
const SOCIAL_EMAIL = "member.social@shadowwoodcc.com";
const SOCIAL_NAME = "David Chen";
const PM_EMAIL = "pm.demo@shadowwoodcc.com";
const PM_NAME = "Amanda Reeves";
const BOARD_EMAIL = "board.demo@shadowwoodcc.com";
const BOARD_NAME = "Richard Coleman";
const CLUB_PHONE = "(239) 992-6000";
const DINING_EMAIL = "dining@shadowwoodcc.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const clubhouseHours = defaultDailyHours("09:00", "21:00");

/** Grill Room — lunch daily, dinner Tue–Sat. */
const grillHours: WeeklyHours = {
  mon: { open: "11:00", close: "15:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "19:00" },
};

/** Poolside Dining — Lifestyle Center. */
const breezewayHours = defaultDailyHours("10:00", "18:00");

/** Main Clubhouse Dining — dinner Thu–Sat. */
const mainDiningHours: WeeklyHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:00" },
  sat: { open: "17:00", close: "21:00" },
  sun: null,
};

/** Poolside Dining — seasonal lunch daily. */
const cabanaHours = defaultDailyHours("11:00", "17:00");

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
    id: "sw-amenity-golf-north",
    name: "North Course",
    description:
      "18 holes · Par 72 · Rating 73.9 · Slope 131 · 7,116 yards. Strategic mix of challenge and scoreable holes.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "sw-amenity-golf-south",
    name: "South Course",
    description:
      "18 holes · Par 72 · Rating 74.7 · Slope 130 · 7,190 yards. Classic second-shot layout — precision into greens is key.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "sw-amenity-golf-preserve",
    name: "Preserve Course",
    description:
      "18 holes · Par 72 · Rating 73.9 · Slope 147 · 6,686 yards. Shot-maker's course through nature preserves with elevated greens.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "sw-amenity-range",
    name: "Practice Range & Short Game",
    description:
      "Full driving range, chipping greens, and putting complex serving all three Shadow Wood courses.",
    kind: "driving_range",
    unitCount: 20,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "sw-amenity-tennis",
    name: "Har-Tru Tennis Courts",
    description:
      "Eight green-clay Har-Tru courts with professional staff, leagues, and private lessons.",
    kind: "court",
    unitCount: 8,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "sw-amenity-pickleball",
    name: "Indoor Pickleball — Lifestyle Center",
    description:
      "Six indoor pickleball courts in the Lifestyle Center — open play, clinics, and social round-robins.",
    kind: "court",
    unitCount: 6,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "sw-amenity-bocce",
    name: "Bocce Courts",
    description:
      "Three bocce courts for social play and club competitions near the Lifestyle Center.",
    kind: "court",
    unitCount: 3,
    holes: null,
    surface: "bocce",
    hoursJson: racquetHours,
  },
  {
    id: "sw-amenity-pool",
    name: "Lifestyle Center Pool",
    description:
      "Resort-style pool with poolside dining — hub for family swim and summer socials.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "sw-amenity-lifestyle",
    name: "Lifestyle Center",
    description:
      "Fitness, pickleball, pool, and poolside dining — Shadow Wood's wellness and social hub.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "sw-amenity-dining-main",
    name: "Main Clubhouse Dining",
    description:
      "Fine and casual dining in the main clubhouse — the welcoming room where everybody knows your name.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: mainDiningHours,
  },
  {
    id: "sw-amenity-dining-grill",
    name: "Grill Room",
    description: "Casual clubhouse grill for post-round burgers, salads, and cold drinks.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "sw-amenity-dining-poolside",
    name: "Poolside Dining",
    description: "Relaxed poolside menu at the Lifestyle Center — lunch, snacks, and beverages.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: cabanaHours,
  },
  {
    id: "sw-amenity-clubhouse-north",
    name: "North Clubhouse",
    description: "One of two Shadow Wood clubhouses serving golf, dining, and member events.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
  {
    id: "sw-amenity-clubhouse-south",
    name: "South Clubhouse",
    description: "Second clubhouse campus for dining, events, and member gatherings.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "sw-staff-frederick",
    name: "Thomas Brennan",
    title: "General Manager",
    department: "Club Management",
    email: "frederick.fung@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "sw-staff-elena",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "sw-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "sw-staff-michael",
    name: "Kevin Morales",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "sw-staff-laura",
    name: "Laura Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "laura.chen@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "sw-staff-david",
    name: "David Okonkwo",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "david.okonkwo@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "sw-staff-sophia",
    name: "Lauren Price",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "sophia.reyes@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "sw-staff-ethan",
    name: "Chris Adler",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "ethan.brooks@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "sw-staff-megan",
    name: "Megan Walsh",
    title: "Pickleball Director",
    department: "Pickleball",
    email: "megan.walsh@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 22,
  },
  {
    id: "sw-staff-oliver",
    name: "Oliver Grant",
    title: "Bocce & Racquets Coordinator",
    department: "Lifestyle Center",
    email: "oliver.grant@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 23,
  },
  {
    id: "sw-staff-fitness",
    name: "Lifestyle Center Fitness Desk",
    title: "Personal Training & Group Classes",
    department: "Fitness",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 30,
  },
  {
    id: "sw-staff-dining",
    name: "Dining Reservations",
    title: "Main Dining · Grill · Poolside",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "sw-staff-realtor",
    name: "Danita Osborn",
    title: "Broker · Shadow Wood Realty",
    department: "Real Estate",
    email: "dosborn@shadowwoodcc.com",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "sw-pro-michael",
    name: "Kevin Morales",
    email: "golf@shadowwoodcc.com",
    category: "golf",
    description:
      "Director of Golf. Instruction across all three Shadow Wood courses — North, South, and Preserve.",
  },
  {
    id: "sw-pro-laura",
    name: "Laura Chen",
    email: "laura.chen@shadowwoodcc.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on the practice range.",
  },
  {
    id: "sw-pro-sophia",
    name: "Lauren Price",
    email: "sophia.reyes@shadowwoodcc.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on eight Har-Tru green clay courts.",
  },
  {
    id: "sw-pro-ethan",
    name: "Chris Adler",
    email: "ethan.brooks@shadowwoodcc.com",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Doubles strategy, junior development, and match-play coaching.",
  },
  {
    id: "sw-pro-megan",
    name: "Megan Walsh",
    email: "megan.walsh@shadowwoodcc.com",
    category: "pickleball",
    description:
      "Pickleball Director. Lessons and ladder play across six indoor courts at the Lifestyle Center.",
  },
  {
    id: "sw-pro-oliver",
    name: "Oliver Grant",
    email: "oliver.grant@shadowwoodcc.com",
    category: "pickleball",
    description:
      "Bocce & Racquets Coordinator. Bocce clinics and introductory pickleball sessions at the Lifestyle Center.",
  },
] as const;

/** Grill Room, Poolside, and Main Dining menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "sw-menu-b-club", name: "Poolside Club Sandwich", price: 15, category: "Poolside · Sandwiches" },
  { id: "sw-menu-b-wrap", name: "Grilled Chicken Wrap", price: 14, category: "Poolside · Sandwiches" },
  { id: "sw-menu-b-smoothie", name: "Tropical Green Smoothie", price: 9, category: "Poolside · Beverages" },
  { id: "sw-menu-b-salad", name: "Lifestyle Center Cobb Salad", price: 15, category: "Poolside · Salads" },
  { id: "sw-menu-b-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Poolside · Beverages" },
  { id: "sw-menu-g-burger", name: "Shadow Wood Burger", price: 17, category: "Grill Room · Favorites" },
  { id: "sw-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "Grill Room · Favorites" },
  { id: "sw-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "Grill Room · Salads" },
  { id: "sw-menu-g-wings", name: "Grill Room Wings", price: 15, category: "Grill Room · Starters" },
  { id: "sw-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "Grill Room · Favorites" },
  { id: "sw-menu-m-filet", name: "Filet Mignon (8 oz)", price: 48, category: "Main Dining · Entrées" },
  { id: "sw-menu-m-snapper", name: "Pan-Seared Red Snapper", price: 38, category: "Main Dining · Entrées" },
  { id: "sw-menu-m-risotto", name: "Wild Mushroom Risotto", price: 26, category: "Main Dining · Entrées" },
  { id: "sw-menu-m-cake", name: "Key Lime Tart", price: 10, category: "Main Dining · Desserts" },
  { id: "sw-menu-c-shrimp", name: "Grilled Gulf Shrimp Skewers", price: 16, category: "Poolside · Small Plates" },
  { id: "sw-menu-c-ceviche", name: "Citrus Ceviche", price: 14, category: "Poolside · Small Plates" },
  { id: "sw-menu-c-margarita", name: "Sunset Margarita", price: 12, category: "Poolside · Bar" },
  { id: "sw-menu-l-yogurt", name: "Lifestyle Açaí Bowl", price: 11, category: "Lifestyle Café · Breakfast" },
  { id: "sw-menu-l-protein", name: "Protein Power Wrap", price: 13, category: "Lifestyle Café · Lunch" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
    where: { id: "sw-provider-dining" },
    create: {
      id: "sw-provider-dining",
      communityId: SHADOW_WOOD_COMMUNITY_ID,
      name: "Shadow Wood Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Main Clubhouse Dining, Grill Room, and Poolside Dining at the Lifestyle Center.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Shadow Wood Dining",
      rating: 4.9,
      description:
        "Main Clubhouse Dining, Grill Room, and Poolside Dining at the Lifestyle Center.",
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
    id: "sw-vendor-lawn",
    name: "Oakwilde Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@shadowwoodcc.com",
    phone: "(239) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Shadow Wood homes off Oakwilde Blvd.",
  },
  {
    id: "sw-vendor-pool",
    name: "Preserve Pool Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@shadowwoodcc.com",
    phone: "(239) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for Shadow Wood estates.",
  },
  {
    id: "sw-vendor-clean",
    name: "Shadow Nest Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@shadowwoodcc.com",
    phone: "(239) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in Shadow Wood Country Club.",
  },
  {
    id: "sw-vendor-hvac",
    name: "Estero Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@shadowwoodcc.com",
    phone: "(239) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "sw-vendor-plumb",
    name: "Oakwilde Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@shadowwoodcc.com",
    phone: "(239) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Shadow Wood members.",
  },
  {
    id: "sw-vendor-windows",
    name: "Tree Line Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@shadowwoodcc.com",
    phone: "(239) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "sw-vendor-pest",
    name: "Bonita Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@shadowwoodcc.com",
    phone: "(239) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Shadow Wood properties.",
  },
  {
    id: "sw-vendor-handyman",
    name: "Lifestyle Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@shadowwoodcc.com",
    phone: "(239) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "sw-vendor-paint",
    name: "Canopy Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@shadowwoodcc.com",
    phone: "(239) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Shadow Wood.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-event-ladies-golf",
      title: "Ladies Day — North Course",
      description: "Weekly Ladies Day shotgun on the North Course followed by lunch in the Grill Room.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "North Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "sw-event-mens-golf",
      title: "Men's Day — South Course",
      description: "South Course member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "South Course",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "sw-event-couples",
      title: "Couples Scramble & Wine Dinner",
      description: "Nine-hole couples scramble on the Preserve Course followed by wine dinner in Main Clubhouse Dining.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Preserve Course",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "sw-event-pickleball-social",
      title: "Pickleball Round-Robin Social",
      description: "Open round-robin across six indoor courts — all levels welcome at the Lifestyle Center.",
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
      id: "sw-event-tennis-mixer",
      title: "Har-Tru Tennis Mixer",
      description: "Rotating partners on green clay — Lauren Price hosts courts 1–4.",
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
      id: "sw-event-croquet",
      title: "Bocce Social",
      description: "Bocce play and refreshments on the Lifestyle Center terrace.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Bocce Courts",
      category: "social",
      isPromoted: false,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "sw-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in Main Clubhouse Dining.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Main Clubhouse Dining",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "sw-event-pool-social",
      title: "Lifestyle Center Pool Social",
      description: "Live acoustic music and poolside happy hour at the Lifestyle Center.",
      date: easternDateOffset(8),
      time: "17:00",
      location: "Lifestyle Center Pool",
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
      create: { ...event, communityId: SHADOW_WOOD_COMMUNITY_ID, createdBy: "Shadow Wood Country Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "sw-booking-golf",
      amenityId: "sw-amenity-golf-preserve",
      unitNumber: 1,
      amenity: "Preserve Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "sw-booking-tennis",
      amenityId: "sw-amenity-tennis",
      unitNumber: 3,
      amenity: "Har-Tru Tennis Courts",
      date: easternDateOffset(1),
      startTime: "10:00",
      endTime: "11:30",
    },
    {
      id: "sw-booking-pickleball",
      amenityId: "sw-amenity-pickleball",
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-announcement-golf",
      title: "three courses, 54 holes — summer tee times",
      body: "North, South, and Preserve (Rees Jones) are in peak summer condition. Book tee times through the golf shop — early mornings recommended for the coolest rounds.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "sw-announcement-tennis",
      title: "Eight Har-Tru courts — surface maintenance complete",
      body: "All eight green-clay Har-Tru courts have completed rolling and irrigation calibration. Book courts in the member app or contact Lauren Price for lesson availability.",
      author: "Racquet Sports",
      priority: "normal",
    },
    {
      id: "sw-announcement-breezeway",
      title: "Poolside Dining open daily at the Lifestyle Center",
      body: "Poolside lunch, smoothies, and post-tennis refreshments at Lifestyle Center dining — steps from the Har-Tru courts and pool.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: SHADOW_WOOD_COMMUNITY_ID },
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
      id: "sw-document-club-guide",
      title: "Shadow Wood Country Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 5,
    },
    {
      id: "sw-document-dues",
      title: "Membership Fees (Public Figures) — Golf & Sports",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 2,
    },
    {
      id: "sw-document-golf-courses",
      title: "Golf Course Guide — 3 Courses / 54 holes",
      category: "golf",
      url: "#",
      uploadedBy: "Kevin Morales · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "sw-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "sw-document-racquets",
      title: "Racquet Sports — 8 Tennis · 6 Pickleball · 3 Bocce",
      category: "sports",
      url: "#",
      uploadedBy: "Lifestyle Center",
      daysAgo: 10,
    },
    {
      id: "sw-document-dining",
      title: "Dining Hours — Clubhouse & Poolside",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "sw-document-lifestyle",
      title: "Lifestyle Center — Fitness, Pickleball & Pool",
      category: "membership",
      url: "#",
      uploadedBy: "Lifestyle Center",
      daysAgo: 12,
    },
    {
      id: "sw-document-naples",
      title: "Guest & Family Access Guide",
      category: "dining",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "sw-document-real-estate",
      title: "Featured Homes — Shadow Wood Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Danita Osborn · Shadow Wood Realty",
      daysAgo: 4,
    },
    {
      id: "sw-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Richard Coleman · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-group-golfers",
      name: "Shadow Wood Golfers",
      description:
        "Three championship courses, 54 holes — North, South, and Preserve. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "sw-group-ladies-golf",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on North and rotating courses — Grill Room lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "sw-group-tennis",
      name: "Har-Tru Tennis",
      description: "Eight green-clay courts — lessons with Lauren Price & Chris Adler, leagues, and mixers.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "sw-group-pickleball",
      name: "Pickleball Round-Robin",
      description: "Six indoor courts — open play, ladders, and clinics with Megan Walsh at the Lifestyle Center.",
      color: "from-sky-400 to-blue-700",
      members: 248,
    },
    {
      id: "sw-group-croquet",
      name: "Bocce Club",
      description: "Championship croquet lawn — wickets, tournaments, and terrace socials.",
      color: "from-amber-400 to-orange-700",
      members: 54,
    },
    {
      id: "sw-group-fitness",
      name: "Lifestyle Center Fitness",
      description: "Group classes, personal training, spa recovery, and Lifestyle Café meetups.",
      color: "from-teal-400 to-cyan-700",
      members: 312,
    },
    {
      id: "sw-group-social",
      name: "Shadow Wood Social Scene",
      description: "Wine dinners, pool socials, and Lifestyle Center evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "sw-group-neighbors",
      name: "Neighbors at Shadow Wood",
      description: "Welcome notes, ride shares, and recommendations around Oakwilde Blvd and the community.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
    "sw-group-golfers",
    "sw-group-ladies-golf",
    "sw-group-tennis",
    "sw-group-pickleball",
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
    "sw-group-social",
    "sw-group-pickleball",
    "sw-group-croquet",
    "sw-group-fitness",
    "sw-group-neighbors",
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
    { email: MEMBER_EMAIL, label: "Book Preserve Course golf", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Three-course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Main Dining & Grill Room", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Pickleball courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Lifestyle Center pool", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Poolside Dining", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Bocce courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Lifestyle Center fitness", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Poolside Dining", href: "/member/dining" },
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
  const michael = { email: "golf@shadowwoodcc.com", name: "Kevin Morales" };
  const laura = { email: "laura.chen@shadowwoodcc.com", name: "Laura Chen" };
  const sophia = { email: "sophia.reyes@shadowwoodcc.com", name: "Lauren Price" };
  const megan = { email: "megan.walsh@shadowwoodcc.com", name: "Megan Walsh" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: "dosborn@shadowwoodcc.com", name: "Danita Osborn" };
  const frederick = { email: "frederick.fung@shadowwoodcc.com", name: "Thomas Brennan" };
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
      id: "sw-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Michael — can we do a playing lesson on Preserve Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on Preserve — we'll focus on club selection and wind off the preserve.",
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
      id: "sw-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Natalie — Court 4 is open Saturday at 10 for your Har-Tru lesson. We'll work on your kick serve.",
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
      id: "sw-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in Main Clubhouse Dining Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Main Dining. The snapper and filet are chef's highlights this week.",
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
      id: "sw-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Natalie — saw you signed up for pickleball. Anything specific to focus on?",
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
      id: "sw-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Natalie — bocce tonight at 5 if you're free. Loser buys poolside smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got North Course in the morning — rain check for the pool social Friday?",
          hoursAgo: 7,
        },
        {
          author: robert,
          body: "Friday works. See you at the Lifestyle Center pool.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "sw-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold poolside seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Poolside table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "sw-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Laura — guest rate for my sister on South Course Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies — I can put you on a 2:30 tee on South. Rees Jones conditions are excellent this week.",
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
      id: "sw-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Elena — my guest pass for Saturday South Course still shows pending. Can Membership confirm?",
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
      id: "sw-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Natalie — 22840 Oakwilde Blvd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about Preserve Course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Shadow Wood Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "sw-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Natalie — any member comments for the July board packet? We're covering Lifestyle Center hours and dining expansions.",
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
      id: "sw-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Natalie — board meeting next week covers the Lifestyle Center spa renovation timeline. Any feedback from golf members?",
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
      id: "sw-chat-pickleball-group",
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
          body: "Yes — see you at 4. Loser buys poolside smoothies?",
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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

export async function ensureShadowWoodDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: SHADOW_WOOD_COMMUNITY_ID },
    create: {
      id: SHADOW_WOOD_COMMUNITY_ID,
      name: "Shadow Wood Country Club",
      location: "Estero, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityShadowWood,
      primaryColor: "#1b4332",
      appDisplayName: "Shadow Wood",
      inviteCode: "shadow-wood-demo",
    },
    update: {
      name: "Shadow Wood Country Club",
      location: "Estero, FL",
      logoUrl: brandAssets.communityShadowWood,
      primaryColor: "#1b4332",
      appDisplayName: "Shadow Wood",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-sw-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-sw-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-sw-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-sw-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "22840 Oakwilde Blvd",
      householdAddress: "22840 Oakwilde Blvd, Estero, FL 34135",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "22910 Shadow Wood Blvd",
      householdAddress: "22910 Shadow Wood Blvd, Estero, FL 34135",
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

  await ensureMembershipTiersSeeded(SHADOW_WOOD_COMMUNITY_ID);
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
export async function ensureShadowWoodDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureShadowWoodDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureShadowWoodDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureShadowWoodDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureShadowWoodDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureShadowWoodDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureShadowWoodDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "22840 Oakwilde Blvd",
      title: "Guest pass pending for Saturday South Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on South Course — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "22840 Oakwilde Blvd",
      title: "Irrigation overspray on Oakwilde driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 22840 Oakwilde soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "22840 Oakwilde Blvd",
      title: "Har-Tru Court 6 net needs tightening",
      category: "Amenities",
      description: "Net sags in the middle on Court 6 — Saturday mixer is affected.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "22910 Shadow Wood Blvd",
      title: "Poolside string lights out",
      category: "Maintenance",
      description: "Half the poolside string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "22910 Shadow Wood Blvd",
      title: "Lifestyle Center towel cabinet empty",
      category: "Amenities",
      description: "Poolside towel stock at the Lifestyle Center was empty twice this week after noon.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "22840 Oakwilde Blvd",
      title: "Pickleball Court 4 wind screen torn",
      category: "Maintenance",
      description: "Wind screen on indoor Court 4 has a tear near the post — affects afternoon play.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
  const proShop = "Shadow Wood Pro Shop";
  const apparel = [
    {
      id: "sw-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered Shadow Wood crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/sw-apparel-polo-navy.png",
    },
    {
      id: "sw-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for tennis and pickleball.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/sw-apparel-ladies-polo.png",
    },
    {
      id: "sw-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool Estero mornings on North or Preserve.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/sw-apparel-quarter-zip.png",
    },
    {
      id: "sw-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered Shadow Wood crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/sw-apparel-cap-navy.png",
    },
    {
      id: "sw-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for Har-Tru tennis and Lifestyle Center pool days.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/sw-apparel-visor-black.png",
    },
    {
      id: "sw-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/sw-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      communityId: SHADOW_WOOD_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — Preserve Course tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: SHADOW_WOOD_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "sw-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "sw-apparel-cap",
            name: "Performance Cap — Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo — Preserve Course tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "sw-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on Oakwilde after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "22840 Oakwilde Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "sw-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Shadow Wood Blvd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "22910 Shadow Wood Blvd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "sw-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Fitness",
      seller: "Lauren Price",
      unit: "22755 Shadow Wood Lane",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "sw-marketplace-racquet",
      title: "Kids' Tennis Racquet",
      description: "Lightly used junior racquet for ages 8–12. Fresh grip and cover included.",
      price: 32,
      category: "Tennis",
      seller: "Chris Adler",
      unit: "22780 Oakwilde Court",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 4,
    },
    {
      id: "sw-marketplace-polo",
      title: "Shadow Wood Country Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "22840 Oakwilde Blvd",
      imageUrl: "/brand/apparel/sw-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "sw-marketplace-paddle",
      title: "Selkirk Pickleball Paddle",
      description: "Midweight paddle with edge guard — great for Lifestyle Center round-robins.",
      price: 85,
      category: "Pickleball",
      seller: SOCIAL_NAME,
      unit: "22910 Shadow Wood Blvd",
      imageUrl: brandAssets.marketplacePickleballPaddle,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-blog-five-courses",
      title: "Playing all three courses this season",
      excerpt:
        "Director of Golf Kevin Morales shares routing tips for North, South, and Preserve.",
      body: "Shadow Wood members enjoy 54 holes across North (7,116 yds · slope 131), South (7,190 yds · slope 130), and Preserve (6,686 yds · slope 147). Book early mornings for the coolest conditions and ask the golf shop about multi-course member events.",
      author: "Kevin Morales, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "sw-blog-breezeway",
      title: "Poolside Dining favorites after tennis",
      excerpt:
        "Post-match smoothies, salads, and poolside seating at the Lifestyle Center.",
      body: "After Har-Tru tennis or a lap swim, the Poolside Dining is the easy stop for light plates and cold drinks. Poolside Dining picks up for sunset dining — reserve through Dining in the member app.",
      author: "Shadow Wood Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "sw-blog-pickleball",
      title: "Fifteen courts, one thriving community",
      excerpt:
        "Pickleball Director Megan Walsh previews Thursday round-robins and beginner clinics.",
      body: "With six indoor pickleball courts at the Lifestyle Center, Shadow Wood runs rotating partners and skill-based pods so everyone meets more members. Borrow a paddle at the desk, arrive ten minutes early, and stay for poolside refreshments afterward.",
      author: "Megan Walsh",
      category: "Racquets",
      daysAgo: 5,
    },
    {
      id: "sw-blog-tennis",
      title: "Har-Tru care and court booking tips",
      excerpt:
        "Head Pro Lauren Price on clay-court etiquette and the best lesson times.",
      body: "Our eight green-clay Har-Tru courts are rolled and irrigated daily. Slide into shots, avoid dragging feet at the baseline, and book lessons mid-morning when the surface is firmest. Chris Adler runs junior clinics on weekends.",
      author: "Lauren Price",
      category: "Racquets",
      daysAgo: 7,
    },
    {
      id: "sw-blog-lifestyle",
      title: "Lifestyle Center summer programming",
      excerpt:
        "Fitness classes, spa recovery, and Lifestyle Café hours for the warm season.",
      body: "Train before tee times in the Lifestyle Center, then recover in the spa. Group classes fill quickly — check the calendar. Lifestyle Café opens early for smoothies and protein bowls.",
      author: "Lifestyle Center Team",
      category: "Wellness",
      daysAgo: 9,
    },
    {
      id: "sw-blog-welcome",
      title: "Welcome to Shadow Wood Country Club",
      excerpt:
        "Simple ways to settle in — golf, racquets, dining, and community groups.",
      body: "Start with a casual meal at the Grill Room or Poolside, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes, and Danita Osborn is happy to answer real-estate questions.",
      author: "Amanda Reeves",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-blog-comment-golf-1",
      postId: "sw-blog-five-courses",
      author: MEMBER_NAME,
      body: "Preserve at dawn is unbeatable — thanks for the routing tips, Kevin!",
    },
    {
      id: "sw-blog-comment-golf-2",
      postId: "sw-blog-five-courses",
      author: SOCIAL_NAME,
      body: "South Course was in perfect shape last weekend.",
    },
    {
      id: "sw-blog-comment-breezeway-1",
      postId: "sw-blog-breezeway",
      author: MEMBER_NAME,
      body: "Poolside after tennis is our Saturday ritual now.",
    },
    {
      id: "sw-blog-comment-pickle-1",
      postId: "sw-blog-pickleball",
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
      id: "sw-newsletter-july-2026",
      title: "Shadow Wood Country Club Summer Update — July 2026",
      summary:
        "three courses in peak condition, Lifestyle Center pool socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Shadow Wood Country Club. All three championship courses — North, South, and Preserve — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Main Dining, Grill Room, and Poolside Dining — reserve in Dining",
        "• Lifestyle Center pool social with live music",
        "• Pickleball round-robin on six indoor courts — Thursdays",
        "• Eight Har-Tru tennis courts, six indoor pickleball courts, and three bocce courts",
        "",
        "Questions: Membership · (239) 992-6000 · 22801 Oakwilde Blvd, Estero, FL 34135 · dosborn@shadowwoodcc.com",
        "",
        "— Amanda Reeves",
        "Membership & Communications",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "sw-newsletter-golf-racquets",
      title: "Golf & Racquets Roundup",
      summary:
        "Course notes from Kevin Morales, Har-Tru tennis, indoor pickleball clinics, and bocce socials.",
      body: [
        "Golf & Racquets members,",
        "",
        "Golf: Rees Jones and Rees Jones courses are playing firm and fast. Warm up on the practice range, then book lessons with Kevin Morales or Laura Chen.",
        "",
        "Racquets: Lauren Price and Chris Adler are booking tennis on green clay; Megan Walsh covers pickleball across six indoor courts. Oliver Grant coordinates bocce socials.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app.",
        "",
        "— Golf Shop & Racquet Pros",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "sw-newsletter-dining",
      title: "Dining at Shadow Wood — Midsummer Menus",
      summary:
        "Grill Room lunches, Main Dining wine dinners, and Lifestyle Center poolside evenings.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across clubhouse and poolside venues. After tennis or a lap swim, Poolside Dining is the easy stop. Evening reservations for Main Clubhouse Dining book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "Both North and South clubhouses serve dining and events — reserve through the same Dining line.",
        "",
        "— Shadow Wood Dining",
        "dining@shadowwoodcc.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "sw-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Shadow Wood Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Shadow Wood neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "Shadow Wood does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Danita Osborn at dosborn@shadowwoodcc.com · (239) 992-6000 · 22801 Oakwilde Blvd, Estero, FL 34135.",
        "",
        "Thank you for making Shadow Wood Country Club a vibrant member-owned community.",
        "",
        "— Club Administration · Thomas Brennan, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-gallery-bay-island",
      title: "Preserve 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Kevin Morales",
      daysAgo: 1,
    },
    {
      id: "sw-gallery-clubhouse",
      title: "Main Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "sw-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Laura Chen",
      daysAgo: 3,
    },
    {
      id: "sw-gallery-pickleball",
      title: "Pickleball courts — round-robin",
      category: "Racquets",
      url: brandAssets.amenityPickleball,
      uploadedBy: "Megan Walsh",
      daysAgo: 4,
    },
    {
      id: "sw-gallery-tennis",
      title: "Har-Tru green clay courts",
      category: "Racquets",
      url: brandAssets.amenityTennisClay,
      uploadedBy: "Lauren Price",
      daysAgo: 5,
    },
    {
      id: "sw-gallery-croquet",
      title: "Bocce courts at dusk",
      category: "Social",
      url: brandAssets.amenityBocce,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 6,
    },
    {
      id: "sw-gallery-fitness",
      title: "Lifestyle Center fitness",
      category: "Wellness",
      url: brandAssets.amenityFitness,
      uploadedBy: "Lifestyle Center Team",
      daysAgo: 7,
    },
    {
      id: "sw-gallery-dining",
      title: "Main Dining & Grill Room",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Shadow Wood Dining",
      daysAgo: 8,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
      id: "sw-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "22840 Oakwilde Blvd, Estero, FL 34135",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "sw-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "22755 Shadow Wood Lane, Estero, FL 34135",
      type: "Investment property",
      owner: true,
    },
    {
      id: "sw-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "22910 Shadow Wood Blvd, Estero, FL 34135",
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
  const patriciaEmail = "dosborn@shadowwoodcc.com";
  const listings = [
    {
      id: "sw-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Oakwilde Estate with Preserve Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Preserve Course views and easy access to the Lifestyle Center. Listed with Danita Osborn, Shadow Wood Realty.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 Oakwilde Blvd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "sw-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Shadow Wood Blvd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and preserve backdrop. Walking distance to pickleball, croquet, and Poolside Dining.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 Shadow Wood Blvd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "sw-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Shadow Wood Lane Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking Rees Jones marshland. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "22755 Shadow Wood Lane",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.amenitySpa],
      daysAgo: 6,
    },
    {
      id: "sw-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — Oakwilde Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Lifestyle Center. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "22780 Oakwilde Court",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.amenityFitness],
      daysAgo: 8,
    },
    {
      id: "sw-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Lifestyle Center Adjacent Condo",
      description:
        "Two-bedroom condo steps from the Lifestyle Center — lock-and-leave for snowbirds with full social and racquet access.",
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
        communityId: SHADOW_WOOD_COMMUNITY_ID,
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
