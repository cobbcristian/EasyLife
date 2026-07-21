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

export const HERITAGE_BAY_COMMUNITY_ID = "heritage-bay";
const MEMBER_EMAIL = "member.demo@golfheritagebay.com";
const MEMBER_NAME = "Kelly Anderson";
const CLUB_PHONE = "(239) 353-7056";
const DINING_EMAIL = "dining@golfheritagebay.com";

const golfHours = defaultDailyHours("07:00", "18:00");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const eventsHours = defaultDailyHours("09:00", "17:00");

/** Summer Cabana dining (May 1 – Oct 18): lunch Tue–Sun, dinner Sat–Sun. */
const cabanaHours: WeeklyHours = {
  mon: null,
  tue: { open: "11:00", close: "18:00" },
  wed: { open: "11:00", close: "18:00" },
  thu: { open: "11:00", close: "18:00" },
  fri: { open: "11:00", close: "18:00" },
  sat: { open: "11:00", close: "20:00" },
  sun: { open: "11:00", close: "20:00" },
};

/** Summer Grille Room: happy hour + dinner Tue–Fri. */
const grilleHours: WeeklyHours = {
  mon: null,
  tue: { open: "16:00", close: "20:00" },
  wed: { open: "16:00", close: "20:00" },
  thu: { open: "16:00", close: "20:00" },
  fri: { open: "16:00", close: "20:00" },
  sat: null,
  sun: null,
};

const aquaFitHours: WeeklyHours = {
  mon: { open: "10:00", close: "11:00" },
  tue: null,
  wed: { open: "10:00", close: "11:00" },
  thu: null,
  fri: { open: "10:00", close: "11:00" },
  sat: null,
  sun: null,
};

function nextAquaFitDate(): string {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = easternDateOffset(offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 1 || weekday === 3 || weekday === 5) return date;
  }
  return easternDateOffset(1);
}

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
    id: "hb-amenity-pine",
    name: "Pine Course",
    description:
      "Nine holes of championship golf — one of Heritage Bay’s three nines (Pine, Cypress, Oak).",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hb-amenity-cypress",
    name: "Cypress Course",
    description: "Nine-hole championship course in Heritage Bay’s rotating course pairings.",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hb-amenity-oak",
    name: "Oak Course",
    description: "Nine-hole championship course completing Heritage Bay’s 27 holes.",
    kind: "golf_course",
    unitCount: 4,
    holes: 9,
    hoursJson: golfHours,
  },
  {
    id: "hb-amenity-practice",
    name: "Golf Practice Facility",
    description:
      "Practice range and short-game area. Book PGA lessons with Justin McCarraher, John Damon, Mike Aroney, or Russ Ogrin.",
    kind: "driving_range",
    unitCount: 18,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "hb-amenity-tennis",
    name: "Tennis Courts",
    description:
      "Seven tennis courts. Private lessons with Sofia Reyes and Brett Callahan.",
    kind: "court",
    unitCount: 7,
    holes: null,
    surface: "hard",
    hoursJson: racquetHours,
  },
  {
    id: "hb-amenity-pickleball",
    name: "Pickleball Courts",
    description:
      "Two pickleball courts. Clinics and private lessons with Dana Kim and Tyler Brooks.",
    kind: "court",
    unitCount: 2,
    holes: null,
    surface: "hard",
    hoursJson: racquetHours,
  },
  {
    id: "hb-amenity-bocce",
    name: "Bocce Courts",
    description: "Three bocce courts for league and social play.",
    // facility (not court) so Hours groups under Club amenities, not Tennis
    kind: "facility",
    unitCount: 3,
    holes: null,
    surface: "bocce",
    hoursJson: racquetHours,
  },
  {
    id: "hb-amenity-fitness",
    name: "Fitness Center",
    description: "Member gym with strength, cardio, and group fitness programming.",
    kind: "gym",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "hb-amenity-pool",
    name: "Main Pool",
    description:
      "Resort-style main pool. Summer Aqua Fit Mon/Wed/Fri at 10:00 AM. Cabana dining on the deck.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "hb-amenity-aqua-fit",
    name: "Summer Aqua Fit",
    description:
      "Mon, Wed & Fri · 10:00 AM · Main Pool. $10 single · 10-class punch card $90 · 20-class $160.",
    kind: "fitness_class",
    unitCount: 1,
    holes: null,
    fee: 10,
    hoursJson: aquaFitHours,
  },
  {
    id: "hb-amenity-cabana",
    name: "The Cabana",
    description:
      "Poolside dining. Summer: lunch Tue–Sun 11–3, happy hour Tue–Sun 4–6, dinner Sat–Sun 5–8. Takeout x113. Reservations x107. Covered dining: cover-ups required; pool-deck seating allows swim attire.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: cabanaHours,
  },
  {
    id: "hb-amenity-grille",
    name: "The Grille Room",
    description:
      "Country Club Casual dinner dining. Summer: happy hour Tue–Fri 4–6, dinner Tue–Fri 5–8. Takeout x132. Reservations x107 (Events Desk Mon–Fri 10–4).",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: grilleHours,
  },
  {
    id: "hb-amenity-weddings",
    name: "Weddings & Private Events",
    description:
      "Heritage Bay hosts weddings and private celebrations. Inquire with the Events & Activities Desk at (239) 353-7056 x107.",
    kind: "event_space",
    unitCount: 1,
    holes: null,
    hoursJson: eventsHours,
  },
];

