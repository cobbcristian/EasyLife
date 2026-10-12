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
 * The Nest Golf Club — Bonita Springs, FL demo tenant.
 * 4450 Pelicans Nest Drive, Bonita Springs, FL 34134 · (239) 947-2282
 * membership@nestgolf.com · https://www.nestgolf.com/
 * Membership: A.J. Szymanski, Director of Membership Sales — membership@nestgolf.com
 * Two 18-hole Tom Fazio courses (Hatchery Course & Preserve Course), driving range,
 * putting green, short-game area with bunker. Golf + social only (no tennis/pool/fitness).
 * Dining: Grill Room, Main Dining Room, Formal Dining Room, Veranda, private dining.
 */
export const THE_NEST_COMMUNITY_ID = "the-nest";
const MEMBER_EMAIL = "member.demo@nestgolf.com";
const MEMBER_NAME = "Blake Avery";
const SOCIAL_EMAIL = "member.social@nestgolf.com";
const SOCIAL_NAME = "Riley Santos";
const PM_EMAIL = "pm.demo@nestgolf.com";
const PM_NAME = "AJ Szymanski";
const BOARD_EMAIL = "board.demo@nestgolf.com";
const BOARD_NAME = "Jordan Hale";
const CLUB_PHONE = "(239) 947-2282";
const PRO_SHOP_PHONE = "(239) 947-2282";
const DINING_EMAIL = "dining@nestgolf.com";
const MEMBERSHIP_EMAIL = "membership@nestgolf.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const clubhouseHours = defaultDailyHours("09:00", "21:00");
const proShopHours = defaultDailyHours("07:00", "18:00");
const practiceHours = defaultDailyHours("07:00", "19:00");

