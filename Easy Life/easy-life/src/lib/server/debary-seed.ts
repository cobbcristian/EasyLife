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
 * DeBary Golf & Country Club — DeBary, FL demo tenant.
 * 300 Plantation Club Drive, DeBary, FL 32713 · (386) 668-1705
 * https://www.debarycc.com/
 * 18-hole championship course (Golf Digest 4-star; U.S. Open Qualifying site),
 * 6 lighted tennis (2 Har-Tru + 4 hard / pickleball), fitness, pool.
 * Dining: The Grille, The Pit @ DCC, Lakeview Room.
 */
export const DEBARY_COMMUNITY_ID = "debary";
const MEMBER_EMAIL = "member.demo@debarycc.com";
const MEMBER_NAME = "Jordan Blake";
const SOCIAL_EMAIL = "member.social@debarycc.com";
const SOCIAL_NAME = "Casey Nguyen";
const PM_EMAIL = "pm.demo@debarycc.com";
const PM_NAME = "Dan Flood";
const BOARD_EMAIL = "board.demo@debarycc.com";
const BOARD_NAME = "Patricia Owens";
const CLUB_PHONE = "(386) 668-1705";
const DINING_EMAIL = "dining@debarycc.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const racquetHours = defaultDailyHours("07:00", "20:00");
const fitnessHours = defaultDailyHours("06:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");
const clubhouseHours = defaultDailyHours("09:00", "21:00");

/** The Grille — lunch daily, dinner Tue–Sat. */
const grillHours: WeeklyHours = {
  mon: { open: "11:00", close: "15:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "19:00" },
};

/** Lakeview Room — dinner Thu–Sat. */
const mainDiningHours: WeeklyHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:00" },
  sat: { open: "17:00", close: "21:00" },
  sun: null,
};

/** The Pit @ DCC — seasonal lunch daily. */
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
    id: "db-amenity-golf",
    name: "Championship Course",
    description:
      "18-hole championship golf course — Golf Digest 4-star; U.S. Open Qualifying site.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "db-amenity-range",
    name: "Practice Range & Short Game",
    description:
      "Full driving range, chipping greens, and putting complex serving the championship course.",
    kind: "driving_range",
    unitCount: 20,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "db-amenity-tennis-clay",
    name: "Har-Tru Tennis Courts",
    description:
      "Two lighted Har-Tru clay courts with professional staff, leagues, and private lessons.",
    kind: "court",
    unitCount: 2,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "db-amenity-tennis-hard",
    name: "Hard Tennis Courts",
    description:
      "Four lighted hard courts — also lined for pickleball — leagues, open play, and lessons.",
    kind: "court",
    unitCount: 4,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "db-amenity-pickleball",
    name: "Pickleball Courts",
    description:
      "Four hard courts lined for pickleball — open play, clinics, and social round-robins.",
    kind: "court",
    unitCount: 4,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "db-amenity-pool",
    name: "Resort Pool",
    description:
      "Member pool — hub for family swim, recovery, and summer socials.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "db-amenity-fitness",
    name: "Fitness Center",
    description:
      "Full fitness center with personal training and group classes.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "db-amenity-dining-main",
    name: "Lakeview Room",
    description:
      "Events and dining with lake views — DeBary's signature room for dinners and gatherings.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: mainDiningHours,
  },
  {
    id: "db-amenity-dining-grill",
    name: "The Grille",
    description: "Casual grille for post-round burgers, salads, and cold drinks.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "db-amenity-dining-pit",
    name: "The Pit @ DCC",
    description: "Snack bar and BBQ favorites — casual fare near the course and courts.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: cabanaHours,
  },
  {
    id: "db-amenity-clubhouse",
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
    id: "db-staff-gm",
    name: "Dan Flood",
    title: "General Manager",
    department: "Club Management",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "db-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "db-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "db-staff-michael",
    name: "Alex Rivera",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@debarycc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "db-staff-laura",
    name: "Sam Patel",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@debarycc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "db-staff-david",
    name: "Chris Nguyen",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@debarycc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "db-staff-sophia",
    name: "Taylor Brooks",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "tennis@debarycc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "db-staff-ethan",
    name: "Morgan Ellis",
    title: "Assistant Tennis Professional",
    department: "Tennis",
    email: "tennis.assistant@debarycc.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "db-staff-fitness",
    name: "Fitness Center Desk",
    title: "Personal Training & Group Classes",
    department: "Fitness",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 30,
  },
  {
    id: "db-staff-dining",
    name: "Dining Reservations",
    title: "The Grille · The Pit @ DCC · Lakeview Room",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "db-staff-realtor",
    name: "Membership",
    title: "Membership · Real Estate Inquiries",
    department: "Membership",
    email: "membership@debarycc.com",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "db-pro-michael",
    name: "Alex Rivera",
    email: "golf@debarycc.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on the 18-hole championship course — Golf Digest 4-star; U.S. Open Qualifying site.",
  },
  {
    id: "db-pro-laura",
    name: "Sam Patel",
    email: "golf.assistant@debarycc.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on the championship course and practice range.",
  },
  {
    id: "db-pro-sophia",
    name: "Taylor Brooks",
    email: "tennis@debarycc.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on six lighted courts — 2 Har-Tru clay and 4 hard (also lined for pickleball).",
  },
  {
    id: "db-pro-ethan",
    name: "Morgan Ellis",
    email: "tennis.assistant@debarycc.com",
    category: "tennis",
    description:
      "Assistant Tennis Professional. Doubles strategy, junior development, pickleball clinics, and match-play coaching.",
  },
] as const;