const staff = [
  {
    id: "hb-staff-doug",
    name: "Doug Brown",
    title: "General Manager / COO",
    department: "Club Management",
    email: "admin@golfheritagebay.com",
    phone: `${CLUB_PHONE} x111`,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "hb-staff-lina",
    name: "Lina Blount",
    title: "Chief Financial Officer",
    department: "Club Management",
    email: "admin@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "hb-staff-stephanie",
    name: "Stephanie McIntosh",
    title: "Chief Administrative Officer",
    department: "Club Management",
    email: "admin@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "hb-staff-kelly",
    name: "Kelly Jewart",
    title: "Membership Director",
    department: "Membership",
    email: "kellyj@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 4,
  },
  {
    id: "hb-staff-events",
    name: "Events & Activities Desk",
    title: "Dining Reservations · Mon–Fri 10am–4pm",
    department: "Events",
    email: "admin@golfheritagebay.com",
    phone: `${CLUB_PHONE} x107`,
    category: "front_desk",
    sortOrder: 5,
  },
  {
    id: "hb-staff-vincent",
    name: "Vincent Capua",
    title: "Executive Chef",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 8,
  },
  {
    id: "hb-staff-michael",
    name: "Michael Sobat",
    title: "Executive Sous Chef",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 9,
  },
  {
    id: "hb-staff-kevin",
    name: "Kevin Schaal",
    title: "Director of Golf Course & Common Ground Landscape Operations",
    department: "Golf Course Operations",
    email: "admin@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "hb-staff-justin",
    name: "Justin McCarraher, PGA",
    title: "Director of Golf Operations",
    department: "Golf",
    email: "golf@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "hb-staff-john",
    name: "John Damon, PGA",
    title: "Head Golf Professional",
    department: "Golf",
    email: "golfshop@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "hb-staff-mike",
    name: "Mike Aroney",
    title: "Assistant Golf Professional",
    department: "Golf",
    email: "golfshop@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 13,
  },
  {
    id: "hb-staff-russ",
    name: "Russ Ogrin",
    title: "Assistant Golf Professional",
    department: "Golf",
    email: "golfshop@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 14,
  },
  {
    id: "hb-staff-sofia",
    name: "Sofia Reyes",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "tennis@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "hb-staff-brett",
    name: "Brett Callahan",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "tennis@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "hb-staff-dana",
    name: "Dana Kim",
    title: "Pickleball Director",
    department: "Pickleball",
    email: "pickleball@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 22,
  },
  {
    id: "hb-staff-tyler",
    name: "Tyler Brooks",
    title: "Pickleball Instructor",
    department: "Pickleball",
    email: "pickleball@golfheritagebay.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 23,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "hb-pro-justin",
    name: "Justin McCarraher, PGA",
    email: "justin.mccarraher@golfheritagebay.com",
    category: "golf",
    description:
      "Director of Golf Operations. PGA rates: 30 min $60 · 60 min $110 · 3×30 min $165 · 5×30 min $250 · 3×60 min $300 · 5×60 min $500.",
  },
  {
    id: "hb-pro-john",
    name: "John Damon, PGA",
    email: "john.damon@golfheritagebay.com",
    category: "golf",
    description:
      "Head Golf Professional. Private instruction at the Golf Practice Facility — same PGA lesson rates as the golf staff.",
  },
  {
    id: "hb-pro-mike",
    name: "Mike Aroney",
    email: "mike.aroney@golfheritagebay.com",
    category: "golf",
    description: "Assistant Golf Professional. Private golf instruction — 30 min $60 / 60 min $110.",
  },
  {
    id: "hb-pro-russ",
    name: "Russ Ogrin",
    email: "russ.ogrin@golfheritagebay.com",
    category: "golf",
    description: "Assistant Golf Professional. Private golf instruction — 30 min $60 / 60 min $110.",
  },
  {
    id: "hb-pro-sofia",
    name: "Sofia Reyes",
    email: "sofia.reyes@golfheritagebay.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private and semi-private lessons on all seven courts — adults and juniors.",
  },
  {
    id: "hb-pro-brett",
    name: "Brett Callahan",
    email: "brett.callahan@golfheritagebay.com",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Stroke clinics, match play coaching, and USTA team prep.",
  },
  {
    id: "hb-pro-dana",
    name: "Dana Kim",
    email: "dana.kim@golfheritagebay.com",
    category: "pickleball",
    description:
      "Pickleball Director. Private lessons, open-play clinics, and paddle fitting on both courts.",
  },
  {
    id: "hb-pro-tyler",
    name: "Tyler Brooks",
    email: "tyler.brooks@golfheritagebay.com",
    category: "pickleball",
    description:
      "Pickleball Instructor. Beginner-friendly lessons and competitive drill sessions.",
  },
] as const;

