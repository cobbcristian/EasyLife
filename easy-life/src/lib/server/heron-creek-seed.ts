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
 * Heron Creek Golf & Country Club — North Port, FL demo tenant.
 * 5301 Heron Creek Blvd, North Port, FL 34287 · (941) 240-5100
 * Arthur Hills 27 holes (Oaks, Marsh, Creek), 5 lighted Har-Tru tennis, fitness, pool & spa.
 */
export const HERON_CREEK_COMMUNITY_ID = "heron-creek";
const MEMBER_EMAIL = "member.demo@heroncreekgcc.com";
const MEMBER_NAME = "Megan Torres";
const SOCIAL_EMAIL = "member.social@heroncreekgcc.com";
const SOCIAL_NAME = "Ryan Patel";
const PM_EMAIL = "pm.demo@heroncreekgcc.com";
const PM_NAME = "Richelle Harris";
const BOARD_EMAIL = "board.demo@heroncreekgcc.com";
const BOARD_NAME = "Alan Briggs";
const CLUB_PHONE = "(941) 240-5100";
const DINING_EMAIL = "dining@heroncreekgcc.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const clubhouseHours = defaultDailyHours("09:00", "21:00");

/** Heron's Roost Grille — lunch daily, dinner Tue–Sat. */
const grillHours: WeeklyHours = {
  mon: { open: "11:00", close: "15:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "19:00" },
};

/** Top of the Green — dinner Thu–Sat. */
const mainDiningHours: WeeklyHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:00" },
  sat: { open: "17:00", close: "21:00" },
  sun: null,
};

/** Courtside Café — seasonal lunch daily. */
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
    id: "hc-amenity-golf-oaks",
    name: "Oaks Nine",
    description:
      "Arthur Hills · 9 holes — one of Heron Creek's three nines (Oaks, Marsh, Creek).",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hc-amenity-golf-marsh",
    name: "Marsh Nine",
    description:
      "Arthur Hills · 9 holes through marsh vistas — one of Heron Creek's three nines.",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hc-amenity-golf-creek",
    name: "Creek Nine",
    description:
      "Arthur Hills · 9 holes along creek corridors — complete the 27-hole routing with Oaks and Marsh.",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hc-amenity-range",
    name: "Practice Range & Short Game",
    description:
      "Full driving range, chipping greens, and putting complex serving the Oaks, Marsh, and Creek nines.",
    kind: "driving_range",
    unitCount: 20,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "hc-amenity-tennis",
    name: "Har-Tru Tennis Courts",
    description:
      "Five lighted green-clay Har-Tru courts with professional staff, leagues, and private lessons.",
    kind: "court",
    unitCount: 5,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "hc-amenity-pool",
    name: "Resort Pool & Spa",
    description:
      "Resort-style pool and spa — hub for family swim, recovery, and summer socials.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "hc-amenity-fitness",
    name: "Fitness Center",
    description:
      "Full fitness center with personal training, group classes, and spa recovery.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "hc-amenity-dining-main",
    name: "Top of the Green",
    description:
      "Main dining room with elevated clubhouse views — Heron Creek's signature dining experience.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: mainDiningHours,
  },
  {
    id: "hc-amenity-dining-grill",
    name: "Heron's Roost Grille",
    description: "Casual grille for post-round burgers, salads, and cold drinks.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "hc-amenity-dining-courtside",
    name: "Courtside Café",
    description: "Light fare and refreshments near the tennis courts — lunch, snacks, and beverages.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: cabanaHours,
  },
  {
    id: "hc-amenity-clubhouse",
    name: "Clubhouse",
    description: "Main clubhouse serving golf, dining, fitness, and member events.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "hc-staff-gm",
    name: "Marcus Hale",
    title: "General Manager",
    department: "Club Management",
    email: "gm@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "hc-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "hc-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "hc-staff-michael",
    name: "Kevin Morales",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "hc-staff-laura",
    name: "Laura Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "laura.chen@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "hc-staff-david",
    name: "David Okonkwo",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "david.okonkwo@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "hc-staff-sophia",
    name: "Lauren Price",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "sophia.reyes@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "hc-staff-ethan",
    name: "Chris Adler",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "ethan.brooks@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "hc-staff-fitness",
    name: "Fitness Center Desk",
    title: "Personal Training & Group Classes",
    department: "Fitness",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 30,
  },
  {
    id: "hc-staff-dining",
    name: "Dining Reservations",
    title: "Top of the Green · Heron's Roost · Courtside",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "hc-staff-realtor",
    name: "Membership Office",
    title: "Membership · Real Estate Inquiries",
    department: "Membership",
    email: "membership@heroncreekgcc.com",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "hc-pro-michael",
    name: "Kevin Morales",
    email: "golf@heroncreekgcc.com",
    category: "golf",
    description:
      "Director of Golf. Instruction across the Arthur Hills 27 — Oaks, Marsh, and Creek nines.",
  },
  {
    id: "hc-pro-laura",
    name: "Laura Chen",
    email: "laura.chen@heroncreekgcc.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on the practice range.",
  },
  {
    id: "hc-pro-sophia",
    name: "Lauren Price",
    email: "sophia.reyes@heroncreekgcc.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on five lighted Har-Tru green clay courts.",
  },
  {
    id: "hc-pro-ethan",
    name: "Chris Adler",
    email: "ethan.brooks@heroncreekgcc.com",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Doubles strategy, junior development, and match-play coaching.",
  },
] as const;