/** Lakeview Room, The Grille, and The Pit @ DCC menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "db-menu-b-club", name: "The Pit Club Sandwich", price: 15, category: "The Pit @ DCC · Sandwiches" },
  { id: "db-menu-b-wrap", name: "Grilled Chicken Wrap", price: 14, category: "The Pit @ DCC · Sandwiches" },
  { id: "db-menu-b-smoothie", name: "Tropical Green Smoothie", price: 9, category: "The Pit @ DCC · Beverages" },
  { id: "db-menu-b-salad", name: "The Pit Cobb Salad", price: 15, category: "The Pit @ DCC · Salads" },
  { id: "db-menu-b-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "The Pit @ DCC · Beverages" },
  { id: "db-menu-g-burger", name: "DeBary Burger", price: 17, category: "The Grille · Favorites" },
  { id: "db-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "The Grille · Favorites" },
  { id: "db-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "The Grille · Salads" },
  { id: "db-menu-g-wings", name: "The Pit Wings", price: 15, category: "The Grille · Starters" },
  { id: "db-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "The Grille · Favorites" },
  { id: "db-menu-m-filet", name: "Filet Mignon (8 oz)", price: 48, category: "Lakeview Room · Entrées" },
  { id: "db-menu-m-snapper", name: "Pan-Seared Red Snapper", price: 38, category: "Lakeview Room · Entrées" },
  { id: "db-menu-m-risotto", name: "Wild Mushroom Risotto", price: 26, category: "Lakeview Room · Entrées" },
  { id: "db-menu-m-cake", name: "Key Lime Tart", price: 10, category: "Lakeview Room · Desserts" },
  { id: "db-menu-c-shrimp", name: "Grilled Gulf Shrimp Skewers", price: 16, category: "The Pit @ DCC · Small Plates" },
  { id: "db-menu-c-ceviche", name: "Citrus Ceviche", price: 14, category: "The Pit @ DCC · Small Plates" },
  { id: "db-menu-c-margarita", name: "Sunset Margarita", price: 12, category: "The Pit @ DCC · Bar" },
  { id: "db-menu-l-yogurt", name: "Fitness Desk Açaí Bowl", price: 11, category: "Fitness Desk · Breakfast" },
  { id: "db-menu-l-protein", name: "Protein Power Wrap", price: 13, category: "Fitness Desk · Lunch" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: DEBARY_COMMUNITY_ID,
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
        communityId: DEBARY_COMMUNITY_ID,
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
        communityId: DEBARY_COMMUNITY_ID,
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
    where: { id: "db-provider-dining" },
    create: {
      id: "db-provider-dining",
      communityId: DEBARY_COMMUNITY_ID,
      name: "DeBary Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "The Grille, The Pit @ DCC, and Lakeview Room.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "DeBary Dining",
      rating: 4.9,
      description:
        "The Grille, The Pit @ DCC, and Lakeview Room.",
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
    id: "db-vendor-lawn",
    name: "DeBary Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@debarycc.com",
    phone: "(386) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for DeBary homes off Plantation Club Drive.",
  },
  {
    id: "db-vendor-pool",
    name: "St. Johns River Pool Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@debarycc.com",
    phone: "(386) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for DeBary estates.",
  },
  {
    id: "db-vendor-clean",
    name: "Plantation Club Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@debarycc.com",
    phone: "(386) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in DeBary Golf & Country Club.",
  },
  {
    id: "db-vendor-hvac",
    name: "DeBary Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@debarycc.com",
    phone: "(386) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "db-vendor-plumb",
    name: "DeBary Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@debarycc.com",
    phone: "(386) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for DeBary members.",
  },
  {
    id: "db-vendor-windows",
    name: "Plantation Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@debarycc.com",
    phone: "(386) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "db-vendor-pest",
    name: "Bonita Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@debarycc.com",
    phone: "(386) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for DeBary properties.",
  },
  {
    id: "db-vendor-handyman",
    name: "DeBary Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@debarycc.com",
    phone: "(386) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "db-vendor-paint",
    name: "Canopy Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@debarycc.com",
    phone: "(386) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout DeBary.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-event-ladies-golf",
      title: "Ladies Day — Championship Course",
      description: "Weekly Ladies Day shotgun on the championship course followed by lunch at The Grille.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "Championship Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "db-event-mens-golf",
      title: "Men's Day — Championship Course",
      description: "Championship course member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "Championship Course",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "db-event-couples",
      title: "Couples Scramble & Wine Dinner",
      description: "Nine-hole couples scramble on the championship course followed by wine dinner in the Lakeview Room.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Championship Course",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "db-event-spa-evening",
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
      id: "db-event-tennis-mixer",
      title: "Har-Tru Tennis Mixer",
      description: "Rotating partners on green clay — Taylor Brooks hosts courts 1–4.",
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
      id: "db-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering on the clubhouse terrace with light bites from The Pit @ DCC.",
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
      id: "db-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in Lakeview Room.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Lakeview Room",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "db-event-pool-social",
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
      create: { ...event, communityId: DEBARY_COMMUNITY_ID, createdBy: "DeBary Golf & Country Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "db-booking-golf",
      amenityId: "db-amenity-golf",
      unitNumber: 1,
      amenity: "Championship Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "db-booking-tennis",
      amenityId: "db-amenity-tennis-clay",
      unitNumber: 1,
      amenity: "Har-Tru Tennis Courts",
      date: easternDateOffset(1),
      startTime: "10:00",
      endTime: "11:30",
    },
    {
      id: "db-booking-fitness",
      amenityId: "db-amenity-fitness",
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
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-announcement-golf",
      title: "three courses, 54 holes — summer tee times",
      body: "The championship course is in peak summer condition. Book tee times through the golf shop — early mornings recommended for the coolest rounds.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "db-announcement-tennis",
      title: "Five lighted Har-Tru courts — surface maintenance complete",
      body: "All eight green-clay Har-Tru courts have completed rolling and irrigation calibration. Book courts in the member app or contact Taylor Brooks for lesson availability.",
      author: "Racquet Sports",
      priority: "normal",
    },
    {
      id: "db-announcement-breezeway",
      title: "The Pit @ DCC open daily at the Fitness Center",
      body: "The Pit @ DCC lunch, smoothies, and post-tennis refreshments — steps from the Har-Tru courts and resort pool.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: DEBARY_COMMUNITY_ID },
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
      id: "db-document-club-guide",
      title: "DeBary Golf & Country Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "db-document-dues",
      title: "Membership Fees (Public Figures) — Golf & Sports",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "db-document-golf-courses",
      title: "Golf Course Guide — 3 Courses / 54 holes",
      category: "golf",
      url: "#",
      uploadedBy: "Alex Rivera · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "db-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "db-document-racquets",
      title: "Racquet Sports — 5 Lighted Har-Tru Tennis",
      category: "sports",
      url: "#",
      uploadedBy: "Fitness Center",
      daysAgo: 10,
    },
    {
      id: "db-document-dining",
      title: "Dining Hours — The Grille · The Pit @ DCC · Lakeview Room",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "db-document-lifestyle",
      title: "Fitness Center, Pool & Spa Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Fitness Center",
      daysAgo: 12,
    },
    {
      id: "db-document-naples",
      title: "Guest & Family Access Guide",
      category: "dining",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "db-document-real-estate",
      title: "Featured Homes — DeBary Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership · DeBary Realty",
      daysAgo: 4,
    },
    {
      id: "db-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Patricia Owens · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-group-golfers",
      name: "DeBary Golfers",
      description:
        "18-hole championship course — Golf Digest 4-star; U.S. Open Qualifying site. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "db-group-ladies-golf",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the championship course — The Grille lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "db-group-tennis",
      name: "Har-Tru Tennis",
      description: "Five lighted green-clay courts — lessons with Taylor Brooks & Morgan Ellis, leagues, and mixers.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "db-group-spa",
      name: "Pool & Spa Circle",
      description: "Resort pool socials, spa recovery evenings, and summer swim gatherings.",
      color: "from-sky-400 to-blue-700",
      members: 168,
    },
    {
      id: "db-group-fitness",
      name: "Fitness Center",
      description: "Group classes, personal training, spa recovery, and Fitness Desk meetups.",
      color: "from-teal-400 to-cyan-700",
      members: 312,
    },
    {
      id: "db-group-social",
      name: "DeBary Social Scene",
      description: "Wine dinners, pool socials, and Fitness Center evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "db-group-neighbors",
      name: "Neighbors at DeBary",
      description: "Welcome notes, ride shares, and recommendations around Plantation Club Drive and the community.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: DEBARY_COMMUNITY_ID,
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
    "db-group-golfers",
    "db-group-ladies-golf",
    "db-group-tennis",
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
    "db-group-social",
    "db-group-tennis",
    "db-group-spa",
    "db-group-fitness",
    "db-group-neighbors",
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
    { email: MEMBER_EMAIL, label: "Book championship golf", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "18-hole tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Lakeview Room & The Grille", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Har-Tru tennis courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Resort pool", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "The Pit @ DCC", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Fitness Center", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Fitness Center", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "The Pit @ DCC", href: "/member/dining" },
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
  const michael = { email: "golf@debarycc.com", name: "Alex Rivera" };
  const laura = { email: "golf.assistant@debarycc.com", name: "Sam Patel" };
  const sophia = { email: "tennis@debarycc.com", name: "Taylor Brooks" };
  const megan = { email: "tennis@debarycc.com", name: "Taylor Brooks" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: "membership@debarycc.com", name: "Membership" };
  const frederick = { email: PM_EMAIL, name: "Dan Flood" };
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
      id: "db-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Alex — can we do a playing lesson Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on the championship course — we'll focus on club selection and approach shots.",
          hoursAgo: 38,
        },
        {
          author: claire,
          body: "Perfect. Should I warm up on the range first?",
          hoursAgo: 36,
        },
        {
          author: michael,
          body: "Yes — arrive by 8:30. The greens are firm this week, so we'll talk landing areas too.",
          hoursAgo: 2,
        },
      ],
    },
    {
      id: "db-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Jordan — Court 4 is open Saturday at 10 for your Har-Tru lesson. We'll work on your kick serve.",
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
      id: "db-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in Lakeview Room Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Lakeview Room. The snapper and filet are chef's highlights this week.",
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
      id: "db-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Jordan — saw you booked Har-Tru for Saturday. Anything specific to focus on?",
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
      id: "db-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Jordan — tennis mixer tonight at 5 if you're free. Loser buys The Pit smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got an early tee time in the morning — rain check for the pool social Friday?",
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
      id: "db-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold The Pit seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — The Pit table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "db-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Sam — guest rate for my sister Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies — I can put you on a 2:30 tee. Course conditions are excellent this week.",
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
      id: "db-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Dan — my guest pass for Saturday's tee time still shows pending. Can Membership confirm?",
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
      id: "db-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Jordan — 310 Plantation Club Drive is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call DeBary Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "db-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Jordan — any member comments for the July board packet? We're covering Fitness Center hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the pool socials on the calendar through October — they've been wonderful for the community.",
          hoursAgo: 42,
        },
        {
          author: frederick,
          body: "Noted — Dan will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "db-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Jordan — board meeting next week covers fitness center hours and dining expansions. Any feedback from golf members?",
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
      id: "db-chat-tennis-group",
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
          body: "Yes — see you at 4. Loser buys The Pit smoothies?",
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
        communityId: DEBARY_COMMUNITY_ID,
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

export async function ensureDebaryDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: DEBARY_COMMUNITY_ID },
    create: {
      id: DEBARY_COMMUNITY_ID,
      name: "DeBary Golf & Country Club",
      location: "DeBary, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityDebary,
      primaryColor: "#1b4332",
      appDisplayName: "DeBary",
      inviteCode: "debary-demo",
    },
    update: {
      name: "DeBary Golf & Country Club",
      location: "DeBary, FL",
      logoUrl: brandAssets.communityDebary,
      primaryColor: "#1b4332",
      appDisplayName: "DeBary",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-db-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-db-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-db-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-db-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: DEBARY_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: DEBARY_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "310 Plantation Club Drive",
      householdAddress: "310 Plantation Club Drive, DeBary, FL 32713",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "320 Plantation Club Drive",
      householdAddress: "320 Plantation Club Drive, DeBary, FL 32713",
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

  await ensureMembershipTiersSeeded(DEBARY_COMMUNITY_ID);
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
export async function ensureDebaryDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureDebaryDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureDebaryDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureDebaryDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureDebaryDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureDebaryDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureDebaryDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "310 Plantation Club Drive",
      title: "Guest pass pending for Saturday championship tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the championship course — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "310 Plantation Club Drive",
      title: "Irrigation overspray on DeBary driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 22840 DeBary soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "310 Plantation Club Drive",
      title: "Har-Tru Court 6 net needs tightening",
      category: "Amenities",
      description: "Net sags in the middle on Court 6 — Saturday mixer is affected.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "320 Plantation Club Drive",
      title: "Pool string lights out",
      category: "Maintenance",
      description: "Half the pool string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "320 Plantation Club Drive",
      title: "Resort pool towel cabinet empty",
      category: "Amenities",
      description: "Pool towel stock at the resort pool was empty twice this week after noon.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "310 Plantation Club Drive",
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
        communityId: DEBARY_COMMUNITY_ID,
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
        communityId: DEBARY_COMMUNITY_ID,
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
  const proShop = "DeBary Pro Shop";
  const apparel = [
    {
      id: "db-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered DeBary crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/db-apparel-polo-navy.png",
    },
    {
      id: "db-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for tennis and warm DeBary rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/db-apparel-polo-navy.png",
    },
    {
      id: "db-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool DeBary mornings on the championship course.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/db-apparel-quarter-zip.png",
    },
    {
      id: "db-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered DeBary crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/db-apparel-cap-navy.png",
    },
    {
      id: "db-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for Har-Tru tennis and resort pool days.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/db-apparel-cap-navy.png",
    },
    {
      id: "db-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/db-apparel-polo-navy.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      communityId: DEBARY_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: DEBARY_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "db-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "db-apparel-cap",
            name: "Performance Cap — Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo — championship tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "db-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on DeBary after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "310 Plantation Club Drive",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "db-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Plantation Club Drive only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "320 Plantation Club Drive",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "db-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Fitness",
      seller: "Taylor Brooks",
      unit: "5330 DeBary Lane",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "db-marketplace-racquet",
      title: "Kids' Tennis Racquet",
      description: "Lightly used junior racquet for ages 8–12. Fresh grip and cover included.",
      price: 32,
      category: "Tennis",
      seller: "Morgan Ellis",
      unit: "340 Plantation Club Drive",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 4,
    },
    {
      id: "db-marketplace-polo",
      title: "DeBary Golf & Country Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "310 Plantation Club Drive",
      imageUrl: "/brand/apparel/db-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "db-marketplace-racquet",
      title: "Wilson Blade Tennis Racquet",
      description: "Junior tennis racquet — lightly used, great for Har-Tru clinics.",
      price: 85,
      category: "Tennis",
      seller: SOCIAL_NAME,
      unit: "320 Plantation Club Drive",
      imageUrl: brandAssets.marketplaceKidsRacquet,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-blog-five-courses",
      title: "Playing the championship course this season",
      excerpt:
        "Director of Golf Alex Rivera shares tips for the 18-hole championship course.",
      body: "DeBary members enjoy an 18-hole championship course — Golf Digest 4-star and a U.S. Open Qualifying site. Book early mornings for the coolest conditions and ask the golf shop about member events.",
      author: "Alex Rivera, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "db-blog-breezeway",
      title: "The Pit @ DCC favorites after tennis",
      excerpt:
        "Post-match smoothies, salads, and seating at The Pit @ DCC.",
      body: "After Har-Tru tennis or a lap swim, the The Pit @ DCC is the easy stop for light plates and cold drinks. The Pit @ DCC picks up for sunset dining — reserve through Dining in the member app.",
      author: "DeBary Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "db-blog-tennis-community",
      title: "Five lighted courts, one thriving community",
      excerpt:
        "Head Pro Taylor Brooks previews Thursday mixers and beginner clinics.",
      body: "With six lighted courts — 2 Har-Tru clay and 4 hard lined for pickleball — DeBary runs rotating partners and skill-based pods so everyone meets more members. Book a court in the app, arrive ten minutes early, and stay for The Pit @ DCC afterward.",
      author: "Taylor Brooks",
      category: "Racquets",
      daysAgo: 5,
    },
    {
      id: "db-blog-tennis",
      title: "Har-Tru care and court booking tips",
      excerpt:
        "Head Pro Taylor Brooks on clay-court etiquette and the best lesson times.",
      body: "Our two Har-Tru clay courts are rolled and irrigated daily; the four hard courts are also lined for pickleball. Slide into shots on clay, avoid dragging feet at the baseline, and book lessons mid-morning when the surface is firmest. Morgan Ellis runs junior clinics on weekends.",
      author: "Taylor Brooks",
      category: "Racquets",
      daysAgo: 7,
    },
    {
      id: "db-blog-lifestyle",
      title: "Fitness Center summer programming",
      excerpt:
        "Fitness classes, spa recovery, and Fitness Desk hours for the warm season.",
      body: "Train before tee times in the Fitness Center, then recover in the spa. Group classes fill quickly — check the calendar. Fitness Desk opens early for smoothies and protein bowls.",
      author: "Fitness Center Team",
      category: "Wellness",
      daysAgo: 9,
    },
    {
      id: "db-blog-welcome",
      title: "Welcome to DeBary Golf & Country Club",
      excerpt:
        "Simple ways to settle in — golf, racquets, dining, and community groups.",
      body: "Start with a casual meal at The Grille or The Pit @ DCC, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes, and the Membership is happy to answer real-estate questions.",
      author: "Dan Flood",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-blog-comment-golf-1",
      postId: "db-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable — thanks for the tips, Alex!",
    },
    {
      id: "db-blog-comment-golf-2",
      postId: "db-blog-five-courses",
      author: SOCIAL_NAME,
      body: "The championship course was in perfect shape last weekend.",
    },
    {
      id: "db-blog-comment-breezeway-1",
      postId: "db-blog-breezeway",
      author: MEMBER_NAME,
      body: "The Pit after tennis is our Saturday ritual now.",
    },
    {
      id: "db-blog-comment-tennis-1",
      postId: "db-blog-tennis-community",
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
      id: "db-newsletter-july-2026",
      title: "DeBary Golf & Country Club Summer Update — July 2026",
      summary:
        "Championship course in peak condition, pool socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at DeBary Golf & Country Club. The 18-hole championship course — Golf Digest 4-star; U.S. Open Qualifying site — is in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Lakeview Room, The Grille, and The Pit @ DCC — reserve in Dining",
        "• Resort pool social with live music",
        "• Har-Tru tennis mixer — Thursdays on the lighted courts",
        "• Six lighted tennis courts (2 Har-Tru + 4 hard / pickleball), fitness center, and resort pool",
        "",
        "Questions: Membership · (386) 668-1705 · 300 Plantation Club Drive, DeBary, FL 32713 · membership@debarycc.com · https://www.debarycc.com/",
        "",
        "— Dan Flood",
        "Membership & Communications",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "db-newsletter-golf-racquets",
      title: "Golf & Racquets Roundup",
      summary:
        "Course notes from Alex Rivera, Har-Tru tennis clinics, and fitness programming.",
      body: [
        "Golf & Racquets members,",
        "",
        "Golf: The championship course is playing firm and fast. Warm up on the practice range, then book lessons with Alex Rivera or Sam Patel.",
        "",
        "Racquets: Taylor Brooks and Morgan Ellis are booking tennis on six lighted courts (2 Har-Tru + 4 hard / pickleball).",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app.",
        "",
        "— Golf Shop & Racquet Pros",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "db-newsletter-dining",
      title: "Dining at DeBary — Midsummer Menus",
      summary:
        "The Grille lunches, Lakeview Room wine dinners, and The Pit @ DCC evenings.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across The Grille, The Pit @ DCC, and Lakeview Room. After tennis or a lap swim, The Pit is the easy stop. Evening reservations for Lakeview Room book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "Lakeview Room, The Grille, and The Pit @ DCC — reserve through the same Dining line.",
        "",
        "— DeBary Dining",
        "dining@debarycc.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "db-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, DeBary Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest DeBary neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "DeBary does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at membership@debarycc.com · (386) 668-1705 · 300 Plantation Club Drive, DeBary, FL 32713.",
        "",
        "Thank you for making DeBary Golf & Country Club a vibrant member-owned community.",
        "",
        "— Club Administration · Dan Flood, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-gallery-bay-island",
      title: "Championship 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Alex Rivera",
      daysAgo: 1,
    },
    {
      id: "db-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "db-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Sam Patel",
      daysAgo: 3,
    },
    {
      id: "db-gallery-pool",
      title: "Resort pool",
      category: "Wellness",
      url: brandAssets.servicePool,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 4,
    },
    {
      id: "db-gallery-tennis",
      title: "Har-Tru green clay courts",
      category: "Racquets",
      url: brandAssets.amenityTennisClay,
      uploadedBy: "Taylor Brooks",
      daysAgo: 5,
    },
    {
      id: "db-gallery-spa",
      title: "Spa recovery lounge",
      category: "Wellness",
      url: brandAssets.amenitySpa,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 6,
    },
    {
      id: "db-gallery-fitness",
      title: "Fitness Center",
      category: "Wellness",
      url: brandAssets.amenityFitness,
      uploadedBy: "Fitness Center Team",
      daysAgo: 7,
    },
    {
      id: "db-gallery-dining",
      title: "Lakeview Room & The Grille",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "DeBary Dining",
      daysAgo: 8,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: DEBARY_COMMUNITY_ID,
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
      id: "db-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "310 Plantation Club Drive, DeBary, FL 32713",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "db-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "5330 DeBary Lane, DeBary, FL 34135",
      type: "Investment property",
      owner: true,
    },
    {
      id: "db-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "320 Plantation Club Drive, DeBary, FL 32713",
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
  const patriciaEmail = "membership@debarycc.com";
  const listings = [
    {
      id: "db-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "DeBary Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the Fitness Center. Listed with Membership · membership@debarycc.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 Plantation Club Drive",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "db-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Plantation Club Drive Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to Har-Tru tennis, the fitness center, and The Pit @ DCC.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 Plantation Club Drive",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "db-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "DeBary Lane Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the championship course. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "5330 DeBary Lane",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.amenitySpa],
      daysAgo: 6,
    },
    {
      id: "db-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — DeBary Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Fitness Center. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "340 Plantation Club Drive",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.amenityFitness],
      daysAgo: 8,
    },
    {
      id: "db-real-estate-naples",
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
        communityId: DEBARY_COMMUNITY_ID,
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