/** Curated from official Cabana + Grille Room menus (Mar/Apr 2026). */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  // Cabana
  { id: "hb-menu-c-soup", name: "Chef’s Weekly Soup", price: 8, category: "Cabana · Starters" },
  { id: "hb-menu-c-chili", name: "Chef’s Signature Chili", price: 10, category: "Cabana · Starters" },
  { id: "hb-menu-c-nachos", name: "Loaded Nachos", price: 12, category: "Cabana · Starters" },
  { id: "hb-menu-c-wings", name: "Jumbo Chicken Wings", price: 15, category: "Cabana · Starters" },
  { id: "hb-menu-c-coconut", name: "Coconut Shrimp", price: 15, category: "Cabana · Starters" },
  { id: "hb-menu-c-calamari", name: "Thai Calamari", price: 18, category: "Cabana · Starters" },
  { id: "hb-menu-c-steak-q", name: "Steak Quesadilla", price: 20, category: "Cabana · Starters" },
  { id: "hb-menu-c-caesar", name: "Classic Caesar", price: 12, category: "Cabana · Salads" },
  { id: "hb-menu-c-garden", name: "Cabana Garden Salad", price: 12, category: "Cabana · Salads" },
  { id: "hb-menu-c-oriental", name: "Oriental Chicken Salad", price: 18, category: "Cabana · Salads" },
  { id: "hb-menu-c-macadamia", name: "Macadamia Chicken Salad", price: 21, category: "Cabana · Salads" },
  { id: "hb-menu-c-burger", name: "Heritage Blend Burger", price: 16, category: "Cabana · Handhelds" },
  { id: "hb-menu-c-club", name: "Cabana Club Sandwich", price: 15, category: "Cabana · Handhelds" },
  { id: "hb-menu-c-korean", name: "Korean Chicken Sandwich", price: 16, category: "Cabana · Handhelds" },
  { id: "hb-menu-c-grouper", name: "Grouper Sandwich", price: 20, category: "Cabana · Handhelds" },
  { id: "hb-menu-c-hibachi", name: "Hibachi Bowl", price: 16, category: "Cabana · Specialties" },
  { id: "hb-menu-c-poke", name: "Tuna Poke Rice Bowl", price: 18, category: "Cabana · Specialties" },
  { id: "hb-menu-c-pizza", name: "Cabana 12″ Cheese Pizza", price: 13, category: "Cabana · Pizza" },
  { id: "hb-menu-c-fig", name: "Goat Cheese and Fig Flatbread", price: 15, category: "Cabana · Pizza" },
  { id: "hb-menu-c-shortrib", name: "Braised Short Ribs", price: 28, category: "Cabana · Dinner" },
  { id: "hb-menu-c-boom", name: "Boom Boom Salmon", price: 26, category: "Cabana · Dinner" },
  { id: "hb-menu-c-filet", name: "Filet Mignon (7 oz)", price: 36, category: "Cabana · Dinner" },
  { id: "hb-menu-c-brownie", name: "Brownie Sundae", price: 8, category: "Cabana · Desserts" },
  { id: "hb-menu-c-cheesecake", name: "Pina Colada Cheesecake", price: 8, category: "Cabana · Desserts" },
  // Grille Room
  { id: "hb-menu-g-tomatoes", name: "Fried Green Tomatoes", price: 17, category: "Grille · Starters" },
  { id: "hb-menu-g-sliders", name: "BBQ Wagyu Beef Sliders", price: 15, category: "Grille · Starters" },
  { id: "hb-menu-g-cauli", name: "Korean Fried Cauliflower", price: 14, category: "Grille · Starters" },
  { id: "hb-menu-g-tuna", name: "Ahi Tuna Nachos", price: 20, category: "Grille · Starters" },
  { id: "hb-menu-g-bao", name: "House Cured Pork Belly Bao Buns", price: 17, category: "Grille · Starters" },
  { id: "hb-menu-g-caesar", name: "Caesar Salad", price: 12, category: "Grille · Salads" },
  { id: "hb-menu-g-wedge", name: "Wedge Salad", price: 13, category: "Grille · Salads" },
  { id: "hb-menu-g-strawberry", name: "Florida Strawberry & Goat Cheese", price: 15, category: "Grille · Salads" },
  { id: "hb-menu-g-burger", name: "Linz Florida Steakhouse Burger", price: 18, category: "Grille · Favorites" },
  { id: "hb-menu-g-grouper-s", name: "Florida Grouper Sandwich", price: 28, category: "Grille · Favorites" },
  { id: "hb-menu-g-frites", name: "Wagyu Steak Frites", price: 26, category: "Grille · Favorites" },
  { id: "hb-menu-g-gnocchi", name: "Ricotta Gnocchi", price: 28, category: "Grille · Favorites" },
  { id: "hb-menu-g-chicken", name: "Bell & Evans Roasted Chicken Marsala", price: 26, category: "Grille · Land" },
  { id: "hb-menu-g-filet", name: "6oz Linz Reserve Filet Mignon", price: 46, category: "Grille · Land" },
  { id: "hb-menu-g-pork", name: "12oz Duroc Bone-In Pork Chop", price: 34, category: "Grille · Land" },
  { id: "hb-menu-g-lamb", name: "New Zealand Lamb Chops", price: 36, category: "Grille · Land" },
  { id: "hb-menu-g-salmon", name: "Miso Glazed Salmon", price: 32, category: "Grille · Sea" },
  { id: "hb-menu-g-macadamia", name: "Macadamia Crusted Local Grouper", price: 36, category: "Grille · Sea" },
  { id: "hb-menu-g-cioppino", name: "Seafood Cioppino", price: 38, category: "Grille · Sea" },
  { id: "hb-menu-g-panna", name: "Mango & Passionfruit Panna Cotta", price: 8, category: "Grille · Desserts" },
  { id: "hb-menu-g-lava", name: "Chocolate Lava Cake", price: 9, category: "Grille · Desserts" },
  { id: "hb-menu-g-keylime", name: "Key Lime Tartlet", price: 10, category: "Grille · Desserts" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
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
        communityId: HERITAGE_BAY_COMMUNITY_ID,
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
        communityId: HERITAGE_BAY_COMMUNITY_ID,
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

async function seedEventsAndBookings() {
  const aquaDate = nextAquaFitDate();
  const events = [
    {
      id: "hb-event-aqua-fit",
      title: "Summer Aqua Fit",
      description:
        "Main Pool · $10 single class · 10-class punch card $90 · 20-class $160. Mon/Wed/Fri 10:00 AM.",
      date: aquaDate,
      time: "10:00",
      location: "Main Pool",
      category: "fitness",
      isPromoted: true,
      capacity: 30,
      requirePayment: true,
      feeCents: 1000,
    },
    {
      id: "hb-event-nine-wine",
      title: "Nine & Wine on the Oak Course",
      description: "Nine holes followed by a member social in The Grille Room.",
      date: easternDateOffset(3),
      time: "15:30",
      location: "Oak Course",
      category: "golf",
      isPromoted: true,
      capacity: 48,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hb-event-pickle-social",
      title: "Pickleball Social Mixer",
      description: "Open play on both pickleball courts — all levels welcome.",
      date: easternDateOffset(4),
      time: "17:00",
      location: "Pickleball Courts",
      category: "sports",
      isPromoted: true,
      capacity: 16,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hb-event-bocce",
      title: "Bocce League Night",
      description: "League play across all three bocce courts.",
      date: easternDateOffset(5),
      time: "18:00",
      location: "Bocce Courts",
      category: "sports",
      isPromoted: false,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hb-event-wedding-showcase",
      title: "Heritage Bay Wedding Showcase",
      description: "Tour wedding spaces and meet the club events team.",
      date: easternDateOffset(8),
      time: "13:00",
      location: "Clubhouse",
      category: "social",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "hb-event-grille-night",
      title: "Chef’s Table at The Grille Room",
      description: "Executive Chef Vincent Capua presents a tasting menu — Country Club Casual.",
      date: easternDateOffset(6),
      time: "18:00",
      location: "The Grille Room",
      category: "dining",
      isPromoted: true,
      capacity: 40,
      requirePayment: true,
      feeCents: 8500,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: HERITAGE_BAY_COMMUNITY_ID, createdBy: "Heritage Bay" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "hb-booking-tennis",
      amenityId: "hb-amenity-tennis",
      unitNumber: 3,
      amenity: "Tennis Court 3",
      date: easternDateOffset(2),
      startTime: "09:00",
      endTime: "10:30",
    },
    {
      id: "hb-booking-pine",
      amenityId: "hb-amenity-pine",
      unitNumber: 1,
      amenity: "Pine Course — Tee Time",
      date: easternDateOffset(1),
      startTime: "08:12",
      endTime: "12:00",
    },
    {
      id: "hb-booking-pickle",
      amenityId: "hb-amenity-pickleball",
      unitNumber: 1,
      amenity: "Pickleball Court 1",
      date: easternDateOffset(4),
      startTime: "16:00",
      endTime: "17:00",
    },
    {
      id: "hb-booking-aqua",
      amenityId: "hb-amenity-aqua-fit",
      unitNumber: 1,
      amenity: "Summer Aqua Fit",
      date: aquaDate,
      startTime: "10:00",
      endTime: "11:00",
    },
    {
      id: "hb-booking-grille",
      amenityId: "hb-amenity-grille",
      unitNumber: 4,
      amenity: "The Grille Room — Dinner",
      date: easternDateOffset(2),
      startTime: "18:00",
      endTime: "19:30",
    },
  ] as const;

  for (const b of bookings) {
    await prisma.booking.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        amenityId: b.amenityId,
        unitNumber: b.unitNumber,
        memberEmail: MEMBER_EMAIL,
        memberName: MEMBER_NAME,
        amenity: b.amenity,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        status: "confirmed",
      },
      update: {
        amenityId: b.amenityId,
        unitNumber: b.unitNumber,
        amenity: b.amenity,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        status: "confirmed",
      },
    });
  }
}