/** Grill Room — casual lunch and early dinner. */
const grillHours: WeeklyHours = {
  mon: { open: "11:00", close: "20:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "20:00" },
};

/** Main Dining Room — lunch and dinner. */
const mainDiningHours: WeeklyHours = {
  mon: { open: "11:30", close: "21:00" },
  tue: { open: "11:30", close: "21:00" },
  wed: { open: "11:30", close: "21:00" },
  thu: { open: "11:30", close: "21:00" },
  fri: { open: "11:30", close: "21:30" },
  sat: { open: "11:30", close: "21:30" },
  sun: { open: "11:30", close: "21:00" },
};

/** Formal Dining Room — evenings. */
const formalHours: WeeklyHours = {
  mon: null,
  tue: { open: "17:00", close: "21:00" },
  wed: { open: "17:00", close: "21:00" },
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:30" },
  sat: { open: "17:00", close: "21:30" },
  sun: { open: "17:00", close: "21:00" },
};

/** Veranda — outdoor dining, weather permitting. */
const verandaHours: WeeklyHours = {
  mon: { open: "11:00", close: "20:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "21:00" },
  sat: { open: "11:00", close: "21:00" },
  sun: { open: "11:00", close: "20:00" },
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
    id: "tn-amenity-hatchery",
    name: "Hatchery Course",
    description:
      "18-hole Tom Fazio layout — signature Nest golf through preserve corridors and strategic bunkering.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "tn-amenity-preserve",
    name: "Preserve Course",
    description:
      "18-hole Tom Fazio companion course — lakes, wetlands, and tree-lined fairways for a second championship test.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "tn-amenity-range",
    name: "Driving Range",
    description:
      "Full-length driving range for warm-ups before Hatchery or Preserve Course tee times.",
    kind: "driving_range",
    unitCount: 24,
    holes: null,
    hoursJson: practiceHours,
  },
  {
    id: "tn-amenity-putting",
    name: "Putting Green",
    description: "Practice putting green adjacent to the clubhouse and first tees.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: practiceHours,
  },
  {
    id: "tn-amenity-short-game",
    name: "Short Game Area",
    description:
      "Short-game practice with bunker — chips, pitches, and sand shots before your round.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: practiceHours,
  },
  {
    id: "tn-amenity-dining-grill",
    name: "Grill Room",
    description: "Casual member dining — post-round favorites, salads, and club classics.",
    kind: "restaurant",
    unitCount: 16,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "tn-amenity-dining-main",
    name: "Main Dining Room",
    description: "Primary club dining for lunch and dinner — member gatherings and celebrations.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: mainDiningHours,
  },
  {
    id: "tn-amenity-dining-formal",
    name: "Formal Dining Room",
    description: "Evening fine dining for special occasions and member events.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: formalHours,
  },
  {
    id: "tn-amenity-dining-veranda",
    name: "Veranda",
    description: "Outdoor dining overlooking the grounds — lunch, dinner, and sunset gatherings.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: verandaHours,
  },
  {
    id: "tn-amenity-dining-private",
    name: "Private Dining Rooms",
    description: "Private dining rooms for member celebrations, board dinners, and hosted events.",
    kind: "restaurant",
    unitCount: 4,
    holes: null,
    hoursJson: formalHours,
  },
  {
    id: "tn-amenity-proshop",
    name: "Pro Shop",
    description: "Golf shop for tee times, apparel, and equipment — (239) 947-2282.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: proShopHours,
  },
  {
    id: "tn-amenity-clubhouse",
    name: "Clubhouse",
    description:
      "Main clubhouse serving Hatchery & Preserve Courses, Grill Room, Main Dining Room, Formal Dining, Veranda, and private dining.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "tn-staff-gm",
    name: "AJ Szymanski",
    title: "Director of Membership Sales",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "tn-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "tn-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "tn-staff-michael",
    name: "Mike Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@nestgolf.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "tn-staff-laura",
    name: "Jamie Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@nestgolf.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "tn-staff-david",
    name: "Luis Ramirez",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@nestgolf.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "tn-staff-dining",
    name: "Dining Reservations",
    title: "Grill · Main Dining · Formal · Veranda",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "tn-staff-realtor",
    name: "AJ Szymanski",
    title: "Membership · Real Estate Inquiries",
    department: "Membership",
    email: MEMBERSHIP_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "tn-pro-michael",
    name: "Mike Torres",
    email: "golf@nestgolf.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on both Tom Fazio 18-hole courses — Hatchery and Preserve — plus the driving range and short-game area.",
  },
  {
    id: "tn-pro-laura",
    name: "Jamie Chen",
    email: "golf.assistant@nestgolf.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on Hatchery and Preserve Courses.",
  },
] as const;

/** Grill Room, Main Dining Room, Formal Dining Room, and Veranda menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "tn-menu-g-burger", name: "Nest Burger", price: 17, category: "Grill Room · Favorites" },
  { id: "tn-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "Grill Room · Favorites" },
  { id: "tn-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "Grill Room · Salads" },
  { id: "tn-menu-g-wings", name: "Club Wings", price: 15, category: "Grill Room · Starters" },
  { id: "tn-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "Grill Room · Favorites" },
  { id: "tn-menu-g-club", name: "Nest Club Sandwich", price: 15, category: "Grill Room · Favorites" },
  { id: "tn-menu-g-cake", name: "Key Lime Tart", price: 10, category: "Grill Room · Desserts" },
  { id: "tn-menu-m-salmon", name: "Pan-Seared Salmon", price: 32, category: "Main Dining Room · Entrees" },
  { id: "tn-menu-m-chicken", name: "Herb Roasted Chicken", price: 28, category: "Main Dining Room · Entrees" },
  { id: "tn-menu-m-salad", name: "Nest Cobb Salad", price: 16, category: "Main Dining Room · Salads" },
  { id: "tn-menu-m-soup", name: "Soup of the Day", price: 9, category: "Main Dining Room · Starters" },
  { id: "tn-menu-f-filet", name: "Filet Mignon", price: 48, category: "Formal Dining Room · Steaks" },
  { id: "tn-menu-f-ribeye", name: "Bone-In Ribeye", price: 52, category: "Formal Dining Room · Steaks" },
  { id: "tn-menu-f-grouper", name: "Gulf Grouper", price: 38, category: "Formal Dining Room · Seafood" },
  { id: "tn-menu-f-cake", name: "Chocolate Lava Cake", price: 12, category: "Formal Dining Room · Desserts" },
  { id: "tn-menu-v-wrap", name: "Turkey Avocado Wrap", price: 14, category: "Veranda · Lunch" },
  { id: "tn-menu-v-shrimp", name: "Gulf Shrimp Small Plate", price: 16, category: "Veranda · Small Plates" },
  { id: "tn-menu-v-margarita", name: "Sunset Margarita", price: 12, category: "Veranda · Bar" },
  { id: "tn-menu-v-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Veranda · Beverages" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
        communityId: THE_NEST_COMMUNITY_ID,
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
    const imageCategory = "Golf";
    await prisma.provider.upsert({
      where: { id: pro.id },
      create: {
        id: pro.id,
        name: pro.name,
        email: pro.email,
        description: pro.description,
        communityId: THE_NEST_COMMUNITY_ID,
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
    where: { id: "tn-provider-dining" },
    create: {
      id: "tn-provider-dining",
      communityId: THE_NEST_COMMUNITY_ID,
      name: "The Nest Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Grill Room, Main Dining Room, Formal Dining Room, Veranda, and private dining rooms.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "The Nest Dining",
      rating: 4.9,
      description:
        "Grill Room, Main Dining Room, Formal Dining Room, Veranda, and private dining rooms.",
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
    id: "tn-vendor-lawn",
    name: "Pelican Nest Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@nestgolf.com",
    phone: "(239) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for The Nest homes off Pelicans Nest Rd.",
  },
  {
    id: "tn-vendor-pool",
    name: "Bonita Springs Home Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@nestgolf.com",
    phone: "(239) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for The Nest estates.",
  },
  {
    id: "tn-vendor-clean",
    name: "Pelicans Nest Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@nestgolf.com",
    phone: "(239) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in The Nest Golf Club.",
  },
  {
    id: "tn-vendor-hvac",
    name: "Pelican Nest Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@nestgolf.com",
    phone: "(239) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "tn-vendor-plumb",
    name: "Pelican Nest Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@nestgolf.com",
    phone: "(239) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for The Nest members.",
  },
  {
    id: "tn-vendor-windows",
    name: "Pelican Nest Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@nestgolf.com",
    phone: "(239) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "tn-vendor-pest",
    name: "Pelican Nest Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@nestgolf.com",
    phone: "(239) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for The Nest properties.",
  },
  {
    id: "tn-vendor-handyman",
    name: "Pelican Nest Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@nestgolf.com",
    phone: "(239) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "tn-vendor-paint",
    name: "Nest Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@nestgolf.com",
    phone: "(239) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout The Nest.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-event-ladies-golf",
      title: "Ladies Day — Hatchery Course",
      description: "Weekly Ladies Day shotgun on the Hatchery Course followed by lunch in the Grill Room.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "Hatchery Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "tn-event-mens-golf",
      title: "Men's Day — Preserve Course",
      description: "Preserve Course member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "Preserve Course",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "tn-event-couples",
      title: "Couples Scramble & Grill Room Lunch",
      description: "Nine-hole couples scramble on the Hatchery Course followed by lunch in the Grill Room.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "Hatchery Course",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "tn-event-range-clinic",
      title: "Driving Range & Short-Game Clinic",
      description: "Short-game clinic on the range and bunker area with Mike Torres — warm up before your next Fazio round.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Driving Range",
      category: "golf",
      isPromoted: true,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "tn-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering on the Veranda with small plates and sunset views.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Veranda",
      category: "social",
      isPromoted: false,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "tn-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in the Formal Dining Room.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Formal Dining Room",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "tn-event-fazio-invite",
      title: "Fazio Course Member Invite",
      description: "Member-guest shotgun rotating Hatchery and Preserve Courses — dinner in Main Dining Room after.",
      date: easternDateOffset(8),
      time: "08:00",
      location: "Hatchery & Preserve Courses",
      category: "golf",
      isPromoted: true,
      capacity: 64,
      requirePayment: true,
      feeCents: 15000,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: THE_NEST_COMMUNITY_ID, createdBy: "The Nest Golf Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "tn-booking-hatchery",
      amenityId: "tn-amenity-hatchery",
      unitNumber: 1,
      amenity: "Hatchery Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "tn-booking-preserve",
      amenityId: "tn-amenity-preserve",
      unitNumber: 1,
      amenity: "Preserve Course",
      date: easternDateOffset(1),
      startTime: "09:00",
      endTime: "13:00",
    },
    {
      id: "tn-booking-range",
      amenityId: "tn-amenity-range",
      unitNumber: 1,
      amenity: "Driving Range",
      date: easternDateOffset(3),
      startTime: "07:30",
      endTime: "08:30",
    },
    {
      id: "tn-booking-short-game",
      amenityId: "tn-amenity-short-game",
      unitNumber: 1,
      amenity: "Short Game Area",
      date: easternDateOffset(2),
      startTime: "10:00",
      endTime: "11:00",
    },
  ] as const;

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        ...booking,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-announcement-golf",
      title: "Hatchery & Preserve in peak condition",
      body: "Both Tom Fazio 18-hole courses are open. Book tee times through the pro shop at (239) 947-2282 — early mornings recommended.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "tn-announcement-range",
      title: "Practice facilities open daily",
      body: "Warm up on the driving range, putting green, and short-game bunker before Hatchery or Preserve rounds. Lessons with Mike Torres and Jamie Chen book in the member app.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "tn-announcement-dining",
      title: "Club Dining · Grill · Formal · Veranda",
      body: "Grill Room and Main Dining Room serve lunch and dinner. Formal Dining Room evenings; Veranda outdoor seating weather permitting. Private dining rooms available for member events.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: THE_NEST_COMMUNITY_ID },
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
      id: "tn-document-club-guide",
      title: "The Nest Golf Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "tn-document-dues",
      title: "Membership Fees — Golf & Social",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "tn-document-golf-courses",
      title: "Golf Course Guide — 36 holes · Hatchery & Preserve",
      category: "golf",
      url: "#",
      uploadedBy: "Mike Torres · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "tn-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "tn-document-golf",
      title: "Pro Shop Guide — Apparel & Equipment",
      category: "golf",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 10,
    },
    {
      id: "tn-document-dining",
      title: "Dining Hours — Main Dining Room · Veranda",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "tn-document-lifestyle",
      title: "Pro Shop & Clubhouse Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 12,
    },
    {
      id: "tn-document-naples",
      title: "Guest & Family Access Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "tn-document-real-estate",
      title: "Featured Homes — The Nest Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership · The Nest Realty",
      daysAgo: 4,
    },
    {
      id: "tn-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Jordan Hale · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-group-golf",
      name: "Championship Golf",
      description:
        "18 holes — 18-hole Hatchery Course (Audubon championship golf). Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "tn-group-ladies",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the Hatchery Course — Main Dining Room lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "tn-group-mens",
      name: "Men's Day Golf",
      description: "Men's Day competitions rotating the Hatchery Course.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "tn-group-dining",
      name: "Dining & Lounge",
      description: "Main Dining Room lunch daily and Veranda sunrise–sunset.",
      color: "from-amber-400 to-orange-700",
      members: 410,
    },
    {
      id: "tn-group-social",
      name: "Member Socials",
      description: "Twilight gatherings, wine dinners, and clubhouse terrace evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "tn-group-newcomers",
      name: "New Member Welcome",
      description: "Welcome notes, ride shares, and recommendations around Pelicans Nest Rd and the club.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: THE_NEST_COMMUNITY_ID,
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
    "tn-group-golf",
    "tn-group-ladies",
    "tn-group-dining",
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
    "tn-group-social",
    "tn-group-golf",
    "tn-group-dining",
    "tn-group-newcomers",
    "tn-group-mens",
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
    { email: MEMBER_EMAIL, label: "Hatchery Course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Preserve Course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Driving Range", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Grill Room", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Veranda", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Formal Dining Room", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Main Dining Room", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Member events", href: "/member/events" },
    { email: SOCIAL_EMAIL, label: "Pro Shop apparel", href: "/member/apparel" },
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
  const michael = { email: "golf@nestgolf.com", name: "Mike Torres" };
  const laura = { email: "golf.assistant@nestgolf.com", name: "Jamie Chen" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: MEMBERSHIP_EMAIL, name: "AJ Szymanski" };
  const frederick = { email: PM_EMAIL, name: "AJ Szymanski" };
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
      id: "tn-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Blake — can we do a playing lesson Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on the the Hatchery Course — we'll focus on club selection and approach shots.",
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
id: "tn-chat-claire-shortgame",
      createdBy: michael.email,
      participants: [claire, michael],
      messages: [
        {
          author: michael,
          body: "Blake — the short-game area and bunker are open Saturday at 10. We'll work on your chip shots before the Hatchery round.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: michael,
          body: "Basket is ready at the range — just water and a visor. Booked 10:00–11:00.",
          hoursAgo: 24,
        },
      ],
    },
    {
            id: "tn-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in Main Dining Room Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Main Dining Room. The snapper and filet are chef's highlights this week.",
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
id: "tn-chat-claire-preserve",
      createdBy: laura.email,
      participants: [claire, laura],
      messages: [
        {
          author: laura,
          body: "Hi Blake — saw you booked the Preserve Course. Anything specific to focus on?",
          hoursAgo: 10,
        },
        {
          author: claire,
          body: "Mostly approach shots into the lakeside greens — I keep leaving them short.",
          hoursAgo: 8,
        },
        {
          author: laura,
          body: "Classic. We'll drill approaches on the range — you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
            id: "tn-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Blake — member social tonight at 5 if you're free. Loser buys Veranda smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got an early tee time in the morning — rain check for the lounge social Friday?",
          hoursAgo: 7,
        },
        {
          author: robert,
          body: "Friday works. See you at the clubhouse terrace.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "tn-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold Veranda seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Veranda table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "tn-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Jamie — guest rate for my sister Saturday? She's visiting from Chicago.",
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
      id: "tn-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "AJ — my guest pass for Saturday's tee time still shows pending. Can Membership confirm?",
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
      id: "tn-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Blake — 4460 Pelicans Nest Drive is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call The Nest Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "tn-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Blake — any member comments for the July board packet? We're covering Pro Shop hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the lounge socials on the calendar through October — they've been wonderful for the community.",
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
      id: "tn-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Blake — board meeting next week covers pro shop hours and dining expansions. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Lounge gathering after morning rounds would be great — early appointment slots if possible.",
          hoursAgo: 48,
        },
        {
          author: james,
          body: "Thank you — I'll share that with AJ and the golf shop.",
          hoursAgo: 46,
        },
      ],
    },
    {
id: "tn-chat-golf-social",
      kind: "group",
      title: "Twilight Member Social",
      createdBy: michael.email,
      participants: [claire, robert, michael],
      messages: [
        {
          author: michael,
          body: "Twilight nine on Hatchery Thursday at 4 — then Veranda for small plates. All levels welcome.",
          hoursAgo: 15,
        },
        {
          author: robert,
          body: "I'm in. Anyone up for the short-game bunker after if it frees up?",
          hoursAgo: 12,
        },
        {
          author: claire,
          body: "Yes — see you at 4. Loser buys Veranda smoothies?",
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
        communityId: THE_NEST_COMMUNITY_ID,
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

export async function ensureTheNestDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: THE_NEST_COMMUNITY_ID },
    create: {
      id: THE_NEST_COMMUNITY_ID,
      name: "The Nest Golf Club",
      location: "Bonita Springs, FL",
      residentCount: 1650,
      serviceCount: 2,
      activityCount: 12,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityTheNest,
      primaryColor: "#1b4332",
      appDisplayName: "The Nest",
      inviteCode: "the-nest-demo",
    },
    update: {
      name: "The Nest Golf Club",
      location: "Bonita Springs, FL",
      logoUrl: brandAssets.communityTheNest,
      primaryColor: "#1b4332",
      appDisplayName: "The Nest",
      activityCount: 12,
    },
  });

  for (const user of [
    { id: "u-tn-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-tn-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-tn-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-tn-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: THE_NEST_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: THE_NEST_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "4460 Pelicans Nest Drive",
      householdAddress: "4460 Pelicans Nest Drive, Bonita Springs, FL 34134",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "4470 Pelicans Nest Drive",
      householdAddress: "4470 Pelicans Nest Drive, Bonita Springs, FL 34134",
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

  await ensureMembershipTiersSeeded(THE_NEST_COMMUNITY_ID);
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
export async function ensureTheNestDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureTheNestDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureTheNestDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureTheNestDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureTheNestDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureTheNestDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureTheNestDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "4460 Pelicans Nest Drive",
      title: "Guest pass pending for Saturday Hatchery Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the Hatchery Course — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "4460 Pelicans Nest Drive",
      title: "Irrigation overspray on Pelicans Nest driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 4440 Pelicans Nest soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "4460 Pelicans Nest Drive",
      title: "Hatchery Course cart path near hole 7",
      category: "Amenities",
      description: "Cart path washout near Hatchery Course hole 7 — needs fill before weekend play.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "4470 Pelicans Nest Drive",
      title: "Clubhouse terrace string lights out",
      category: "Maintenance",
      description: "Half the terrace string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "4470 Pelicans Nest Drive",
      title: "Pro Shop bag storage locker stuck",
      category: "Amenities",
      description: "Locker 14 in the pro shop bag room will not open — key turns but latch sticks.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "4460 Pelicans Nest Drive",
      title: "Hatchery Course range balls low mid-morning",
      category: "Amenities",
      description: "Practice range ball baskets were empty by 9:30 twice this week.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: THE_NEST_COMMUNITY_ID,
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
        communityId: THE_NEST_COMMUNITY_ID,
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
  const proShop = "The Nest Pro Shop";
  const apparel = [
    {
      id: "tn-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered The Nest crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/tn-apparel-polo-navy.png",
    },
    {
      id: "tn-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for warm The Nest rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/tn-apparel-ladies-polo.png",
    },
    {
      id: "tn-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool The Nest mornings on the the Hatchery Course.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/tn-apparel-quarter-zip.png",
    },
    {
      id: "tn-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered The Nest crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/tn-apparel-cap-navy.png",
    },
    {
      id: "tn-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for the Hatchery Course.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/tn-apparel-visor-black.png",
    },
    {
      id: "tn-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/tn-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      communityId: THE_NEST_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: THE_NEST_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "tn-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "tn-apparel-cap",
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
      id: "tn-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on The Nest after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "4460 Pelicans Nest Drive",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "tn-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Pelicans Nest Rd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "4470 Pelicans Nest Drive",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "tn-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "5330 Pelicans Nest Blvd",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "tn-marketplace-junior-set",
      title: "Junior Golf Set",
      description: "Lightly used junior golf set for ages 8–12. Fresh grips and bag included.",
      price: 32,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "340 Pelicans Nest Rd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 4,
    },
    {
      id: "tn-marketplace-polo",
      title: "The Nest Golf Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "4460 Pelicans Nest Drive",
      imageUrl: "/brand/apparel/tn-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "tn-marketplace-callaway-junior",
      title: "Callaway Edge Junior Set",
      description: "Junior golf set — lightly used, great for range sessions.",
      price: 85,
      category: "Golf",
      seller: SOCIAL_NAME,
      unit: "4470 Pelicans Nest Drive",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-blog-five-courses",
      title: "Playing the Hatchery Course this season",
      excerpt:
        "Director of Golf Mike Torres shares tips for The Nest's 18 holes.",
      body: "The Nest members enjoy 18 holes — 18-hole Hatchery Course, Audubon championship golf within an preserve corridors. Book early mornings for the coolest conditions and ask the pro shop about member events.",
      author: "Mike Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "tn-blog-breezeway",
      title: "Veranda favorites after golf",
      excerpt:
        "Breakfast, lunch, and small plates from through early evening.",
      body: "After a morning round, Veranda is the easy stop for light plates and cold drinks. Main Dining Room picks up lunch daily — reserve through Dining in the member app.",
      author: "The Nest Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "tn-blog-golf-community",
      title: "18 holes, one thriving golf community",
      excerpt:
        "member twilight social days and beginner clinics on the driving range.",
      body: "With 18 holes across the Hatchery Course — Audubon championship golf — The Nest runs member events so everyone meets more members. Book a tee time in the app, arrive early for the driving range, and stay for Veranda afterward.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 5,
    },
    {
      id: "tn-blog-golf-tips",
      title: "Practice range & greens — warm-up tips",
      excerpt: "Get the most from The Nest's practice facilities before you tee off.",
      body: "Warm up on the driving range before the Hatchery Course rounds. Book lessons mid-morning when the greens are firmest. Jamie Chen runs junior clinics on weekends.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "tn-blog-lifestyle",
      title: "Pro Shop summer programming",
      excerpt:
        "Range clinics, lounge gatherings, and Pro Shop hours for the warm season.",
      body: "Warm up before tee times on the driving range, then recover at Veranda. Group clinics fill quickly — check the calendar. The Pro Shop opens early for apparel and equipment.",
      author: "Pro Shop Team",
      category: "Golf",
      daysAgo: 9,
    },
    {
      id: "tn-blog-welcome",
      title: "Welcome to The Nest Golf Club",
      excerpt:
        "Simple ways to settle in — golf, dining, and community groups.",
      body: "Start with a casual meal at Main Dining Room or Veranda, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes and real-estate questions.",
      author: "AJ Szymanski",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-blog-comment-golf-1",
      postId: "tn-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable — thanks for the tips, Mike!",
    },
    {
      id: "tn-blog-comment-golf-2",
      postId: "tn-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Hatchery Course was in perfect shape last weekend.",
    },
    {
      id: "tn-blog-comment-breezeway-1",
      postId: "tn-blog-breezeway",
      author: MEMBER_NAME,
      body: "Veranda after golf is our Saturday ritual now.",
    },
    {
      id: "tn-blog-comment-community-1",
      postId: "tn-blog-golf-community",
      author: SOCIAL_NAME,
      body: "member twilight social was packed but so welcoming. Counting me in next month.",
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
      id: "tn-newsletter-july-2026",
      title: "The Nest Golf Club Summer Update — July 2026",
      summary:
        "the Hatchery Course in peak condition, lounge socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at The Nest Golf Club. Our 18 holes — 18-hole Hatchery Course, Audubon championship golf after a preserve corridors — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Main Dining Room (lunch Tue–Sun) and Veranda (sunrise–sunset) — reserve in Dining",
        "• Clubhouse terrace social with live music",
        "• Member Twilight Social — book through the pro shop",
        "",
        "Questions: Membership · (239) 947-2282 · 4450 Pelicans Nest Drive, Bonita Springs, FL 34134 · membership@nestgolf.com · https://www.nestgolf.com/",
        "",
        "— AJ Szymanski",
        "General Manager",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "tn-newsletter-golf-roundup",
      title: "Golf Roundup — Hatchery Course",
      summary:
        "Course notes from Mike Torres, driving range clinics, and apparel.",
      body: [
        "Golf members,",
        "",
        "Golf: the Hatchery Course is playing firm and fast. Warm up on the driving range, then book lessons with Mike Torres or Jamie Chen.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app · (239) 947-2282.",
        "",
        "— Golf Shop",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "tn-newsletter-dining",
      title: "Dining at The Nest — Midsummer Menus",
      summary:
        "Main Dining Room/Lounge lunch daily — Formal Dining Room seasonal.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Main Dining Room (lunch Tue–Sun) and Veranda (sunrise–sunset). After golf, Veranda is the easy stop. Lunch reservations for Main Dining Room book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "— The Nest Dining",
        "dining@nestgolf.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "tn-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, The Nest Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest The Nest neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "The Nest does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at membership@nestgolf.com · (239) 947-2282 · 4450 Pelicans Nest Drive, Bonita Springs, FL 34134.",
        "",
        "Thank you for making The Nest Golf Club a vibrant member community.",
        "",
        "— Club Administration · AJ Szymanski, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-gallery-east-dusk",
      title: "Hatchery Course 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Mike Torres",
      daysAgo: 1,
    },
    {
      id: "tn-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "tn-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Jamie Chen",
      daysAgo: 3,
    },
    {
      id: "tn-gallery-west",
      title: "Hatchery Course fairways",
      category: "Golf",
      url: brandAssets.featuredGolf,
      uploadedBy: "Mike Torres",
      daysAgo: 4,
    },
    {
      id: "tn-gallery-lounge",
      title: "Veranda",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 5,
    },
    {
      id: "tn-gallery-proshop",
      title: "Pro Shop",
      category: "Golf",
      url: brandAssets.amenityClubhouse,
      uploadedBy: "Pro Shop Team",
      daysAgo: 6,
    },
    {
      id: "tn-gallery-dining",
      title: "Main Dining Room",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "The Nest Dining",
      daysAgo: 7,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
      id: "tn-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "4460 Pelicans Nest Drive, Bonita Springs, FL 34134",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "tn-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "5330 Pelicans Nest Blvd, Bonita Springs, FL 33324",
      type: "Investment property",
      owner: true,
    },
    {
      id: "tn-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "4470 Pelicans Nest Drive, Bonita Springs, FL 34134",
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
  const patriciaEmail = "membership@nestgolf.com";
  const listings = [
    {
      id: "tn-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "The Nest Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the Hatchery Course. Listed with Membership · membership@nestgolf.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 Pelicans Nest Rd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "tn-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Pelicans Nest Rd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to the Hatchery Course.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 Pelicans Nest Rd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "tn-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Pelicans Nest Blvd Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the the Hatchery Course. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "5330 Pelicans Nest Blvd",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.featuredDining],
      daysAgo: 6,
    },
    {
      id: "tn-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — The Nest Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Pro Shop. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "340 Pelicans Nest Rd",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.featuredGolf],
      daysAgo: 8,
    },
    {
      id: "tn-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Pro Shop Adjacent Condo",
      description:
        "Two-bedroom condo steps from the Pro Shop — lock-and-leave for snowbirds with full golf and dining access.",
      type: "sale",
      price: 695000,
      beds: 2,
      baths: 2,
      sqft: 1580,
      unit: "850 Neapolitan Way #1204",
      color: "from-amber-400 to-stone-700",
      images: [brandAssets.amenityEventSpace, brandAssets.amenityDrivingRange],
      daysAgo: 10,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.realEstateListing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: THE_NEST_COMMUNITY_ID,
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
