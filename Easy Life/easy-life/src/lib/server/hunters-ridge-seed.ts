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
 * Hunters Ridge Golf & Country Club — Bonita Springs, FL demo tenant.
 * Private member-owned golf club (420 golf members, no Chelsea system).
 * 28400 Hunters Ridge Blvd., Bonita Springs, FL 34135 · 239.273.8114
 */
export const HUNTERS_RIDGE_COMMUNITY_ID = "hunters-ridge";
const MEMBER_EMAIL = "member.demo@huntersridge-ca.com";
const MEMBER_NAME = "Grace Holloway";
const SOCIAL_EMAIL = "member.social@huntersridge-ca.com";
const SOCIAL_NAME = "Peter Callahan";
const PM_EMAIL = "pm.demo@huntersridge-ca.com";
const PM_NAME = "Naomi Weathers";
const BOARD_EMAIL = "board.demo@huntersridge-ca.com";
const BOARD_NAME = "Don Huprich";
const CLUB_PHONE = "(239) 273-8114";
const DINING_EMAIL = "dining@huntersridge-ca.com";

const golfHours = defaultDailyHours("07:00", "19:00");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const clubhouseHours = defaultDailyHours("09:00", "21:00");

/** Grill Room — lunch + after-golf gathering daily except Monday. */
const grillHours: WeeklyHours = {
  mon: null,
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "19:00" },
};

/** The Ridge poolside snack bar — daily with happy hour. */
const ridgeHours = defaultDailyHours("10:00", "18:00");

/** Formal dining room — dinner service Thu–Sat. */
const formalHours: WeeklyHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:00" },
  sat: { open: "17:00", close: "21:00" },
  sun: null,
};

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
    id: "hr-amenity-golf",
    name: "Championship Golf Course",
    description:
      "18 holes with 5 sets of tees — golf members play as often as they choose (no Chelsea system). Daily tee times 3 days in advance. Private golf carts with paid trackage. Professional PGA staff.",
    kind: "golf_course",
    unitCount: 4,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "hr-amenity-range",
    name: "Driving Range",
    description:
      "Full driving range with chipping and putting greens. Golf instruction available from the PGA staff.",
    kind: "driving_range",
    unitCount: 20,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "hr-amenity-short-game",
    name: "Chipping & Putting Greens",
    description: "Dedicated short-game practice area next to the driving range.",
    kind: "facility",
    unitCount: 2,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "hr-amenity-simulators",
    name: "Golf Simulator Studios",
    description:
      "Three indoor golf simulator studios — practice, play famous courses, and take instruction year-round.",
    kind: "facility",
    unitCount: 3,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "hr-amenity-pickleball",
    name: "Pickleball Courts",
    description: "Eight pickleball courts with open play, leagues, and clinics. Lessons with Avery Quinn and Jordan Blake.",
    kind: "court",
    unitCount: 8,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "hr-amenity-tennis",
    name: "Tennis Courts",
    description: "Two Har-Tru green clay tennis courts. Private lessons with Rachel Delgado and Marcus Hale.",
    kind: "court",
    unitCount: 2,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "hr-amenity-bocce",
    name: "Bocce Courts",
    // facility (not court) so Hours groups under Club amenities, not Tennis
    kind: "facility",
    description: "Four bocce courts for league and social play.",
    unitCount: 4,
    holes: null,
    surface: "bocce",
    hoursJson: racquetHours,
  },
  {
    id: "hr-amenity-fitness",
    name: "Fitness Center",
    description:
      "Community Center fitness center with stunning golf course views, spacious exercise areas, onsite fitness instructor, personal training, and a variety of fitness classes.",
    kind: "gym",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "hr-amenity-pool",
    name: "Resort-Style Pool & Spa",
    description:
      "2,500-square-foot resort-style pool and spa surrounded by a large sun deck at the Community Center. The Ridge Poolside Café serves food and beverages daily.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "hr-amenity-grill",
    name: "Grill Room",
    description:
      "Casual grill room in the clubhouse — wonderful for lunch or an after-golf gathering place.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "hr-amenity-patio-bar",
    name: "Club Patio Bar",
    description: "Outdoor Club Patio Bar off the clubhouse — drinks and small plates.",
    kind: "restaurant",
    unitCount: 10,
    holes: null,
    hoursJson: ridgeHours,
  },
  {
    id: "hr-amenity-formal-dining",
    name: "Formal Dining Room",
    description:
      "Newly designed formal dining room for intimate dinners for two or dinner parties with family and friends.",
    kind: "restaurant",
    unitCount: 16,
    holes: null,
    hoursJson: formalHours,
  },
  {
    id: "hr-amenity-ridge",
    name: "The Ridge Poolside Snack Bar",
    description:
      "Poolside café with sandwiches, salads, a full-service bar with daily happy hours, and locally homemade Royal Scoop ice cream.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: ridgeHours,
  },
  {
    id: "hr-amenity-community-center",
    name: "Community Center",
    description:
      "The new Community Center — fitness center, gathering spaces, resort pool and spa, and The Ridge Poolside Café.",
    kind: "event_space",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "hr-staff-don",
    name: BOARD_NAME,
    title: "General Manager",
    department: "Club Management",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "hr-staff-naomi",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "hr-staff-steve",
    name: "Steve Pinger",
    title: "Director of Golf",
    department: "Golf",
    email: "steve@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "hr-staff-benjamin",
    name: "Benjamin Gensmer",
    title: "First Assistant Professional",
    department: "Golf",
    email: "agp@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "hr-staff-jose",
    name: "Jose Garcia",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "jose@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "hr-staff-rachel",
    name: "Rachel Delgado",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "rachel@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "hr-staff-marcus",
    name: "Marcus Hale",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "marcus@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "hr-staff-avery",
    name: "Avery Quinn",
    title: "Pickleball Director",
    department: "Pickleball",
    email: "avery@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 22,
  },
  {
    id: "hr-staff-jordan",
    name: "Jordan Blake",
    title: "Pickleball Instructor",
    department: "Pickleball",
    email: "jordan@huntersridge-ca.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 23,
  },
  {
    id: "hr-staff-fitness",
    name: "Community Center Fitness Desk",
    title: "Onsite Fitness Instructor · Personal Training & Classes",
    department: "Fitness",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 30,
  },
  {
    id: "hr-staff-dining",
    name: "Dining Reservations",
    title: "Grill Room · Formal Dining · The Ridge",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 30,
  },
  {
    id: "hr-staff-marsha",
    name: "Marsha Lynn",
    title: "Broker · Hunters Ridge Realty Co.",
    department: "Real Estate",
    email: "marsha@huntersridge.net",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "hr-pro-steve",
    name: "Steve Pinger",
    email: "steve@huntersridge-ca.com",
    category: "golf",
    description:
      "Director of Golf. PGA instruction on the range, short-game area, or in the 3 golf simulator studios.",
  },
  {
    id: "hr-pro-benjamin",
    name: "Benjamin Gensmer",
    email: "agp@huntersridge-ca.com",
    category: "golf",
    description:
      "First Assistant Professional. Private golf instruction available — book range or simulator sessions.",
  },
  {
    id: "hr-pro-rachel",
    name: "Rachel Delgado",
    email: "rachel@huntersridge-ca.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on the two Har-Tru green clay courts.",
  },
  {
    id: "hr-pro-marcus",
    name: "Marcus Hale",
    email: "marcus@huntersridge-ca.com",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Stroke clinics, match play coaching, and private lessons.",
  },
  {
    id: "hr-pro-avery",
    name: "Avery Quinn",
    email: "avery@huntersridge-ca.com",
    category: "pickleball",
    description:
      "Pickleball Director. Lessons and open-play clinics across all eight pickleball courts.",
  },
  {
    id: "hr-pro-jordan",
    name: "Jordan Blake",
    email: "jordan@huntersridge-ca.com",
    category: "pickleball",
    description:
      "Pickleball Instructor. Beginner-friendly drills and competitive private sessions.",
  },
] as const;