/** Nearby Naples / Immokalee Rd vendors for the member Vendors directory. */
const nearbyVendors = [
  {
    id: "hb-vendor-lawn",
    name: "Cypress Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "cypress.lawn@golfheritagebay.com",
    phone: "(239) 555-2101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Heritage Bay residences off Immokalee Road.",
  },
  {
    id: "hb-vendor-pool",
    name: "Gulf Coast Pool Care",
    category: "Pool",
    rating: 4.7,
    email: "gulfcoast.pool@golfheritagebay.com",
    phone: "(239) 555-2102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for North Naples homes.",
  },
  {
    id: "hb-vendor-clean",
    name: "Naples Nest Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "naples.nest@golfheritagebay.com",
    phone: "(239) 555-2103",
    description:
      "Housekeeping and deep cleans for coach homes, condos, and single-family residences in Heritage Bay.",
  },
  {
    id: "hb-vendor-hvac",
    name: "Collier Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "collier.climate@golfheritagebay.com",
    phone: "(239) 555-2104",
    description:
      "AC service, filter changes, and emergency cooling repair along Immokalee and Collier Blvd.",
  },
  {
    id: "hb-vendor-plumb",
    name: "Bay View Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "bayview.plumbing@golfheritagebay.com",
    phone: "(239) 555-2105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for gated-community homes.",
  },
  {
    id: "hb-vendor-windows",
    name: "ClearView Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "clearview.windows@golfheritagebay.com",
    phone: "(239) 555-2106",
    description:
      "Interior and exterior window cleaning for lanais, golf-course views, and multi-story homes.",
  },
  {
    id: "hb-vendor-spa",
    name: "Mercato Wellness Spa",
    category: "Spa",
    rating: 4.8,
    email: "mercato.spa@golfheritagebay.com",
    phone: "(239) 555-2107",
    description:
      "Member-preferred spa partner near Mercato — massage, facials, and couples packages.",
  },
  {
    id: "hb-vendor-catering",
    name: "Gulf Shore Event Catering",
    category: "Catering",
    rating: 4.6,
    email: "gulfshore.catering@golfheritagebay.com",
    phone: "(239) 555-2108",
    description:
      "Private party and villa catering for Heritage Bay gatherings, from casual to black-tie.",
  },
  {
    id: "hb-vendor-paint",
    name: "Azinger Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "azinger.paint@golfheritagebay.com",
    phone: "(239) 555-2109",
    description:
      "Interior and exterior painting for coach homes and estate residences throughout Heritage Bay.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
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

async function seedDining() {
  await prisma.provider.upsert({
    where: { id: "hb-provider-dining" },
    create: {
      id: "hb-provider-dining",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      name: "Heritage Bay Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "The Cabana (poolside) and The Grille Room — Executive Chef Vincent Capua.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Heritage Bay Dining",
      rating: 4.9,
      description:
        "The Cabana (poolside) and The Grille Room — Executive Chef Vincent Capua.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
  });

  // Replace stale demo rows so menus always match the club PDFs.
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

async function seedEngagement() {
  await prisma.announcement.upsert({
    where: { id: "hb-announcement-summer-hours" },
    create: {
      id: "hb-announcement-summer-hours",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      title: "Summer dining hours (May 1 – Oct 18)",
      body: "The Cabana: golfer window daily 7–3 · lunch Tue–Sun 11–3 · happy hour Tue–Sun 4–6 · dinner Sat–Sun 5–8. The Grille Room: happy hour + dinner Tue–Fri 4–8. Reservations: Events Desk x107 (Mon–Fri 10–4).",
      author: "Heritage Bay Club Management",
      priority: "important",
    },
    update: {
      title: "Summer dining hours (May 1 – Oct 18)",
      body: "The Cabana: golfer window daily 7–3 · lunch Tue–Sun 11–3 · happy hour Tue–Sun 4–6 · dinner Sat–Sun 5–8. The Grille Room: happy hour + dinner Tue–Fri 4–8. Reservations: Events Desk x107 (Mon–Fri 10–4).",
      author: "Heritage Bay Club Management",
      priority: "important",
    },
  });

  await prisma.announcement.upsert({
    where: { id: "hb-announcement-aqua" },
    create: {
      id: "hb-announcement-aqua",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      title: "Summer Aqua Fit is open",
      body: "Mon, Wed & Fri at 10:00 AM in the Main Pool. $10 single · punch cards 10/$90 and 20/$160. Book in Activities or on the calendar.",
      author: "Fitness",
      priority: "normal",
    },
    update: {
      title: "Summer Aqua Fit is open",
      body: "Mon, Wed & Fri at 10:00 AM in the Main Pool. $10 single · punch cards 10/$90 and 20/$160. Book in Activities or on the calendar.",
      author: "Fitness",
      priority: "normal",
    },
  });

  await prisma.announcement.upsert({
    where: { id: "hb-announcement-golf" },
    create: {
      id: "hb-announcement-golf",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      title: "PGA golf instruction available",
      body: "Book Justin McCarraher, John Damon, Mike Aroney, or Russ Ogrin. 30 min $60 · 60 min $110 · series packages from $165.",
      author: "Golf Shop",
      priority: "normal",
    },
    update: {
      title: "PGA golf instruction available",
      body: "Book Justin McCarraher, John Damon, Mike Aroney, or Russ Ogrin. 30 min $60 · 60 min $110 · series packages from $165.",
      author: "Golf Shop",
      priority: "normal",
    },
  });

  const charges = [
    {
      id: "hb-charge-dues",
      category: "dues",
      description: "Monthly membership dues — July",
      amount: 485,
      status: "due",
      dueDate: easternDateOffset(10),
    },
    {
      id: "hb-charge-aqua",
      category: "fitness",
      description: "Summer Aqua Fit — 10-class punch card",
      amount: 90,
      status: "paid",
      dueDate: easternDateOffset(-3),
    },
    {
      id: "hb-charge-lesson",
      category: "lessons",
      description: "Private golf lesson (1 hour) — John Damon, PGA",
      amount: 110,
      status: "due",
      dueDate: easternDateOffset(5),
    },
    {
      id: "hb-charge-grille",
      category: "dining",
      description: "The Grille Room — dinner for 2",
      amount: 94.5,
      status: "due",
      dueDate: easternDateOffset(2),
    },
  ] as const;

  for (const c of charges) {
    await prisma.memberCharge.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        memberEmail: MEMBER_EMAIL,
        memberName: MEMBER_NAME,
        category: c.category,
        description: c.description,
        amount: c.amount,
        status: c.status,
        dueDate: c.dueDate,
      },
      update: {
        description: c.description,
        amount: c.amount,
        status: c.status,
        dueDate: c.dueDate,
      },
    });
  }

  const diningOrders = [
    {
      key: "hb-order-cabana",
      items:
        "Heritage Blend Burger, Classic Caesar, Jumbo Chicken Wings [demo:hb-order-cabana]",
      total: 43,
      restaurant: "The Cabana",
      fulfillment: "eat_in",
      status: "Completed",
    },
    {
      key: "hb-order-grille",
      items:
        "BBQ Wagyu Beef Sliders, 6oz Linz Reserve Filet Mignon, Chocolate Lava Cake [demo:hb-order-grille]",
      total: 70,
      restaurant: "The Grille Room",
      fulfillment: "eat_in",
      status: "Completed",
    },
  ] as const;

  for (const order of diningOrders) {
    const existing = await prisma.diningOrder.findFirst({
      where: {
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        memberEmail: MEMBER_EMAIL,
        items: { contains: `[demo:${order.key}]` },
      },
    });
    if (existing) continue;
    await prisma.diningOrder.create({
      data: {
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        memberEmail: MEMBER_EMAIL,
        memberName: MEMBER_NAME,
        items: order.items,
        total: order.total,
        fulfillment: order.fulfillment,
        restaurant: order.restaurant,
        status: order.status,
        tableLabel: order.restaurant === "The Cabana" ? "Patio 3" : "Table 8",
      },
    });
  }

  const fbSpent = 113; // cabana + grille completed orders
  const fbRequired = 500;
  await prisma.memberFbPeriod.upsert({
    where: {
      communityId_memberEmail_periodStart: {
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        memberEmail: MEMBER_EMAIL,
        periodStart: "2026-01-01",
      },
    },
    create: {
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      memberEmail: MEMBER_EMAIL,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      periodKind: "annual",
      requiredAmount: fbRequired,
      spentAmount: fbSpent,
      status: "open",
    },
    update: {
      spentAmount: fbSpent,
      requiredAmount: fbRequired,
      periodEnd: "2026-12-31",
      periodKind: "annual",
      status: fbSpent >= fbRequired ? "met" : "open",
    },
  });

  const favorites = [
    { label: "The Cabana", href: "/member/dining" },
    { label: "The Grille Room", href: "/member/dining" },
    { label: "Book golf", href: "/member/bookings" },
    { label: "Tennis & pickleball", href: "/member/bookings" },
    { label: "Summer Aqua Fit", href: "/member/calendar" },
    { label: "Club calendar", href: "/member/calendar" },
    { label: "Pay dues", href: "/member/payments" },
  ] as const;

  for (const fav of favorites) {
    const existing = await prisma.memberFavorite.findFirst({
      where: {
        userEmail: MEMBER_EMAIL,
        label: fav.label,
        href: fav.href,
      },
    });
    if (existing) continue;
    await prisma.memberFavorite.create({
      data: {
        userEmail: MEMBER_EMAIL,
        label: fav.label,
        href: fav.href,
      },
    });
  }

  const residents = [
    {
      id: "hb-member-kelly",
      name: MEMBER_NAME,
      role: "Golf Member",
      email: MEMBER_EMAIL,
      accountRole: "member",
      unit: "Residence 214",
      isManagement: false,
    },
    {
      id: "hb-member-martinez",
      name: "Carlos Martinez",
      role: "Social Member",
      email: "carlos.martinez@golfheritagebay.com",
      accountRole: "member",
      unit: "Veranda 1203",
      isManagement: false,
    },
    {
      id: "hb-member-chen",
      name: "Linda Chen",
      role: "Tennis Member",
      email: "linda.chen@golfheritagebay.com",
      accountRole: "member",
      unit: "Coach Home 731",
      isManagement: false,
    },
    {
      id: "hb-member-oconnor",
      name: "Patricia O'Connor",
      role: "Golf Member",
      email: "patricia.oconnor@golfheritagebay.com",
      accountRole: "member",
      unit: "Terrace 204",
      isManagement: false,
    },
    {
      id: "hb-member-wilson",
      name: "James Wilson",
      role: "Golf Member",
      email: "james.wilson@golfheritagebay.com",
      accountRole: "member",
      unit: "Estate Home 48",
      isManagement: false,
    },
    {
      id: "hb-member-thompson",
      name: "Susan Thompson",
      role: "Social Member",
      email: "susan.thompson@golfheritagebay.com",
      accountRole: "member",
      unit: "Terrace 1116",
      isManagement: false,
    },
    {
      id: "hb-member-patel",
      name: "Raj Patel",
      role: "Golf Member",
      email: "raj.patel@golfheritagebay.com",
      accountRole: "member",
      unit: "Coach Home 824",
      isManagement: false,
    },
    {
      id: "hb-member-bennett",
      name: "Mary Bennett",
      role: "Social Member",
      email: "mary.bennett@golfheritagebay.com",
      accountRole: "member",
      unit: "Veranda 1402",
      isManagement: false,
    },
    {
      id: "hb-member-davis",
      name: "Thomas Davis",
      role: "Golf Member",
      email: "thomas.davis@golfheritagebay.com",
      accountRole: "member",
      unit: "Estate Home 63",
      isManagement: false,
    },
    {
      id: "hb-member-ramirez",
      name: "Elena Ramirez",
      role: "Tennis Member",
      email: "elena.ramirez@golfheritagebay.com",
      accountRole: "member",
      unit: "Terrace 508",
      isManagement: false,
    },
    {
      id: "hb-member-morgan",
      name: "David Morgan",
      role: "Golf Member",
      email: "david.morgan@golfheritagebay.com",
      accountRole: "member",
      unit: "Coach Home 916",
      isManagement: false,
    },
    {
      id: "hb-member-reynolds",
      name: "Nancy Reynolds",
      role: "Social Member",
      email: "nancy.reynolds@golfheritagebay.com",
      accountRole: "member",
      unit: "Veranda 1706",
      isManagement: false,
    },
    {
      id: "hb-board-brown",
      name: "Doug Brown",
      role: "Board",
      email: "board.demo@golfheritagebay.com",
      accountRole: "board",
      unit: "Estate Home 35",
      isManagement: false,
    },
    {
      id: "hb-board-foster",
      name: "Elaine Foster",
      role: "Board",
      email: "elaine.foster@golfheritagebay.com",
      accountRole: "board",
      unit: "Veranda 1812",
      isManagement: false,
    },
    {
      id: "hb-board-romano",
      name: "Michael Romano",
      role: "Board",
      email: "michael.romano@golfheritagebay.com",
      accountRole: "board",
      unit: "Coach Home 642",
      isManagement: false,
    },
    {
      id: "hb-property-mcintosh",
      name: "Stephanie McIntosh",
      role: "Property Management",
      email: "admin@golfheritagebay.com",
      accountRole: "pm",
      unit: "Management Office",
      isManagement: true,
    },
    {
      id: "hb-property-walker",
      name: "Jennifer Walker",
      role: "Property Management",
      email: "jennifer.walker@golfheritagebay.com",
      accountRole: "pm",
      unit: "Community Services",
      isManagement: true,
    },
    {
      id: "hb-property-collins",
      name: "Brian Collins",
      role: "Property Management",
      email: "brian.collins@golfheritagebay.com",
      accountRole: "pm",
      unit: "Resident Services",
      isManagement: true,
    },
  ] as const;

  const residentIds = residents.map((resident) => resident.id);
  const residentEmails = residents.map((resident) => resident.email);
  await prisma.communityMember.deleteMany({
    where: {
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      id: { notIn: residentIds },
    },
  });
  await prisma.user.deleteMany({
    where: {
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      email: { notIn: residentEmails },
    },
  });

  const directoryPassword = hashPassword("password");
  for (const r of residents) {
    await prisma.communityMember.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        name: r.name,
        role: r.role,
        isManagement: r.isManagement,
      },
      update: {
        name: r.name,
        role: r.role,
        isManagement: r.isManagement,
      },
    });
    await prisma.user.upsert({
      where: { email: r.email },
      create: {
        id: `u-${r.id}`,
        email: r.email,
        password: directoryPassword,
        role: r.accountRole,
        name: r.name,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
      },
      update: {
        role: r.accountRole,
        name: r.name,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
      },
    });
    await prisma.memberProfileExt.upsert({
      where: { userEmail: r.email },
      create: {
        userEmail: r.email,
        unit: r.unit,
        directoryVisible: true,
        residencyStatus: "resident",
        paysHoa: true,
      },
      update: {
        unit: r.unit,
        directoryVisible: true,
        residencyStatus: "resident",
        paysHoa: true,
      },
    });
  }

  await prisma.galleryImage.upsert({
    where: { id: "hb-gallery-aqua" },
    create: {
      id: "hb-gallery-aqua",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      title: "Summer Aqua Fit — Main Pool",
      category: "Fitness",
      url: brandAssets.heritageBayAquaFit,
      uploadedBy: "Heritage Bay",
    },
    update: {
      title: "Summer Aqua Fit — Main Pool",
      url: brandAssets.heritageBayAquaFit,
    },
  });

  await prisma.lessonBooking.upsert({
    where: { id: "hb-lesson-john" },
    create: {
      id: "hb-lesson-john",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      providerId: "hb-pro-john",
      providerName: "John Damon, PGA",
      proEmail: "john.damon@golfheritagebay.com",
      offeringName: "Private Golf Lesson (1 Hour)",
      sport: "golf",
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      date: easternDateOffset(3),
      startTime: "09:00",
      endTime: "10:00",
      amenityId: "hb-amenity-practice",
      status: "confirmed",
      fee: 110,
      notes: "Practice facility — short game focus",
    },
    update: {
      date: easternDateOffset(3),
      startTime: "09:00",
      endTime: "10:00",
      fee: 110,
      status: "confirmed",
    },
  });

  await prisma.lessonBooking.upsert({
    where: { id: "hb-lesson-sofia" },
    create: {
      id: "hb-lesson-sofia",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      providerId: "hb-pro-sofia",
      providerName: "Sofia Reyes",
      proEmail: "sofia.reyes@golfheritagebay.com",
      offeringName: "Private Tennis Lesson (1 Hour)",
      sport: "tennis",
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      date: easternDateOffset(5),
      startTime: "10:00",
      endTime: "11:00",
      amenityId: "hb-amenity-tennis",
      status: "confirmed",
      fee: 85,
      notes: "Court 3 — serve and return focus",
    },
    update: {
      date: easternDateOffset(5),
      startTime: "10:00",
      endTime: "11:00",
      fee: 85,
      status: "confirmed",
    },
  });

  await prisma.lessonBooking.upsert({
    where: { id: "hb-lesson-dana" },
    create: {
      id: "hb-lesson-dana",
      communityId: HERITAGE_BAY_COMMUNITY_ID,
      providerId: "hb-pro-dana",
      providerName: "Dana Kim",
      proEmail: "dana.kim@golfheritagebay.com",
      offeringName: "Private Pickleball Lesson (45 min)",
      sport: "pickleball",
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      date: easternDateOffset(6),
      startTime: "16:00",
      endTime: "16:45",
      amenityId: "hb-amenity-pickleball",
      status: "confirmed",
      fee: 65,
      notes: "Court 1 — dinking and kitchen play",
    },
    update: {
      date: easternDateOffset(6),
      startTime: "16:00",
      endTime: "16:45",
      fee: 65,
      status: "confirmed",
    },
  });
}