/** Top of the Green, Heron's Roost, and Courtside Café menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "hc-menu-b-club", name: "Courtside Club Sandwich", price: 15, category: "Courtside Café · Sandwiches" },
  { id: "hc-menu-b-wrap", name: "Grilled Chicken Wrap", price: 14, category: "Courtside Café · Sandwiches" },
  { id: "hc-menu-b-smoothie", name: "Tropical Green Smoothie", price: 9, category: "Courtside Café · Beverages" },
  { id: "hc-menu-b-salad", name: "Courtside Cobb Salad", price: 15, category: "Courtside Café · Salads" },
  { id: "hc-menu-b-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Courtside Café · Beverages" },
  { id: "hc-menu-g-burger", name: "Heron Creek Burger", price: 17, category: "Heron's Roost · Favorites" },
  { id: "hc-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "Heron's Roost · Favorites" },
  { id: "hc-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "Heron's Roost · Salads" },
  { id: "hc-menu-g-wings", name: "Heron's Roost Wings", price: 15, category: "Heron's Roost · Starters" },
  { id: "hc-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "Heron's Roost · Favorites" },
  { id: "hc-menu-m-filet", name: "Filet Mignon (8 oz)", price: 48, category: "Top of the Green · Entrées" },
  { id: "hc-menu-m-snapper", name: "Pan-Seared Red Snapper", price: 38, category: "Top of the Green · Entrées" },
  { id: "hc-menu-m-risotto", name: "Wild Mushroom Risotto", price: 26, category: "Top of the Green · Entrées" },
  { id: "hc-menu-m-cake", name: "Key Lime Tart", price: 10, category: "Top of the Green · Desserts" },
  { id: "hc-menu-c-shrimp", name: "Grilled Gulf Shrimp Skewers", price: 16, category: "Courtside Café · Small Plates" },
  { id: "hc-menu-c-ceviche", name: "Citrus Ceviche", price: 14, category: "Courtside Café · Small Plates" },
  { id: "hc-menu-c-margarita", name: "Sunset Margarita", price: 12, category: "Courtside Café · Bar" },
  { id: "hc-menu-l-yogurt", name: "Fitness Café Açaí Bowl", price: 11, category: "Fitness Café · Breakfast" },
  { id: "hc-menu-l-protein", name: "Protein Power Wrap", price: 13, category: "Fitness Café · Lunch" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      pro.category === "golf" ? "Golf" : "Tennis";
    await prisma.provider.upsert({
      where: { id: pro.id },
      create: {
        id: pro.id,
        name: pro.name,
        email: pro.email,
        description: pro.description,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
    where: { id: "hc-provider-dining" },
    create: {
      id: "hc-provider-dining",
      communityId: HERON_CREEK_COMMUNITY_ID,
      name: "Heron Creek Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Top of the Green, Heron's Roost Grille, and Courtside Café.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Heron Creek Dining",
      rating: 4.9,
      description:
        "Top of the Green, Heron's Roost Grille, and Courtside Café.",
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
    id: "hc-vendor-lawn",
    name: "Heron Creek Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@heroncreekgcc.com",
    phone: "(941) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Heron Creek homes off Heron Creek Blvd.",
  },
  {
    id: "hc-vendor-pool",
    name: "Marsh Pool Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@heroncreekgcc.com",
    phone: "(941) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for Heron Creek estates.",
  },
  {
    id: "hc-vendor-clean",
    name: "Heron Nest Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@heroncreekgcc.com",
    phone: "(941) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in Heron Creek Golf & Country Club.",
  },
  {
    id: "hc-vendor-hvac",
    name: "North Port Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@heroncreekgcc.com",
    phone: "(941) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "hc-vendor-plumb",
    name: "Heron Creek Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@heroncreekgcc.com",
    phone: "(941) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Heron Creek members.",
  },
  {
    id: "hc-vendor-windows",
    name: "Tree Line Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@heroncreekgcc.com",
    phone: "(941) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "hc-vendor-pest",
    name: "Bonita Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@heroncreekgcc.com",
    phone: "(941) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Heron Creek properties.",
  },
  {
    id: "hc-vendor-handyman",
    name: "Heron Creek Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@heroncreekgcc.com",
    phone: "(941) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "hc-vendor-paint",
    name: "Canopy Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@heroncreekgcc.com",
    phone: "(941) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Heron Creek.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-event-ladies-golf",
      title: "Ladies Day — Oaks Nine",
      description: "Weekly Ladies Day shotgun on the Oaks Nine followed by lunch in the Heron's Roost Grille.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "Oaks Nine",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hc-event-mens-golf",
      title: "Men's Day — Marsh Nine",
      description: "Marsh Nine member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "Marsh Nine",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hc-event-couples",
      title: "Couples Scramble & Wine Dinner",
      description: "Nine-hole couples scramble on the Creek Nine followed by wine dinner in Top of the Green.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Creek Nine",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "hc-event-spa-evening",
      title: "Spa Recovery Evening",
      description: "Guided stretch and spa recovery after afternoon tennis — light refreshments included.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Resort Pool & Spa",
      category: "wellness",
      isPromoted: true,
      capacity: 40,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hc-event-tennis-mixer",
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
      id: "hc-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering on the clubhouse terrace with light bites from Courtside Café.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Clubhouse Terrace",
      category: "social",
      isPromoted: false,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hc-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in Top of the Green.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Top of the Green",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "hc-event-pool-social",
      title: "Resort Pool & Spa Social",
      description: "Live acoustic music and happy hour at the resort pool.",
      date: easternDateOffset(8),
      time: "17:00",
      location: "Resort Pool & Spa",
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
      create: { ...event, communityId: HERON_CREEK_COMMUNITY_ID, createdBy: "Heron Creek Golf & Country Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "hc-booking-golf",
      amenityId: "hc-amenity-golf-creek",
      unitNumber: 1,
      amenity: "Creek Nine",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "hc-booking-tennis",
      amenityId: "hc-amenity-tennis",
      unitNumber: 3,
      amenity: "Har-Tru Tennis Courts",
      date: easternDateOffset(1),
      startTime: "10:00",
      endTime: "11:30",
    },
    {
      id: "hc-booking-fitness",
      amenityId: "hc-amenity-fitness",
      unitNumber: 1,
      amenity: "Fitness Center",
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
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-announcement-golf",
      title: "three courses, 54 holes — summer tee times",
      body: "Oaks, Marsh, and Creek are in peak summer condition. Book tee times through the golf shop — early mornings recommended for the coolest rounds.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "hc-announcement-tennis",
      title: "Five lighted Har-Tru courts — surface maintenance complete",
      body: "All eight green-clay Har-Tru courts have completed rolling and irrigation calibration. Book courts in the member app or contact Lauren Price for lesson availability.",
      author: "Racquet Sports",
      priority: "normal",
    },
    {
      id: "hc-announcement-breezeway",
      title: "Courtside Café open daily at the Fitness Center",
      body: "Courtside Café lunch, smoothies, and post-tennis refreshments — steps from the Har-Tru courts and resort pool.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: HERON_CREEK_COMMUNITY_ID },
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
      id: "hc-document-club-guide",
      title: "Heron Creek Golf & Country Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 5,
    },
    {
      id: "hc-document-dues",
      title: "Membership Fees (Public Figures) — Golf & Sports",
      category: "membership",
      url: "#",
      uploadedBy: "Membership Office",
      daysAgo: 2,
    },
    {
      id: "hc-document-golf-courses",
      title: "Golf Course Guide — 3 Courses / 54 holes",
      category: "golf",
      url: "#",
      uploadedBy: "Kevin Morales · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "hc-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "hc-document-racquets",
      title: "Racquet Sports — 5 Lighted Har-Tru Tennis",
      category: "sports",
      url: "#",
      uploadedBy: "Fitness Center",
      daysAgo: 10,
    },
    {
      id: "hc-document-dining",
      title: "Dining Hours — Top of the Green · Roost · Courtside",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "hc-document-lifestyle",
      title: "Fitness Center, Pool & Spa Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Fitness Center",
      daysAgo: 12,
    },
    {
      id: "hc-document-naples",
      title: "Guest & Family Access Guide",
      category: "dining",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "hc-document-real-estate",
      title: "Featured Homes — Heron Creek Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership Office · Heron Creek Realty",
      daysAgo: 4,
    },
    {
      id: "hc-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Alan Briggs · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-group-golfers",
      name: "Heron Creek Golfers",
      description:
        "Arthur Hills 27 holes across three nines — Oaks, Marsh, and Creek. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "hc-group-ladies-golf",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on Oaks and rotating nines — Heron's Roost Grille lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "hc-group-tennis",
      name: "Har-Tru Tennis",
      description: "Five lighted green-clay courts — lessons with Lauren Price & Chris Adler, leagues, and mixers.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "hc-group-spa",
      name: "Pool & Spa Circle",
      description: "Resort pool socials, spa recovery evenings, and summer swim gatherings.",
      color: "from-sky-400 to-blue-700",
      members: 168,
    },
    {
      id: "hc-group-fitness",
      name: "Fitness Center",
      description: "Group classes, personal training, spa recovery, and Fitness Café meetups.",
      color: "from-teal-400 to-cyan-700",
      members: 312,
    },
    {
      id: "hc-group-social",
      name: "Heron Creek Social Scene",
      description: "Wine dinners, pool socials, and Fitness Center evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "hc-group-neighbors",
      name: "Neighbors at Heron Creek",
      description: "Welcome notes, ride shares, and recommendations around Heron Creek Blvd and the community.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
    "hc-group-golfers",
    "hc-group-ladies-golf",
    "hc-group-tennis",
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
    "hc-group-social",
    "hc-group-tennis",
    "hc-group-spa",
    "hc-group-fitness",
    "hc-group-neighbors",
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
    { email: MEMBER_EMAIL, label: "Book Oaks Nine golf", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "27-hole tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Top of the Green & Heron's Roost", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Resort pool & spa", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Courtside Café", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Fitness Center", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Fitness Center", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Courtside Café", href: "/member/dining" },
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
  const michael = { email: "golf@heroncreekgcc.com", name: "Kevin Morales" };
  const laura = { email: "laura.chen@heroncreekgcc.com", name: "Laura Chen" };
  const sophia = { email: "sophia.reyes@heroncreekgcc.com", name: "Lauren Price" };
  const megan = { email: "sophia.reyes@heroncreekgcc.com", name: "Lauren Price" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: "membership@heroncreekgcc.com", name: "Membership Office" };
  const frederick = { email: "gm@heroncreekgcc.com", name: "Marcus Hale" };
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
      id: "hc-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Michael — can we do a playing lesson on Creek Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on Creek — we'll focus on club selection and wind off the marsh.",
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
      id: "hc-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Megan — Court 4 is open Saturday at 10 for your Har-Tru lesson. We'll work on your kick serve.",
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
      id: "hc-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in Top of the Green Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Top of the Green. The snapper and filet are chef's highlights this week.",
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
      id: "hc-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Megan — saw you booked Har-Tru for Saturday. Anything specific to focus on?",
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
      id: "hc-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Megan — tennis mixer tonight at 5 if you're free. Loser buys Courtside smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got Oaks Nine in the morning — rain check for the pool social Friday?",
          hoursAgo: 7,
        },
        {
          author: robert,
          body: "Friday works. See you at the resort pool.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "hc-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold Courtside seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Courtside table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "hc-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Laura — guest rate for my sister on Marsh Nine Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies — I can put you on a 2:30 tee on Marsh. Course conditions are excellent this week.",
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
      id: "hc-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Richelle — my guest pass for Saturday Marsh Nine still shows pending. Can Membership confirm?",
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
      id: "hc-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Megan — 5310 Heron Creek Blvd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about Creek Nine views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Heron Creek Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "hc-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Megan — any member comments for the July board packet? We're covering Fitness Center hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the pool socials on the calendar through October — they've been wonderful for the community.",
          hoursAgo: 42,
        },
        {
          author: frederick,
          body: "Noted — Richelle will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "hc-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Megan — board meeting next week covers the spa renovation timeline. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Spa recovery after morning rounds would be great — early appointment slots if possible.",
          hoursAgo: 48,
        },
        {
          author: james,
          body: "Thank you — I'll share that with Marcus and the fitness team.",
          hoursAgo: 46,
        },
      ],
    },
    {
      id: "hc-chat-tennis-group",
      kind: "group",
      title: "Har-Tru Tennis Mixer",
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
          body: "Yes — see you at 4. Loser buys Courtside smoothies?",
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
        communityId: HERON_CREEK_COMMUNITY_ID,
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

export async function ensureHeronCreekDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: HERON_CREEK_COMMUNITY_ID },
    create: {
      id: HERON_CREEK_COMMUNITY_ID,
      name: "Heron Creek Golf & Country Club",
      location: "North Port, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityHeronCreek,
      primaryColor: "#1b4332",
      appDisplayName: "Heron Creek",
      inviteCode: "heron-creek-demo",
    },
    update: {
      name: "Heron Creek Golf & Country Club",
      location: "North Port, FL",
      logoUrl: brandAssets.communityHeronCreek,
      primaryColor: "#1b4332",
      appDisplayName: "Heron Creek",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-hc-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-hc-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-hc-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-hc-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: HERON_CREEK_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: HERON_CREEK_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "5310 Heron Creek Blvd",
      householdAddress: "5310 Heron Creek Blvd, North Port, FL 34287",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "5320 Heron Creek Blvd",
      householdAddress: "5320 Heron Creek Blvd, North Port, FL 34287",
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

  await ensureMembershipTiersSeeded(HERON_CREEK_COMMUNITY_ID);
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
export async function ensureHeronCreekDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureHeronCreekDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureHeronCreekDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureHeronCreekDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureHeronCreekDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureHeronCreekDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureHeronCreekDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "5310 Heron Creek Blvd",
      title: "Guest pass pending for Saturday Marsh Nine tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on Marsh Nine — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "5310 Heron Creek Blvd",
      title: "Irrigation overspray on Heron Creek driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 22840 Heron Creek soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "5310 Heron Creek Blvd",
      title: "Har-Tru Court 6 net needs tightening",
      category: "Amenities",
      description: "Net sags in the middle on Court 6 — Saturday mixer is affected.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "5320 Heron Creek Blvd",
      title: "Pool string lights out",
      category: "Maintenance",
      description: "Half the pool string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "5320 Heron Creek Blvd",
      title: "Resort pool towel cabinet empty",
      category: "Amenities",
      description: "Pool towel stock at the resort pool was empty twice this week after noon.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "5310 Heron Creek Blvd",
      title: "Har-Tru Court 4 wind screen torn",
      category: "Maintenance",
      description: "Wind screen on Court 4 has a tear near the post — affects afternoon play.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: HERON_CREEK_COMMUNITY_ID,
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
        communityId: HERON_CREEK_COMMUNITY_ID,
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
  const proShop = "Heron Creek Pro Shop";
  const apparel = [
    {
      id: "hc-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered Heron Creek crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/hc-apparel-polo-navy.png",
    },
    {
      id: "hc-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for tennis and warm North Port rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/hc-apparel-polo-navy.png",
    },
    {
      id: "hc-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool North Port mornings on Oaks or Creek.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/hc-apparel-quarter-zip.png",
    },
    {
      id: "hc-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered Heron Creek crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hc-apparel-cap-navy.png",
    },
    {
      id: "hc-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for Har-Tru tennis and resort pool days.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hc-apparel-cap-navy.png",
    },
    {
      id: "hc-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hc-apparel-polo-navy.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      communityId: HERON_CREEK_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — Creek Nine tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: HERON_CREEK_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "hc-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "hc-apparel-cap",
            name: "Performance Cap — Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo — Creek Nine tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "hc-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on Heron Creek after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "5310 Heron Creek Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "hc-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Heron Creek Blvd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "5320 Heron Creek Blvd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "hc-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Fitness",
      seller: "Lauren Price",
      unit: "5330 Heron Creek Lane",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "hc-marketplace-racquet",
      title: "Kids' Tennis Racquet",
      description: "Lightly used junior racquet for ages 8–12. Fresh grip and cover included.",
      price: 32,
      category: "Tennis",
      seller: "Chris Adler",
      unit: "5340 Marsh View Court",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 4,
    },
    {
      id: "hc-marketplace-polo",
      title: "Heron Creek Golf & Country Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "5310 Heron Creek Blvd",
      imageUrl: "/brand/apparel/hc-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "hc-marketplace-racquet",
      title: "Wilson Blade Tennis Racquet",
      description: "Junior tennis racquet — lightly used, great for Har-Tru clinics.",
      price: 85,
      category: "Tennis",
      seller: SOCIAL_NAME,
      unit: "5320 Heron Creek Blvd",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-blog-five-courses",
      title: "Playing all three nines this season",
      excerpt:
        "Director of Golf Kevin Morales shares routing tips for the Oaks, Marsh, and Creek nines.",
      body: "Heron Creek members enjoy Arthur Hills 27 holes across the Oaks, Marsh, and Creek nines. Book early mornings for the coolest conditions and ask the golf shop about multi-nine member events.",
      author: "Kevin Morales, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "hc-blog-breezeway",
      title: "Courtside Café favorites after tennis",
      excerpt:
        "Post-match smoothies, salads, and seating at Courtside Café.",
      body: "After Har-Tru tennis or a lap swim, the Courtside Café is the easy stop for light plates and cold drinks. Courtside Café picks up for sunset dining — reserve through Dining in the member app.",
      author: "Heron Creek Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "hc-blog-tennis-community",
      title: "Five lighted courts, one thriving community",
      excerpt:
        "Head Pro Lauren Price previews Thursday mixers and beginner clinics.",
      body: "With five lighted Har-Tru courts, Heron Creek runs rotating partners and skill-based pods so everyone meets more members. Book a court in the app, arrive ten minutes early, and stay for Courtside Café afterward.",
      author: "Lauren Price",
      category: "Racquets",
      daysAgo: 5,
    },
    {
      id: "hc-blog-tennis",
      title: "Har-Tru care and court booking tips",
      excerpt:
        "Head Pro Lauren Price on clay-court etiquette and the best lesson times.",
      body: "Our five lighted green-clay Har-Tru courts are rolled and irrigated daily. Slide into shots, avoid dragging feet at the baseline, and book lessons mid-morning when the surface is firmest. Chris Adler runs junior clinics on weekends.",
      author: "Lauren Price",
      category: "Racquets",
      daysAgo: 7,
    },
    {
      id: "hc-blog-lifestyle",
      title: "Fitness Center summer programming",
      excerpt:
        "Fitness classes, spa recovery, and Fitness Café hours for the warm season.",
      body: "Train before tee times in the Fitness Center, then recover in the spa. Group classes fill quickly — check the calendar. Fitness Café opens early for smoothies and protein bowls.",
      author: "Fitness Center Team",
      category: "Wellness",
      daysAgo: 9,
    },
    {
      id: "hc-blog-welcome",
      title: "Welcome to Heron Creek Golf & Country Club",
      excerpt:
        "Simple ways to settle in — golf, racquets, dining, and community groups.",
      body: "Start with a casual meal at Heron's Roost Grille or Courtside Café, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes, and the Membership Office is happy to answer real-estate questions.",
      author: "Richelle Harris",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-blog-comment-golf-1",
      postId: "hc-blog-five-courses",
      author: MEMBER_NAME,
      body: "Creek at dawn is unbeatable — thanks for the routing tips, Kevin!",
    },
    {
      id: "hc-blog-comment-golf-2",
      postId: "hc-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Marsh Nine was in perfect shape last weekend.",
    },
    {
      id: "hc-blog-comment-breezeway-1",
      postId: "hc-blog-breezeway",
      author: MEMBER_NAME,
      body: "Courtside after tennis is our Saturday ritual now.",
    },
    {
      id: "hc-blog-comment-tennis-1",
      postId: "hc-blog-tennis-community",
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
      id: "hc-newsletter-july-2026",
      title: "Heron Creek Golf & Country Club Summer Update — July 2026",
      summary:
        "Three nines in peak condition, resort pool socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Heron Creek Golf & Country Club. All three Arthur Hills nines — Oaks, Marsh, and Creek — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Top of the Green, Heron's Roost Grille, and Courtside Café — reserve in Dining",
        "• Resort pool social with live music",
        "• Har-Tru tennis mixer — Thursdays on the lighted courts",
        "• Five lighted Har-Tru tennis courts, fitness center, and resort pool & spa",
        "",
        "Questions: Membership · (941) 240-5100 · 5301 Heron Creek Blvd, North Port, FL 34287 · membership@heroncreekgcc.com",
        "",
        "— Richelle Harris",
        "Membership & Communications",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "hc-newsletter-golf-racquets",
      title: "Golf & Racquets Roundup",
      summary:
        "Course notes from Kevin Morales, Har-Tru tennis clinics, and fitness programming.",
      body: [
        "Golf & Racquets members,",
        "",
        "Golf: Oaks, Marsh, and Creek are playing firm and fast. Warm up on the practice range, then book lessons with Kevin Morales or Laura Chen.",
        "",
        "Racquets: Lauren Price and Chris Adler are booking tennis on five lighted Har-Tru courts.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app.",
        "",
        "— Golf Shop & Racquet Pros",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "hc-newsletter-dining",
      title: "Dining at Heron Creek — Midsummer Menus",
      summary:
        "Heron's Roost Grille lunches, Top of the Green wine dinners, and Courtside Café evenings.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Top of the Green, Heron's Roost Grille, and Courtside Café. After tennis or a lap swim, Courtside is the easy stop. Evening reservations for Top of the Green book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "Top of the Green, Heron's Roost Grille, and Courtside Café — reserve through the same Dining line.",
        "",
        "— Heron Creek Dining",
        "dining@heroncreekgcc.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "hc-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Heron Creek Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Heron Creek neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "Heron Creek does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership Office at membership@heroncreekgcc.com · (941) 240-5100 · 5301 Heron Creek Blvd, North Port, FL 34287.",
        "",
        "Thank you for making Heron Creek Golf & Country Club a vibrant member-owned community.",
        "",
        "— Club Administration · Marcus Hale, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-gallery-bay-island",
      title: "Creek ninth at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Kevin Morales",
      daysAgo: 1,
    },
    {
      id: "hc-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "hc-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Laura Chen",
      daysAgo: 3,
    },
    {
      id: "hc-gallery-pool",
      title: "Resort pool & spa",
      category: "Wellness",
      url: brandAssets.servicePool,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 4,
    },
    {
      id: "hc-gallery-tennis",
      title: "Har-Tru green clay courts",
      category: "Racquets",
      url: brandAssets.amenityTennisClay,
      uploadedBy: "Lauren Price",
      daysAgo: 5,
    },
    {
      id: "hc-gallery-spa",
      title: "Spa recovery lounge",
      category: "Wellness",
      url: brandAssets.amenitySpa,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 6,
    },
    {
      id: "hc-gallery-fitness",
      title: "Fitness Center",
      category: "Wellness",
      url: brandAssets.amenityFitness,
      uploadedBy: "Fitness Center Team",
      daysAgo: 7,
    },
    {
      id: "hc-gallery-dining",
      title: "Top of the Green & Heron's Roost",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Heron Creek Dining",
      daysAgo: 8,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
      id: "hc-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "5310 Heron Creek Blvd, North Port, FL 34287",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "hc-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "5330 Heron Creek Lane, North Port, FL 34135",
      type: "Investment property",
      owner: true,
    },
    {
      id: "hc-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "5320 Heron Creek Blvd, North Port, FL 34287",
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
  const patriciaEmail = "membership@heroncreekgcc.com";
  const listings = [
    {
      id: "hc-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Heron Creek Estate with Marsh Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Creek Nine views and easy access to the Fitness Center. Listed with the Membership Office.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 Heron Creek Blvd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "hc-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Heron Creek Blvd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to Har-Tru tennis, the fitness center, and Courtside Café.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 Heron Creek Blvd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "hc-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Heron Creek Lane Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking marshland near the Marsh Nine. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "5330 Heron Creek Lane",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.amenitySpa],
      daysAgo: 6,
    },
    {
      id: "hc-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — Heron Creek Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Fitness Center. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "5340 Marsh View Court",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.amenityFitness],
      daysAgo: 8,
    },
    {
      id: "hc-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Fitness Center Adjacent Condo",
      description:
        "Two-bedroom condo steps from the Fitness Center — lock-and-leave for snowbirds with full social and racquet access.",
      type: "sale",
      price: 695000,
      beds: 2,
      baths: 2,
      sqft: 1580,
      unit: "850 Neapolitan Way #1204",
      color: "from-amber-400 to-stone-700",
      images: [brandAssets.amenityEventSpace, brandAssets.amenityTennisClay],
      daysAgo: 10,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.realEstateListing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: HERON_CREEK_COMMUNITY_ID,
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