/** Grill Room + The Ridge poolside snack bar menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  // The Ridge — poolside
  { id: "hr-menu-r-club", name: "Ridge Club Sandwich", price: 14, category: "The Ridge · Sandwiches" },
  { id: "hr-menu-r-blt", name: "Applewood BLT", price: 12, category: "The Ridge · Sandwiches" },
  { id: "hr-menu-r-wrap", name: "Grilled Chicken Caesar Wrap", price: 13, category: "The Ridge · Sandwiches" },
  { id: "hr-menu-r-burger", name: "Ridge Cheeseburger", price: 15, category: "The Ridge · Sandwiches" },
  { id: "hr-menu-r-cobb", name: "Poolside Cobb Salad", price: 14, category: "The Ridge · Salads" },
  { id: "hr-menu-r-caprese", name: "Tomato Caprese Salad", price: 12, category: "The Ridge · Salads" },
  { id: "hr-menu-r-scoop-1", name: "Royal Scoop Ice Cream (single)", price: 5, category: "The Ridge · Royal Scoop" },
  { id: "hr-menu-r-scoop-2", name: "Royal Scoop Sundae", price: 8, category: "The Ridge · Royal Scoop" },
  { id: "hr-menu-r-happy-beer", name: "Happy Hour Draft Beer", price: 5, category: "The Ridge · Bar" },
  { id: "hr-menu-r-happy-wine", name: "Happy Hour House Wine", price: 6, category: "The Ridge · Bar" },
  { id: "hr-menu-r-margarita", name: "Poolside Margarita", price: 10, category: "The Ridge · Bar" },
  // Grill Room
  { id: "hr-menu-g-wings", name: "Clubhouse Chicken Wings", price: 14, category: "Grill Room · Starters" },
  { id: "hr-menu-g-quesadilla", name: "Chicken Quesadilla", price: 13, category: "Grill Room · Starters" },
  { id: "hr-menu-g-caesar", name: "Classic Caesar Salad", price: 12, category: "Grill Room · Salads" },
  { id: "hr-menu-g-burger", name: "Hunters Ridge Burger", price: 16, category: "Grill Room · Favorites" },
  { id: "hr-menu-g-reuben", name: "Grilled Reuben", price: 15, category: "Grill Room · Favorites" },
  { id: "hr-menu-g-fishtacos", name: "Gulf Fish Tacos", price: 17, category: "Grill Room · Favorites" },
  { id: "hr-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "Grill Room · Favorites" },
  // Formal Dining Room
  { id: "hr-menu-f-filet", name: "Filet Mignon (8 oz)", price: 42, category: "Formal Dining · Entrées" },
  { id: "hr-menu-f-grouper", name: "Pan-Seared Gulf Grouper", price: 36, category: "Formal Dining · Entrées" },
  { id: "hr-menu-f-chicken", name: "Airline Chicken Breast", price: 28, category: "Formal Dining · Entrées" },
  { id: "hr-menu-f-lava", name: "Chocolate Lava Cake", price: 9, category: "Formal Dining · Desserts" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
    where: { id: "hr-provider-dining" },
    create: {
      id: "hr-provider-dining",
      communityId: HUNTERS_RIDGE_COMMUNITY_ID,
      name: "Hunters Ridge Dining",
      category: "Dining",
      type: "service",
      rating: 4.8,
      description:
        "Grill Room, Club Patio Bar, Formal Dining Room, and The Ridge poolside snack bar with Royal Scoop ice cream.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Hunters Ridge Dining",
      rating: 4.8,
      description:
        "Grill Room, Club Patio Bar, Formal Dining Room, and The Ridge poolside snack bar with Royal Scoop ice cream.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
  });

  // Replace stale demo rows so menus always match the club's venues.
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

async function seedEventsAndBookings() {
  const events = [
    {
      id: "hr-event-ladies-day",
      title: "Ladies Day Golf",
      description: "Weekly Ladies Day — shotgun start followed by lunch in the Grill Room.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "Championship Golf Course",
      category: "golf",
      isPromoted: true,
      capacity: 60,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hr-event-mens-day",
      title: "Men's Day Golf",
      description: "Weekly Men's Day competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "Championship Golf Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hr-event-couples",
      title: "Couples Golf & Dinner",
      description:
        "Nine-hole couples scramble followed by dinner in the newly designed formal dining room.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Championship Golf Course",
      category: "golf",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 6500,
    },
    {
      id: "hr-event-pub-night",
      title: "Pub Night",
      description: "Casual pub fare and drink specials at the Club Patio Bar.",
      date: easternDateOffset(4),
      time: "17:00",
      location: "Club Patio Bar",
      category: "social",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hr-event-mix-mingle",
      title: "Mix & Mingle Night",
      description: "Meet your neighbors — live entertainment in the clubhouse.",
      date: easternDateOffset(7),
      time: "18:00",
      location: "Clubhouse",
      category: "social",
      isPromoted: true,
      capacity: 120,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hr-event-gourmet",
      title: "Gourmet Dinner Series",
      description: "Chef's multi-course gourmet dinner in the formal dining room.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Formal Dining Room",
      category: "dining",
      isPromoted: true,
      capacity: 40,
      requirePayment: true,
      feeCents: 9500,
    },
    {
      id: "hr-event-pickleball-social",
      title: "Pickleball Open Play Social",
      description: "Open play across all eight pickleball courts — all levels welcome.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Pickleball Courts",
      category: "sports",
      isPromoted: false,
      capacity: 32,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hr-event-bocce-league",
      title: "Bocce League Night",
      description: "League play across all four bocce courts.",
      date: easternDateOffset(6),
      time: "18:00",
      location: "Bocce Courts",
      category: "sports",
      isPromoted: false,
      capacity: 32,
      requirePayment: false,
      feeCents: 0,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: HUNTERS_RIDGE_COMMUNITY_ID, createdBy: "Hunters Ridge" },
      update: event,
    });
  }

  // Tee times open 3 days in advance — seed one inside that window.
  const bookings = [
    {
      id: "hr-booking-golf",
      amenityId: "hr-amenity-golf",
      unitNumber: 1,
      amenity: "Championship Golf Course",
      date: easternDateOffset(2),
      startTime: "08:04",
      endTime: "12:00",
    },
    {
      id: "hr-booking-pickleball",
      amenityId: "hr-amenity-pickleball",
      unitNumber: 3,
      amenity: "Pickleball Courts",
      date: easternDateOffset(1),
      startTime: "09:00",
      endTime: "10:00",
    },
    {
      id: "hr-booking-tennis",
      amenityId: "hr-amenity-tennis",
      unitNumber: 1,
      amenity: "Tennis Courts",
      date: easternDateOffset(3),
      startTime: "10:00",
      endTime: "11:30",
    },
  ] as const;

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        ...booking,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-announcement-rates",
      title: "Summer golf rates (May – October 2026)",
      body: "18 holes: reciprocal / accompanied guest / renter $55 +tax · family of golf member $45 +tax (cart included). 9 holes: $35 / family $30 +tax. Social members: 9 holes $45 +tax · 18 holes $70 +tax. Cart rental: 18 holes $30 · 9 holes $20 +tax. Carts due back to the cart barn by 7:00 PM.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "hr-announcement-tee-times",
      title: "Unlimited golf — tee times 3 days in advance",
      body: "Golf members play as often as they choose — no Chelsea system. Daily tee times open 3 days in advance. Private golf carts welcome with paid trackage.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "hr-announcement-ridge",
      title: "The Ridge poolside snack bar is open daily",
      body: "Sandwiches, salads, full-service bar with daily happy hours, and locally homemade Royal Scoop ice cream — poolside at the Community Center.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: HUNTERS_RIDGE_COMMUNITY_ID },
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
      id: "hr-document-summer-rates-2026",
      title: "Summer Golf Rates — May–October 2026",
      category: "golf",
      url: "https://a95ab306-786d-4ef5-852f-27f688810240.filesusr.com/ugd/cf231d_073202359e6f4a56b571a0d6b75d3aee.pdf",
      uploadedBy: "Golf Shop",
      daysAgo: 5,
    },
    {
      id: "hr-document-club-info",
      title: "Hunters Ridge Golf & Country Club — Member Information",
      category: "membership",
      url: "https://a95ab306-786d-4ef5-852f-27f688810240.filesusr.com/ugd/cf231d_bd6e8c3f0ecf44f28fc75ed458b185bd.pdf",
      uploadedBy: "Club Administration",
      daysAgo: 8,
    },
    {
      id: "hr-document-community-assoc",
      title: "Hunters Ridge Community Association Documents",
      category: "legal",
      url: "https://www.huntersridgecommunityassociation.com/_files/ugd/a1cdd6_ae885ae55131436b919f6e707d92475a.pdf",
      uploadedBy: "Community Association",
      daysAgo: 12,
    },
    {
      id: "hr-document-club-packet-1",
      title: "Club Packet — Amenities & Lifestyle",
      category: "membership",
      url: "https://a95ab306-786d-4ef5-852f-27f688810240.filesusr.com/ugd/cf231d_1b236a81ca0745aa9c1bbe50c21dc176.pdf",
      uploadedBy: "Membership Office",
      daysAgo: 15,
    },
    {
      id: "hr-document-club-packet-2",
      title: "Club Packet — Golf, Racquets & Dining",
      category: "membership",
      url: "https://a95ab306-786d-4ef5-852f-27f688810240.filesusr.com/ugd/cf231d_67c48ac04eca4111ad448e58fca596ea.pdf",
      uploadedBy: "Membership Office",
      daysAgo: 15,
    },
    {
      id: "hr-document-tee-times",
      title: "Tee Time Policy — 3 Days in Advance · Unlimited Golf",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop · Steve Pinger",
      daysAgo: 3,
    },
    {
      id: "hr-document-cart-policy",
      title: "Private Cart Trackage & Cart Barn Rules",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Course Operations",
      daysAgo: 20,
    },
    {
      id: "hr-document-dining-hours",
      title: "Dining Hours — Grill Room, Formal Dining & The Ridge",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "hr-document-pickleball-tennis",
      title: "Racquet Sports — 8 Pickleball · 2 Clay Tennis · 4 Bocce",
      category: "sports",
      url: "#",
      uploadedBy: "Racquet Sports",
      daysAgo: 10,
    },
    {
      id: "hr-document-featured-homes",
      title: "Featured Homes — Golf Membership Included ($50,000 value)",
      category: "real_estate",
      url: "#",
      uploadedBy: "Marsha Lynn · Hunters Ridge Realty",
      daysAgo: 4,
    },
    {
      id: "hr-document-arts-bonita",
      title: "Arts Bonita — 2025–2026 Full Season Performance Program",
      category: "social",
      url: "https://issuu.com/centersfortheartsbonitasprings/docs/2025-2026_full-season_performance-program_01-26-26",
      uploadedBy: "Social Committee",
      daysAgo: 30,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-group-golfers",
      name: "Hunters Ridge Golfers",
      description:
        "Unlimited play, tee-time pairings 3 days ahead, Ladies & Men's Days, and Couples Events — no Chelsea system.",
      color: "from-emerald-500 to-green-800",
      members: 420,
    },
    {
      id: "hr-group-ladies-day",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day pairings, shotgun starts, and Grill Room lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 86,
    },
    {
      id: "hr-group-pickleball",
      name: "Pickleball Open Play",
      description: "Eight courts — open play, clinics with Avery Quinn & Jordan Blake, and evening socials.",
      color: "from-sky-400 to-blue-700",
      members: 112,
    },
    {
      id: "hr-group-tennis",
      name: "Clay Court Tennis",
      description: "Two Har-Tru green clay courts — lessons with Rachel Delgado & Marcus Hale, doubles partners.",
      color: "from-lime-400 to-green-700",
      members: 48,
    },
    {
      id: "hr-group-bocce",
      name: "Bocce League",
      description: "Four bocce courts — weekly league nights and casual Mix & Mingle play.",
      color: "from-amber-400 to-orange-700",
      members: 64,
    },
    {
      id: "hr-group-social",
      name: "Social Scene",
      description:
        "Pub Nights, Mix & Mingle, Gourmet Dinners, Holiday Parties, and live entertainment at the clubhouse.",
      color: "from-violet-400 to-fuchsia-700",
      members: 158,
    },
    {
      id: "hr-group-fitness",
      name: "Community Center Fitness",
      description: "Fitness classes, personal training, and resort pool & spa meetups with golf-course views.",
      color: "from-teal-400 to-cyan-700",
      members: 97,
    },
    {
      id: "hr-group-neighbors",
      name: "Neighbors Helping Neighbors",
      description: "Recommendations, ride shares, welcome notes, and a helping hand around Hunters Ridge.",
      color: "from-slate-400 to-slate-700",
      members: 134,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
      },
      update: {
        name: group.name,
        description: group.description,
        color: group.color,
        members: group.members,
      },
    });
  }

  // Grace (golf) joins golf + ladies + pickleball + social
  for (const groupId of [
    "hr-group-golfers",
    "hr-group-ladies-day",
    "hr-group-pickleball",
    "hr-group-social",
  ]) {
    await prisma.groupMembership.upsert({
      where: {
        groupId_userEmail: { groupId, userEmail: MEMBER_EMAIL },
      },
      create: { groupId, userEmail: MEMBER_EMAIL },
      update: {},
    });
  }

  // Peter (social) joins social + bocce + fitness + neighbors + pickleball
  for (const groupId of [
    "hr-group-social",
    "hr-group-bocce",
    "hr-group-fitness",
    "hr-group-neighbors",
    "hr-group-pickleball",
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
    // Grace — golf member
    { email: MEMBER_EMAIL, label: "Book championship golf", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Driving range & simulators", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Grill Room & Formal Dining", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "The Ridge poolside", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Pickleball courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    // Peter — social member
    { email: SOCIAL_EMAIL, label: "The Ridge poolside", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Club Patio Bar", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Pickleball courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Bocce courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Fitness Center", href: "/member/bookings" },
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
  const grace = { email: MEMBER_EMAIL, name: MEMBER_NAME };
  const peter = { email: SOCIAL_EMAIL, name: SOCIAL_NAME };
  const steve = { email: "steve@huntersridge-ca.com", name: "Steve Pinger" };
  const benjamin = { email: "agp@huntersridge-ca.com", name: "Benjamin Gensmer" };
  const rachel = { email: "rachel@huntersridge-ca.com", name: "Rachel Delgado" };
  const avery = { email: "avery@huntersridge-ca.com", name: "Avery Quinn" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const naomi = { email: PM_EMAIL, name: PM_NAME };
  const marsha = { email: "marsha@huntersridge.net", name: "Marsha Lynn" };
  const don = { email: BOARD_EMAIL, name: BOARD_NAME };

  const threads: Array<{
    id: string;
    kind?: "dm" | "group";
    title?: string | null;
    createdBy: string;
    participants: Array<{ email: string; name: string }>;
    messages: Array<{ author: { email: string; name: string }; body: string; hoursAgo: number }>;
  }> = [
    {
      id: "hr-chat-grace-steve",
      createdBy: grace.email,
      participants: [grace, steve],
      messages: [
        {
          author: grace,
          body: "Steve — still good for a simulator lesson Thursday morning? Want to work on my driver before Ladies Day.",
          hoursAgo: 40,
        },
        {
          author: steve,
          body: "Absolutely. Studio 2 at 9:00 — we'll check launch numbers then transfer to the range if you want outdoor feel.",
          hoursAgo: 38,
        },
        {
          author: grace,
          body: "Perfect. Tee times are still opening 3 days out, right?",
          hoursAgo: 36,
        },
        {
          author: steve,
          body: "Yes — golf members book three days ahead, and you can play as often as you like. See you Thursday.",
          hoursAgo: 2,
        },
      ],
    },
    {
      id: "hr-chat-grace-rachel",
      createdBy: rachel.email,
      participants: [grace, rachel],
      messages: [
        {
          author: rachel,
          body: "Grace — Court 1 (green clay) is open Saturday at 10 if you want that private lesson. We can work on your slice serve.",
          hoursAgo: 28,
        },
        {
          author: grace,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: rachel,
          body: "I've got a hopper ready — just water and a towel. Booked you 10:00–11:00 on Court 1.",
          hoursAgo: 24,
        },
      ],
    },
    {
      id: "hr-chat-grace-dining",
      createdBy: grace.email,
      participants: [grace, dining],
      messages: [
        {
          author: grace,
          body: "Hi — can we get a table for two in the Formal Dining Room Friday around 6:30? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Friday 6:30 in the Formal Dining Room. The grouper and filet have been popular this week.",
          hoursAgo: 18,
        },
        {
          author: grace,
          body: "Wonderful — thank you!",
          hoursAgo: 17,
        },
      ],
    },
    {
      id: "hr-chat-grace-avery",
      createdBy: avery.email,
      participants: [grace, avery],
      messages: [
        {
          author: avery,
          body: "Hi Grace — saw you signed up for a pickleball lesson. Anything specific you want to focus on?",
          hoursAgo: 10,
        },
        {
          author: grace,
          body: "Mostly the soft game — I keep popping balls up at the kitchen line.",
          hoursAgo: 8,
        },
        {
          author: avery,
          body: "Classic. We'll drill dinks and resets on Court 3 — you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
      id: "hr-chat-grace-peter",
      createdBy: peter.email,
      participants: [grace, peter],
      messages: [
        {
          author: peter,
          body: "Grace — bocce tonight at 5 if you're free after golf. Loser buys Royal Scoop at The Ridge?",
          hoursAgo: 9,
        },
        {
          author: grace,
          body: "Tempting! I've got a lesson in the morning though — rain check for Thursday Mix & Mingle?",
          hoursAgo: 7,
        },
        {
          author: peter,
          body: "Thursday works. See you at the clubhouse.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "hr-chat-peter-dining",
      createdBy: peter.email,
      participants: [peter, dining],
      messages: [
        {
          author: peter,
          body: "Can we hold a patio table at the Club Patio Bar Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Patio table held for noon. Happy hour starts at 4 if you want to linger.",
          hoursAgo: 14,
        },
        {
          author: peter,
          body: "Perfect, thank you!",
          hoursAgo: 13,
        },
      ],
    },
    {
      id: "hr-chat-grace-benjamin",
      createdBy: grace.email,
      participants: [grace, benjamin],
      messages: [
        {
          author: grace,
          body: "Benjamin — any chance of a twilight nine Saturday? Looking at reciprocal guest rates for my brother.",
          hoursAgo: 30,
        },
        {
          author: benjamin,
          body: "Yes — reciprocal / accompanied guest is $55 +tax for 18 (cart included). Family of a golf member is $45. I can put you on a 3:30 tee time Saturday.",
          hoursAgo: 28,
        },
        {
          author: grace,
          body: "Book the family rate please — he'll love the course.",
          hoursAgo: 27,
        },
      ],
    },
    {
      id: "hr-chat-grace-naomi",
      createdBy: grace.email,
      participants: [grace, naomi],
      messages: [
        {
          author: grace,
          body: "Naomi — my guest pass for Saturday still shows pending. Can Membership confirm?",
          hoursAgo: 12,
        },
        {
          author: naomi,
          body: "Confirmed and emailed. Your brother is cleared for the 3:30 tee time with the family rate. Call the golf shop if anything changes.",
          hoursAgo: 4,
        },
      ],
    },
    {
      id: "hr-chat-grace-marsha",
      createdBy: marsha.email,
      participants: [grace, marsha],
      messages: [
        {
          author: marsha,
          body: "Grace — 12732 Fox Ridge is still pending. Want me to send the updated listing packet with the golf membership included notes?",
          hoursAgo: 22,
        },
        {
          author: grace,
          body: "Yes please — neighbors keep asking about the $50k membership value.",
          hoursAgo: 21,
        },
        {
          author: marsha,
          body: "Packet sent. Call me at the Realty office if you need anything before closing.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "hr-chat-don-grace",
      createdBy: don.email,
      participants: [don, grace],
      messages: [
        {
          author: don,
          body: "Grace — any member comments for the July board packet? We're covering summer golf rates and Community Center hours.",
          hoursAgo: 45,
        },
        {
          author: grace,
          body: "Please keep Pub Nights on the calendar through October — they've been a hit with the social scene.",
          hoursAgo: 42,
        },
        {
          author: don,
          body: "Noted — Naomi will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "hr-chat-pickleball-group",
      kind: "group",
      title: "Pickleball Open Play",
      createdBy: avery.email,
      participants: [grace, peter, avery],
      messages: [
        {
          author: avery,
          body: "Open play Thursday at 4 across Courts 1–4. All levels welcome — bring a paddle or borrow from the desk.",
          hoursAgo: 15,
        },
        {
          author: peter,
          body: "I'm in. Anyone up for Court 8 after if it frees up?",
          hoursAgo: 12,
        },
        {
          author: grace,
          body: "Yes — see you at 4. Loser buys ice cream at The Ridge?",
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
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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

export async function ensureHuntersRidgeDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: HUNTERS_RIDGE_COMMUNITY_ID },
    create: {
      id: HUNTERS_RIDGE_COMMUNITY_ID,
      name: "Hunters Ridge Golf & Country Club",
      location: "Bonita Springs, FL",
      residentCount: 420,
      serviceCount: 2,
      activityCount: 10,
      coverColor: "from-[#14532d] to-[#caa64b]",
      logoUrl: brandAssets.communityHuntersRidge,
      primaryColor: "#14532d",
      appDisplayName: "Hunters Ridge",
      inviteCode: "hunters-ridge-demo",
    },
    update: {
      name: "Hunters Ridge Golf & Country Club",
      location: "Bonita Springs, FL",
      logoUrl: brandAssets.communityHuntersRidge,
      primaryColor: "#14532d",
      appDisplayName: "Hunters Ridge",
      activityCount: 10,
    },
  });

  for (const user of [
    { id: "u-hr-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-hr-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-hr-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-hr-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "12732 Fox Ridge Drive",
      householdAddress: "12732 Fox Ridge Drive, Bonita Springs, FL 34135",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "12655 Glen Hollow Drive",
      householdAddress: "12655 Glen Hollow Drive, Bonita Springs, FL 34135",
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

  await ensureMembershipTiersSeeded(HUNTERS_RIDGE_COMMUNITY_ID);
  await seedAmenities();
  await seedStaffAndPros();
  await seedDining();
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
export async function ensureHuntersRidgeDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureHuntersRidgeDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureHuntersRidgeDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureHuntersRidgeDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureHuntersRidgeDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureHuntersRidgeDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureHuntersRidgeDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "12732 Fox Ridge Drive",
      title: "Guest pass pending for Saturday tee time",
      category: "Access",
      description:
        "Brother visiting Saturday 3:30 tee time — guest pass still shows pending in Membership. Family rate should apply.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "12732 Fox Ridge Drive",
      title: "Irrigation overspray on Fox Ridge driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 12732 Fox Ridge soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "12732 Fox Ridge Drive",
      title: "Pickleball Court 3 net needs tightening",
      category: "Amenities",
      description: "Net sags in the middle on Court 3 — open play Thursday is affected.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "12655 Glen Hollow Drive",
      title: "Club Patio Bar string lights out",
      category: "Maintenance",
      description: "Half the patio string lights are dark after dusk on the west side of the Club Patio Bar.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "12655 Glen Hollow Drive",
      title: "The Ridge towel cabinet empty",
      category: "Amenities",
      description: "Poolside towel stock at The Ridge was empty twice this week after noon.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "12732 Fox Ridge Drive",
      title: "Simulator Studio 2 remote not pairing",
      category: "Maintenance",
      description: "Golf simulator Studio 2 remote will not pair after the last software update.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
  const proShop = "Hunters Ridge Pro Shop";
  const apparel = [
    {
      id: "hr-apparel-polo-forest",
      name: "Club Polo — Forest",
      description: "Performance pique polo with embroidered Hunters Ridge crest.",
      price: 54,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/hr-apparel-polo-navy.png",
    },
    {
      id: "hr-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — great for pickleball and range days.",
      price: 48,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/hr-apparel-ladies-polo.png",
    },
    {
      id: "hr-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather",
      description: "Lightweight layer for cool Bonita mornings on the championship course.",
      price: 72,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/hr-apparel-quarter-zip.png",
    },
    {
      id: "hr-apparel-cap",
      name: "Performance Cap — Stone",
      description: "Structured adjustable cap with embroidered Hunters Ridge crest.",
      price: 30,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hr-apparel-cap-navy.png",
    },
    {
      id: "hr-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for tennis, pickleball, and range practice.",
      price: 26,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hr-apparel-visor-black.png",
    },
    {
      id: "hr-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 22,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/hr-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      communityId: HUNTERS_RIDGE_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — tournament weekend kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "hr-apparel-polo-forest",
            name: "Club Polo — Forest",
            size: "M",
            qty: 1,
            unitPrice: 54,
          },
          {
            productId: "hr-apparel-cap",
            name: "Performance Cap — Stone",
            size: "One Size",
            qty: 1,
            unitPrice: 30,
          },
        ]),
        total: 84,
        notes: "Member demo — tournament weekend kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "hr-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup at Fox Ridge after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "12732 Fox Ridge Drive",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "hr-marketplace-patio",
      title: "Patio Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Glen Hollow only.",
      price: 275,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "12655 Glen Hollow Drive",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "hr-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Fitness",
      seller: "Rachel Delgado",
      unit: "12810 Quail Run Court",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "hr-marketplace-racquet",
      title: "Kids' Tennis Racquet",
      description: "Lightly used junior racquet for ages 8–12. Fresh grip and cover included.",
      price: 32,
      category: "Tennis",
      seller: "Marcus Hale",
      unit: "12944 Cypress Bend Lane",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 4,
    },
    {
      id: "hr-marketplace-polo",
      title: "Hunters Ridge Club Polo — Men's Large",
      description: "Forest performance polo with embroidered crest. Worn twice; like new.",
      price: 28,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "12732 Fox Ridge Drive",
      imageUrl: "/brand/apparel/hr-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "hr-marketplace-cap",
      title: "Hunters Ridge Performance Cap",
      description: "Stone adjustable cap with crest. New without tags — bought wrong size.",
      price: 16,
      category: "Apparel",
      seller: SOCIAL_NAME,
      unit: "12655 Glen Hollow Drive",
      imageUrl: "/brand/apparel/hr-apparel-cap-navy.png",
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-blog-summer-golf",
      title: "Summer golf on the championship course",
      excerpt:
        "Early tee times, five tee sets, and pace tips for warm Bonita mornings from Director of Golf Steve Pinger.",
      body: "Summer mornings at Hunters Ridge are ideal for walking or riding 18. Steve and Benjamin recommend booking before 8:30am, using the driving range and short-game area to warm up, and checking the simulator studios when afternoon storms roll in. Unlimited play members can add a second loop after lunch if the field is light.",
      author: "Steve Pinger, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "hr-blog-ridge-dining",
      title: "Poolside favorites at The Ridge",
      excerpt:
        "Cool drinks, light plates, and shade for after pickleball or a swim — what’s new at The Ridge this month.",
      body: "The Ridge stays open for lunch and late-afternoon snacks through the summer. Members love the fresh salads, cold beverages, and easy grab-and-go options after tennis or bocce. Formal Dining and the Grill Room remain the spots for evening reservations.",
      author: "Hunters Ridge Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "hr-blog-pickleball",
      title: "Open play fills all eight pickleball courts",
      excerpt:
        "Rachel Delgado previews Thursday open play and shares three tips for newer paddlers.",
      body: "With eight courts, Hunters Ridge can run rotating partners and short games so everyone meets more members. Borrow a paddle at the courts if you need one, arrive ten minutes early for a quick rules overview, and stay for social time afterward at The Ridge.",
      author: "Rachel Delgado",
      category: "Racquets",
      daysAgo: 5,
    },
    {
      id: "hr-blog-simulators",
      title: "Three golf simulators, endless practice",
      excerpt:
        "Book Studio 1–3 for rainy days, club fitting practice, or a friendly skins game indoors.",
      body: "Our three simulator studios stay busy in summer storm season. Reserve online, bring your own balls or use house Titleist, and ask the golf shop about lesson packages with Steve or Benjamin that include simulator time.",
      author: "Benjamin Gensmer, AGP",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "hr-blog-fitness",
      title: "Fitness Center hours and summer classes",
      excerpt:
        "Cooler morning slots, strength circuits, and spa recovery after a hot round.",
      body: "The Fitness Center opens early for members who want to train before tee times. Pair a short strength session with a stretch, then cool down at the pool and spa. Check the club calendar for group classes and trainer availability.",
      author: "Fitness Team",
      category: "Wellness",
      daysAgo: 9,
    },
    {
      id: "hr-blog-welcome",
      title: "Welcome to Hunters Ridge neighbors",
      excerpt:
        "Simple ways to settle in during your first month — golf, dining, racquets, and community groups.",
      body: "Start with a casual meal at the Grill Room or The Ridge, join a community group in the app, and book one clinic or social on the calendar. Membership can help with guest passes, and Marsha Lynn is happy to answer real-estate questions about the neighborhood.",
      author: "Naomi Weathers",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-blog-comment-golf-1",
      postId: "hr-blog-summer-golf",
      author: MEMBER_NAME,
      body: "Early tee times have been perfect this week — thanks for the pace tips, Steve!",
    },
    {
      id: "hr-blog-comment-golf-2",
      postId: "hr-blog-summer-golf",
      author: SOCIAL_NAME,
      body: "Used a simulator yesterday when the storms hit. Great backup plan.",
    },
    {
      id: "hr-blog-comment-ridge-1",
      postId: "hr-blog-ridge-dining",
      author: MEMBER_NAME,
      body: "The Ridge after pickleball is becoming our Friday habit.",
    },
    {
      id: "hr-blog-comment-pickle-1",
      postId: "hr-blog-pickleball",
      author: SOCIAL_NAME,
      body: "Open play was packed but so welcoming. Counting me in next Thursday.",
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
      id: "hr-newsletter-july-2026",
      title: "Hunters Ridge Summer Update — July 2026",
      summary:
        "Championship golf hours, The Ridge poolside, pickleball open play, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Hunters Ridge Golf & Country Club. Unlimited play continues on the championship course — early tee times remain the coolest window, and our three simulator studios are ready when afternoon storms roll through Bonita Springs.",
        "",
        "This month:",
        "• Grill Room, Patio Bar, and Formal Dining — reserve in Dining",
        "• The Ridge poolside for lunch and post-racquet snacks",
        "• Pickleball open play on all eight courts — Thursdays",
        "• Green clay tennis (2 courts) and bocce (4 courts) bookable in the app",
        "",
        "Questions: Membership or Front Desk · (239) 273-8114 · 28400 Hunters Ridge Blvd.",
        "",
        "— Naomi Weathers",
        "Property Management",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "hr-newsletter-golf-racquets",
      title: "Golf & Racquets Roundup",
      summary:
        "Course conditioning notes from Steve Pinger, simulator bookings, and tennis/pickleball clinic openings.",
      body: [
        "Golf & Racquets members,",
        "",
        "Golf: The championship course is in strong summer condition across all five tee sets. Warm up on the driving range and short-game area, then book simulators for indoor practice. Lessons with Steve Pinger and Benjamin Gensmer are open this week.",
        "",
        "Racquets: Rachel Delgado and Marcus Hale are booking tennis lessons on the green clay; Avery Quinn and Jordan Blake cover pickleball clinics. Courts irrigate mid-day — check Hours before you book.",
        "",
        "Pro Shop: Crest polos, caps, and towels are stocked — order through Club Apparel in the app.",
        "",
        "— Golf Shop & Racquet Pros",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "hr-newsletter-dining",
      title: "Dining at Hunters Ridge — Midsummer Menus",
      summary:
        "Grill Room favorites, Patio Bar evenings, Formal Dining, and The Ridge poolside tips.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Grill Room, Patio Bar, Formal Dining, and The Ridge. After a morning round or pickleball, The Ridge is the easy poolside stop. Evening reservations for Formal Dining book up on weekends — reserve early in the member app.",
        "",
        "Dress guidelines remain Club Casual in Formal Dining; swim attire is welcome at The Ridge deck seating.",
        "",
        "— Hunters Ridge Dining",
        "dining@huntersridge-ca.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "hr-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, real estate with Marsha Lynn, and how to connect in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Hunters Ridge neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests for golf and dining can be submitted as Service Requests or through Membership.",
        "",
        "For neighborhood real-estate questions, Marsha Lynn remains our on-site contact. Property Management can help with irrigation, amenities, and gate access.",
        "",
        "Thank you for making Hunters Ridge a warm and active club community.",
        "",
        "— Club Administration",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-gallery-18th-dusk",
      title: "Championship 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Steve Pinger",
      daysAgo: 1,
    },
    {
      id: "hr-gallery-clubhouse",
      title: "Clubhouse terrace evening",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "hr-gallery-range",
      title: "Driving range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Benjamin Gensmer",
      daysAgo: 3,
    },
    {
      id: "hr-gallery-pickleball",
      title: "Pickleball courts — open play",
      category: "Racquets",
      url: brandAssets.amenityPickleball,
      uploadedBy: "Rachel Delgado",
      daysAgo: 4,
    },
    {
      id: "hr-gallery-tennis",
      title: "Green clay tennis courts",
      category: "Racquets",
      url: brandAssets.amenityTennisClay,
      uploadedBy: "Marcus Hale",
      daysAgo: 5,
    },
    {
      id: "hr-gallery-bocce",
      title: "Bocce courts at golden hour",
      category: "Social",
      url: brandAssets.amenityBocce,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 6,
    },
    {
      id: "hr-gallery-fitness",
      title: "Fitness Center morning session",
      category: "Wellness",
      url: brandAssets.amenityFitness,
      uploadedBy: "Fitness Team",
      daysAgo: 7,
    },
    {
      id: "hr-gallery-dining",
      title: "Grill Room & patio dining",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Hunters Ridge Dining",
      daysAgo: 8,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
      id: "hr-property-grace-primary",
      userEmail: MEMBER_EMAIL,
      address: "12732 Fox Ridge Drive, Bonita Springs, FL 34135",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "hr-property-grace-guest",
      userEmail: MEMBER_EMAIL,
      address: "12810 Quail Run Court, Bonita Springs, FL 34135",
      type: "Investment property",
      owner: true,
    },
    {
      id: "hr-property-peter-primary",
      userEmail: SOCIAL_EMAIL,
      address: "12655 Glen Hollow Drive, Bonita Springs, FL 34135",
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
  const marshaEmail = "marsha@huntersridge.net";
  const listings = [
    {
      id: "hr-real-estate-fox-ridge",
      memberEmail: marshaEmail,
      title: "Fox Ridge Single-Family Near Championship Golf",
      description:
        "Updated three-bedroom home with lanai, two-car garage, and easy cart-path access to the clubhouse. Golf membership transferable subject to club approval. Listed with Marsha Lynn, Hunters Ridge Realty.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2240,
      unit: "12788 Fox Ridge Drive",
      color: "from-emerald-600 to-slate-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "hr-real-estate-glen-hollow",
      memberEmail: marshaEmail,
      title: "Glen Hollow Villa with Preserve Views",
      description:
        "Bright two-bedroom villa with screened lanai, stainless kitchen, and preserve backdrop. Walking distance to pickleball, bocce, and The Ridge poolside dining.",
      type: "sale",
      price: 625000,
      beds: 2,
      baths: 2,
      sqft: 1685,
      unit: "12620 Glen Hollow Drive",
      color: "from-sky-500 to-emerald-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "hr-real-estate-cypress",
      memberEmail: marshaEmail,
      title: "Cypress Bend Estate with Pool",
      description:
        "Spacious four-bedroom estate featuring private pool and spa, outdoor kitchen, three-car garage, and golf-course views. Ideal for full-time or seasonal members.",
      type: "sale",
      price: 1450000,
      beds: 4,
      baths: 3.5,
      sqft: 3120,
      unit: "12944 Cypress Bend Lane",
      color: "from-[#1f2937] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.amenitySpa],
      daysAgo: 6,
    },
    {
      id: "hr-real-estate-quail-rent",
      memberEmail: marshaEmail,
      title: "Furnished Seasonal Rental — Quail Run",
      description:
        "Turnkey three-bedroom seasonal rental near the clubhouse. Includes golf cart parking, screened lanai, and preferred access to Grill Room and Formal Dining. Available through April.",
      type: "rent",
      price: 7500,
      beds: 3,
      baths: 2,
      sqft: 1980,
      unit: "12810 Quail Run Court",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.amenityFitness],
      daysAgo: 8,
    },
    {
      id: "hr-real-estate-ridge-condo",
      memberEmail: marshaEmail,
      title: "Club-Adjacent Condo Overlooking Bocce Courts",
      description:
        "Two-bedroom condo steps from bocce, fitness, and The Ridge. Perfect lock-and-leave for snowbirds who want full social and racquet access without a large yard.",
      type: "sale",
      price: 485000,
      beds: 2,
      baths: 2,
      sqft: 1420,
      unit: "28400 Hunters Ridge Blvd #204",
      color: "from-amber-400 to-stone-700",
      images: [brandAssets.amenityBocce, brandAssets.amenityPickleball],
      daysAgo: 10,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.realEstateListing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: HUNTERS_RIDGE_COMMUNITY_ID,
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