async function seedGroups() {
  const groups = [
    {
      id: "hb-group-golfers",
      name: "Heritage Bay Golfers",
      description: "Tee-time pairings, course updates, and friendly games across Pine, Cypress, and Oak.",
      color: "from-emerald-500 to-green-800",
      members: 286,
    },
    {
      id: "hb-group-nine-wine",
      name: "Ladies Nine & Wine",
      description: "Nine-hole outings, casual pairings, and post-round socials.",
      color: "from-rose-400 to-purple-700",
      members: 72,
    },
    {
      id: "hb-group-racquets",
      name: "Racquet Club",
      description: "Tennis and pickleball partners, open play, clinics, and court updates.",
      color: "from-sky-400 to-blue-700",
      members: 94,
    },
    {
      id: "hb-group-bocce",
      name: "Bocce Social League",
      description: "Weekly bocce meetups, team signups, and friendly evening matches.",
      color: "from-amber-400 to-orange-700",
      members: 58,
    },
    {
      id: "hb-group-book-wine",
      name: "Book & Wine Club",
      description: "Monthly reads and relaxed discussions in the clubhouse.",
      color: "from-violet-400 to-fuchsia-700",
      members: 41,
    },
    {
      id: "hb-group-neighbors",
      name: "Neighbors Helping Neighbors",
      description: "Recommendations, welcome notes, ride shares, and a helping hand around Heritage Bay.",
      color: "from-teal-400 to-cyan-700",
      members: 133,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
      },
      update: {
        name: group.name,
        description: group.description,
        color: group.color,
        members: group.members,
      },
    });
  }

  for (const groupId of ["hb-group-golfers", "hb-group-nine-wine"]) {
    await prisma.groupMembership.upsert({
      where: {
        groupId_userEmail: {
          groupId,
          userEmail: MEMBER_EMAIL,
        },
      },
      create: {
        groupId,
        userEmail: MEMBER_EMAIL,
      },
      update: {},
    });
  }

  const posts = [
    {
      id: "hb-group-post-golf-pairing",
      groupId: "hb-group-golfers",
      authorEmail: "patricia.oconnor@golfheritagebay.com",
      authorName: "Patricia O'Connor",
      body: "Looking for one more player for Cypress on Thursday at 8:12 AM. Friendly pace and coffee at The Cabana afterward.",
      hoursAgo: 6,
    },
    {
      id: "hb-group-post-nine-wine",
      groupId: "hb-group-nine-wine",
      authorEmail: "linda.chen@golfheritagebay.com",
      authorName: "Linda Chen",
      body: "Our next Nine & Wine is Tuesday at 3:30 PM on Oak. Please reply if you can stay for happy hour afterward!",
      hoursAgo: 19,
    },
    {
      id: "hb-group-post-racquet",
      groupId: "hb-group-racquets",
      authorEmail: "carlos.martinez@golfheritagebay.com",
      authorName: "Carlos Martinez",
      body: "Beginner pickleball open play has room for four more Saturday at 9:00 AM. Paddles are available at the courts.",
      hoursAgo: 27,
    },
    {
      id: "hb-group-post-neighbors",
      groupId: "hb-group-neighbors",
      authorEmail: "linda.chen@golfheritagebay.com",
      authorName: "Linda Chen",
      body: "Welcome to our new neighbors on Gator Bay Court! A few of us are bringing dessert by Friday evening.",
      hoursAgo: 42,
    },
  ] as const;

  for (const post of posts) {
    await prisma.groupPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        groupId: post.groupId,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        authorEmail: post.authorEmail,
        authorName: post.authorName,
        body: post.body,
        createdAt: new Date(Date.now() - post.hoursAgo * 60 * 60 * 1000),
      },
      update: {
        groupId: post.groupId,
        authorEmail: post.authorEmail,
        authorName: post.authorName,
        body: post.body,
      },
    });
  }

  await prisma.groupPostComment.upsert({
    where: { id: "hb-group-comment-kelly-golf" },
    create: {
      id: "hb-group-comment-kelly-golf",
      postId: "hb-group-post-golf-pairing",
      authorEmail: MEMBER_EMAIL,
      authorName: MEMBER_NAME,
      body: "I can join — please count me in!",
    },
    update: {
      body: "I can join — please count me in!",
    },
  });

  const messages = [
    {
      id: "hb-group-message-golf-1",
      groupId: "hb-group-golfers",
      author: "Patricia O'Connor",
      body: "Cypress is playing beautifully this morning. Greens are quick but fair.",
      hoursAgo: 8,
    },
    {
      id: "hb-group-message-golf-2",
      groupId: "hb-group-golfers",
      author: MEMBER_NAME,
      body: "Thanks for the update! I’ll leave the downhill putts below the hole.",
      hoursAgo: 7,
    },
    {
      id: "hb-group-message-nine-1",
      groupId: "hb-group-nine-wine",
      author: "Linda Chen",
      body: "I reserved two tables at The Grille Room for Tuesday after the round.",
      hoursAgo: 17,
    },
    {
      id: "hb-group-message-racquet-1",
      groupId: "hb-group-racquets",
      author: "Carlos Martinez",
      body: "Court 4 is open at 6 tonight if anyone wants a doubles warm-up.",
      hoursAgo: 4,
    },
  ] as const;

  for (const message of messages) {
    await prisma.groupMessage.upsert({
      where: { id: message.id },
      create: {
        id: message.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        groupId: message.groupId,
        author: message.author,
        body: message.body,
        createdAt: new Date(Date.now() - message.hoursAgo * 60 * 60 * 1000),
      },
      update: {
        groupId: message.groupId,
        author: message.author,
        body: message.body,
      },
    });
  }
}

export async function ensureHeritageBayDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: HERITAGE_BAY_COMMUNITY_ID },
    create: {
      id: HERITAGE_BAY_COMMUNITY_ID,
      name: "Heritage Bay Golf & Country Club",
      location: "Naples, FL",
      residentCount: 1250,
      serviceCount: 10,
      activityCount: 10,
      coverColor: "from-[#1f2937] to-[#c9a84c]",
      logoUrl: brandAssets.communityHeritageBay,
      primaryColor: "#1f2937",
      appDisplayName: "Heritage Bay",
      inviteCode: "heritage-bay-demo",
    },
    update: {
      name: "Heritage Bay Golf & Country Club",
      location: "Naples, FL",
      logoUrl: brandAssets.communityHeritageBay,
      primaryColor: "#1f2937",
      appDisplayName: "Heritage Bay",
      activityCount: 10,
    },
  });

  for (const user of [
    {
      id: "u-hb-member",
      email: MEMBER_EMAIL,
      role: "member",
      name: MEMBER_NAME,
    },
    {
      id: "u-hb-pm",
      email: "admin@golfheritagebay.com",
      role: "pm",
      name: "Stephanie McIntosh",
    },
    {
      id: "u-hb-board",
      email: "board.demo@golfheritagebay.com",
      role: "board",
      name: "Doug Brown",
    },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
      },
    });
  }

  await prisma.memberProfileExt.upsert({
    where: { userEmail: MEMBER_EMAIL },
    create: {
      userEmail: MEMBER_EMAIL,
      membershipTier: "full_golf",
      residencyStatus: "resident",
      paysHoa: true,
      unit: "Residence 214",
      householdAddress: "10154 Heritage Bay Boulevard, Naples, FL 34120",
    },
    update: {
      membershipTier: "full_golf",
      residencyStatus: "resident",
      paysHoa: true,
      unit: "Residence 214",
      householdAddress: "10154 Heritage Bay Boulevard, Naples, FL 34120",
    },
  });

  await ensureMembershipTiersSeeded(HERITAGE_BAY_COMMUNITY_ID);
  await seedAmenities();
  await seedStaffAndPros();
  await seedEventsAndBookings();
  await seedDining();
  await seedNearbyVendors();
  await seedGroups();
  await seedEngagement();
  await seedMessages();
}

/** Mock Messages inbox for Kelly — pros, Events Desk, and a neighbor. */
async function seedMessages() {
  const kelly = { email: MEMBER_EMAIL, name: MEMBER_NAME };
  const john = { email: "john.damon@golfheritagebay.com", name: "John Damon, PGA" };
  const sofia = { email: "sofia.reyes@golfheritagebay.com", name: "Sofia Reyes" };
  const dana = { email: "dana.kim@golfheritagebay.com", name: "Dana Kim" };
  const events = { email: "admin@golfheritagebay.com", name: "Events & Activities Desk" };
  const linda = { email: "linda.chen@golfheritagebay.com", name: "Linda Chen" };

  const threads: Array<{
    id: string;
    createdBy: string;
    participants: Array<{ email: string; name: string }>;
    messages: Array<{ author: { email: string; name: string }; body: string; hoursAgo: number }>;
  }> = [
    {
      id: "hb-chat-kelly-john",
      createdBy: kelly.email,
      participants: [kelly, john],
      messages: [
        {
          author: kelly,
          body: "Hi John — still good for our lesson Thursday at 9? Short game has been rough lately.",
          hoursAgo: 50,
        },
        {
          author: john,
          body: "Yes ma'am, 9:00 at the practice facility. We'll spend most of it on bunker play and 40-yard wedges.",
          hoursAgo: 48,
        },
        {
          author: kelly,
          body: "Perfect. Should I warm up on the range first?",
          hoursAgo: 47,
        },
        {
          author: john,
          body: "15 minutes of easy wedges is plenty. See you Thursday — I'll have a spot reserved on the short game green.",
          hoursAgo: 5,
        },
      ],
    },
    {
      id: "hb-chat-kelly-sofia",
      createdBy: sofia.email,
      participants: [kelly, sofia],
      messages: [
        {
          author: sofia,
          body: "Kelly — Court 3 opened up Saturday at 10 if you'd like that private lesson. We can work on your serve toss.",
          hoursAgo: 30,
        },
        {
          author: kelly,
          body: "Yes, let's do it! Do I need to bring balls?",
          hoursAgo: 28,
        },
        {
          author: sofia,
          body: "I've got a fresh hopper — just bring water and a towel, it's been humid. Booked you 10:00–11:00.",
          hoursAgo: 26,
        },
      ],
    },
    {
      id: "hb-chat-kelly-events",
      createdBy: kelly.email,
      participants: [kelly, events],
      messages: [
        {
          author: kelly,
          body: "Hi — can I get a table for two at The Grille Room Wednesday around 6? Celebrating an anniversary.",
          hoursAgo: 22,
        },
        {
          author: events,
          body: "Congratulations! You're set for Wednesday 6:00 PM, table by the window. Chef Capua's feature that night is the seafood cioppino.",
          hoursAgo: 20,
        },
        {
          author: kelly,
          body: "Wonderful, thank you!",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "hb-chat-kelly-linda",
      createdBy: linda.email,
      participants: [kelly, linda],
      messages: [
        {
          author: linda,
          body: "Kelly! A few of us are doing the Pickleball Social Mixer this week — want to join? Dana said beginners welcome.",
          hoursAgo: 14,
        },
        {
          author: kelly,
          body: "I'm in — I just booked Court 1 for Friday too. Loser buys smoothies at the Cabana?",
          hoursAgo: 12,
        },
        {
          author: linda,
          body: "Deal. See you there!",
          hoursAgo: 11,
        },
      ],
    },
    {
      id: "hb-chat-kelly-dana",
      createdBy: dana.email,
      participants: [kelly, dana],
      messages: [
        {
          author: dana,
          body: "Hi Kelly — saw you signed up for a pickleball lesson. Anything specific you want to focus on?",
          hoursAgo: 8,
        },
        {
          author: kelly,
          body: "Mostly the soft game — I keep popping the ball up at the kitchen line.",
          hoursAgo: 7,
        },
        {
          author: dana,
          body: "Classic. We'll drill dinks and resets — you'll be steadier in one session. See you on Court 1.",
          hoursAgo: 2,
        },
      ],
    },
  ];

  for (const thread of threads) {
    const existing = await prisma.chatThread.findUnique({
      where: { id: thread.id },
      select: { id: true },
    });
    if (existing) continue;

    const lastHoursAgo = Math.min(...thread.messages.map((m) => m.hoursAgo));
    await prisma.chatThread.create({
      data: {
        id: thread.id,
        communityId: HERITAGE_BAY_COMMUNITY_ID,
        kind: "dm",
        title: null,
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
