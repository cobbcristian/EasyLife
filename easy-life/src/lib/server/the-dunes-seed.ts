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
 * The Dunes Golf & Tennis Club — Sanibel, FL demo tenant.
 * 949 Sand Castle Rd, Sanibel, FL 33957 · (239) 472-3355
 * info@sanibeldunesresort.com · https://www.sanibeldunesresort.com/
 * Membership: Dana Swanson — dswanson@sanibeldunesresort.com
 * 18-hole championship golf (Audubon wildlife preserve), aqua driving range,
 * 6 Har-Tru tennis, 4 dedicated pickleball, pool & sundeck.
 * Dining: Clubhouse Restaurant/Lounge (lunch daily); Edgar's Steakhouse (seasonal); Bar.
 */
export const THE_DUNES_COMMUNITY_ID = "the-dunes";
const MEMBER_EMAIL = "member.demo@sanibeldunesresort.com";
const MEMBER_NAME = "Taylor Quinn";
const SOCIAL_EMAIL = "member.social@sanibeldunesresort.com";
const SOCIAL_NAME = "Morgan Ellis";
const PM_EMAIL = "pm.demo@sanibeldunesresort.com";
const PM_NAME = "Dana Swanson";
const BOARD_EMAIL = "board.demo@sanibeldunesresort.com";
const BOARD_NAME = "Chris Adler";
const CLUB_PHONE = "(239) 472-3355";
const PRO_SHOP_PHONE = "(239) 472-3355";
const DINING_EMAIL = "dining@sanibeldunesresort.com";
const MEMBERSHIP_EMAIL = "dswanson@sanibeldunesresort.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const clubhouseHours = defaultDailyHours("09:00", "21:00");
const proShopHours = defaultDailyHours("07:00", "18:00");
const racquetHours = defaultDailyHours("07:00", "20:00");
const poolHours = defaultDailyHours("08:00", "20:00");

/** Clubhouse Restaurant / Lounge — lunch daily. */
const grillHours: WeeklyHours = {
  mon: { open: "11:00", close: "15:00" },
  tue: { open: "11:00", close: "15:00" },
  wed: { open: "11:00", close: "15:00" },
  thu: { open: "11:00", close: "15:00" },
  fri: { open: "11:00", close: "15:00" },
  sat: { open: "11:00", close: "15:00" },
  sun: { open: "11:00", close: "15:00" },
};

/** Clubhouse Lounge / Bar — daytime through early evening. */
const loungeHours: WeeklyHours = {
  mon: { open: "11:00", close: "19:00" },
  tue: { open: "11:00", close: "19:00" },
  wed: { open: "11:00", close: "19:00" },
  thu: { open: "11:00", close: "19:00" },
  fri: { open: "11:00", close: "20:00" },
  sat: { open: "11:00", close: "20:00" },
  sun: { open: "11:00", close: "19:00" },
};

/** Edgar's Steakhouse — seasonal fine dining. */
const edgarsHours: WeeklyHours = {
  mon: null,
  tue: null,
  wed: { open: "17:00", close: "21:00" },
  thu: { open: "17:00", close: "21:00" },
  fri: { open: "17:00", close: "21:30" },
  sat: { open: "17:00", close: "21:30" },
  sun: { open: "17:00", close: "21:00" },
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
    id: "td-amenity-golf",
    name: "Championship Course",
    description:
      "18-hole championship course set in an Audubon wildlife preserve on Sanibel Island.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "td-amenity-range",
    name: "Aqua Driving Range",
    description:
      "Aqua driving range for warm-ups before championship course tee times.",
    kind: "driving_range",
    unitCount: 24,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "td-amenity-tennis",
    name: "Har-Tru Tennis Courts",
    description:
      "Six green-clay Har-Tru tennis courts with leagues, clinics, and private lessons.",
    kind: "court",
    unitCount: 6,
    holes: null,
    surface: "green_clay",
    hoursJson: racquetHours,
  },
  {
    id: "td-amenity-pickleball",
    name: "Pickleball Courts",
    description:
      "Four dedicated pickleball courts — open play, clinics, and social round-robins.",
    kind: "court",
    unitCount: 4,
    holes: null,
    surface: "hard_court",
    hoursJson: racquetHours,
  },
  {
    id: "td-amenity-pool",
    name: "Pool & Sundeck",
    description:
      "Resort-style pool and sundeck — swim, lounge, and island socials.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "td-amenity-dining-grill",
    name: "Clubhouse Restaurant",
    description: "Member dining for lunch daily — post-round favorites, salads, and island classics.",
    kind: "restaurant",
    unitCount: 16,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "td-amenity-dining-lounge",
    name: "Clubhouse Lounge & Bar",
    description:
      "Lounge and bar overlooking the course — lunch, small plates, and sunset drinks.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: loungeHours,
  },
  {
    id: "td-amenity-dining-edgars",
    name: "Edgar's Steakhouse",
    description:
      "Seasonal steakhouse dining — steaks, seafood, and special-occasion evenings (seasonal hours).",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: edgarsHours,
  },
  {
    id: "td-amenity-proshop",
    name: "Pro Shop",
    description: "Golf & racquet shop for tee times, court bookings, apparel, and equipment — (239) 472-3355.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: proShopHours,
  },
  {
    id: "td-amenity-clubhouse",
    name: "Clubhouse",
    description:
      "Main clubhouse serving championship golf, Har-Tru tennis, pickleball, Clubhouse Restaurant/Lounge, and Edgar's Steakhouse (seasonal).",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "td-staff-gm",
    name: "Dana Swanson",
    title: "General Manager",
    department: "Club Management",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "td-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "td-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "td-staff-michael",
    name: "Mike Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@sanibeldunesresort.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "td-staff-laura",
    name: "Jamie Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@sanibeldunesresort.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "td-staff-david",
    name: "Luis Ramirez",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@sanibeldunesresort.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "td-staff-tennis",
    name: "Riley Brooks",
    title: "Head Tennis Professional",
    department: "Tennis",
    email: "tennis@sanibeldunesresort.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 20,
  },
  {
    id: "td-staff-pickle",
    name: "Jordan Lee",
    title: "Pickleball Coordinator",
    department: "Racquet Sports",
    email: "pickleball@sanibeldunesresort.com",
    phone: CLUB_PHONE,
    category: "tennis_pro",
    sortOrder: 21,
  },
  {
    id: "td-staff-dining",
    name: "Dining Reservations",
    title: "Clubhouse Restaurant · Lounge · Edgar's (seasonal)",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "td-staff-realtor",
    name: "Dana Swanson",
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
    id: "td-pro-michael",
    name: "Mike Torres",
    email: "golf@sanibeldunesresort.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on the 18-hole Audubon championship course and aqua driving range.",
  },
  {
    id: "td-pro-laura",
    name: "Jamie Chen",
    email: "golf.assistant@sanibeldunesresort.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on 18 holes plus the aqua driving range.",
  },
  {
    id: "td-pro-riley",
    name: "Riley Brooks",
    email: "tennis@sanibeldunesresort.com",
    category: "tennis",
    description:
      "Head Tennis Professional. Private lessons and clinics on six Har-Tru green clay courts.",
  },
  {
    id: "td-pro-jordan",
    name: "Jordan Lee",
    email: "pickleball@sanibeldunesresort.com",
    category: "pickleball",
    description:
      "Pickleball Coordinator. Clinics and open-play sessions on four dedicated pickleball courts.",
  },
] as const;

/** Clubhouse Restaurant, Lounge/Bar, and seasonal Edgar's menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "td-menu-l-wrap", name: "Turkey Avocado Wrap", price: 14, category: "Clubhouse Lounge · Lunch" },
  { id: "td-menu-l-salad", name: "Clubhouse Cobb Salad", price: 15, category: "Clubhouse Lounge · Salads" },
  { id: "td-menu-l-shrimp", name: "Gulf Shrimp Small Plate", price: 16, category: "Clubhouse Lounge · Small Plates" },
  { id: "td-menu-l-ceviche", name: "Citrus Ceviche", price: 14, category: "Clubhouse Lounge · Small Plates" },
  { id: "td-menu-l-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Clubhouse Lounge · Beverages" },
  { id: "td-menu-l-margarita", name: "Sunset Margarita", price: 12, category: "Clubhouse Lounge · Bar" },
  { id: "td-menu-g-burger", name: "Dunes Burger", price: 17, category: "Clubhouse Restaurant · Favorites" },
  { id: "td-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "Clubhouse Restaurant · Favorites" },
  { id: "td-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "Clubhouse Restaurant · Salads" },
  { id: "td-menu-g-wings", name: "Club Wings", price: 15, category: "Clubhouse Restaurant · Starters" },
  { id: "td-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "Clubhouse Restaurant · Favorites" },
  { id: "td-menu-g-club", name: "Dunes Club Sandwich", price: 15, category: "Clubhouse Restaurant · Favorites" },
  { id: "td-menu-g-cake", name: "Key Lime Tart", price: 10, category: "Clubhouse Restaurant · Desserts" },
  { id: "td-menu-e-filet", name: "Filet Mignon", price: 48, category: "Edgar's Steakhouse · Steaks" },
  { id: "td-menu-e-ribeye", name: "Bone-In Ribeye", price: 52, category: "Edgar's Steakhouse · Steaks" },
  { id: "td-menu-e-salmon", name: "Gulf Salmon", price: 36, category: "Edgar's Steakhouse · Seafood" },
  { id: "td-menu-e-cake", name: "Chocolate Lava Cake", price: 12, category: "Edgar's Steakhouse · Desserts" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
        communityId: THE_DUNES_COMMUNITY_ID,
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
      pro.category === "pickleball"
        ? "Pickleball"
        : pro.category === "tennis"
          ? "Tennis"
          : "Golf";
    await prisma.provider.upsert({
      where: { id: pro.id },
      create: {
        id: pro.id,
        name: pro.name,
        email: pro.email,
        description: pro.description,
        communityId: THE_DUNES_COMMUNITY_ID,
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
    where: { id: "td-provider-dining" },
    create: {
      id: "td-provider-dining",
      communityId: THE_DUNES_COMMUNITY_ID,
      name: "The Dunes Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Clubhouse Restaurant/Lounge (lunch daily), Bar, and Edgar's Steakhouse (seasonal).",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "The Dunes Dining",
      rating: 4.9,
      description:
        "Clubhouse Restaurant/Lounge (lunch daily), Bar, and Edgar's Steakhouse (seasonal).",
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
    id: "td-vendor-lawn",
    name: "Sanibel Dunes Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@sanibeldunesresort.com",
    phone: "(239) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for The Dunes homes off Sand Castle Rd.",
  },
  {
    id: "td-vendor-pool",
    name: "Sanibel Island Home Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@sanibeldunesresort.com",
    phone: "(239) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for The Dunes estates.",
  },
  {
    id: "td-vendor-clean",
    name: "Sand Castle Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@sanibeldunesresort.com",
    phone: "(239) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in The Dunes Golf & Tennis Club.",
  },
  {
    id: "td-vendor-hvac",
    name: "Sanibel Dunes Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@sanibeldunesresort.com",
    phone: "(239) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "td-vendor-plumb",
    name: "Sanibel Dunes Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@sanibeldunesresort.com",
    phone: "(239) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for The Dunes members.",
  },
  {
    id: "td-vendor-windows",
    name: "Sanibel Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@sanibeldunesresort.com",
    phone: "(239) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "td-vendor-pest",
    name: "Sanibel Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@sanibeldunesresort.com",
    phone: "(239) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for The Dunes properties.",
  },
  {
    id: "td-vendor-handyman",
    name: "Sanibel Dunes Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@sanibeldunesresort.com",
    phone: "(239) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "td-vendor-paint",
    name: "Island Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@sanibeldunesresort.com",
    phone: "(239) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout The Dunes.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-event-ladies-golf",
      title: "Ladies Day — Championship Course",
      description: "Weekly Ladies Day shotgun on the Championship Course followed by lunch at Clubhouse Restaurant.",
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
      id: "td-event-mens-golf",
      title: "Men's Day — Championship Course",
      description: "Championship Course member competition — all golf members welcome.",
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
      id: "td-event-couples",
      title: "Couples Scramble & Clubhouse Lunch",
      description: "Nine-hole couples scramble on the Championship Course followed by lunch in Clubhouse Restaurant.",
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
      id: "td-event-range-clinic",
      title: "Aqua Driving Range Clinic",
      description: "Short-game clinic on the aqua driving range with Mike Torres — warm up before your next championship course round.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Aqua Driving Range",
      category: "golf",
      isPromoted: true,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "td-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering at Clubhouse Lounge with small plates and sunset views.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Clubhouse Lounge",
      category: "social",
      isPromoted: false,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "td-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in Clubhouse Restaurant.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Clubhouse Restaurant",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "td-event-tennis-mixer",
      title: "Har-Tru Tennis Mixer",
      description: "Social doubles mixer on six Har-Tru courts — all tennis members welcome.",
      date: easternDateOffset(8),
      time: "09:00",
      location: "Har-Tru Tennis Courts",
      category: "tennis",
      isPromoted: true,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: THE_DUNES_COMMUNITY_ID, createdBy: "The Dunes Golf & Tennis Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "td-booking-golf",
      amenityId: "td-amenity-golf",
      unitNumber: 1,
      amenity: "Championship Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "td-booking-tennis",
      amenityId: "td-amenity-tennis",
      unitNumber: 1,
      amenity: "Har-Tru Tennis Courts",
      date: easternDateOffset(1),
      startTime: "09:00",
      endTime: "10:30",
    },
    {
      id: "td-booking-pickle",
      amenityId: "td-amenity-pickleball",
      unitNumber: 1,
      amenity: "Pickleball Courts",
      date: easternDateOffset(2),
      startTime: "10:00",
      endTime: "11:00",
    },
    {
      id: "td-booking-range",
      amenityId: "td-amenity-range",
      unitNumber: 1,
      amenity: "Aqua Driving Range",
      date: easternDateOffset(3),
      startTime: "07:30",
      endTime: "08:30",
    },
  ] as const;

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        ...booking,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-announcement-golf",
      title: "Championship course in peak condition",
      body: "Both Audubon-certified courses are open set in an Audubon wildlife preserve. Book tee times through the pro shop at (239) 472-3355 — early mornings recommended.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "td-announcement-range",
      title: "Practice range & greens open daily",
      body: "Warm up on the aqua driving range before the championship course rounds. Lessons with Mike Torres and Jamie Chen book in the member app.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "td-announcement-dining",
      title: "Clubhouse Dining · Edgar's (seasonal)",
      body: "Clubhouse Restaurant and Lounge serve lunch daily. Edgar's Steakhouse is seasonal — check Dining for current hours. Bar open through early evening.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: THE_DUNES_COMMUNITY_ID },
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
      id: "td-document-club-guide",
      title: "The Dunes Golf & Tennis Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "td-document-dues",
      title: "Membership Fees — Golf & Social",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "td-document-golf-courses",
      title: "Golf Course Guide — 18 holes · Audubon",
      category: "golf",
      url: "#",
      uploadedBy: "Mike Torres · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "td-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "td-document-golf",
      title: "Pro Shop Guide — Apparel & Equipment",
      category: "golf",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 10,
    },
    {
      id: "td-document-dining",
      title: "Dining Hours — Clubhouse Restaurant · Clubhouse Lounge",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "td-document-lifestyle",
      title: "Pro Shop & Clubhouse Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 12,
    },
    {
      id: "td-document-naples",
      title: "Guest & Family Access Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "td-document-real-estate",
      title: "Featured Homes — The Dunes Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership · The Dunes Realty",
      daysAgo: 4,
    },
    {
      id: "td-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Chris Adler · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-group-golf",
      name: "Championship Golf",
      description:
        "18 holes — 18-hole championship course (Audubon championship golf). Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "td-group-ladies",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the Championship Course — Clubhouse Restaurant lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "td-group-mens",
      name: "Men's Day Golf",
      description: "Men's Day competitions rotating the championship course.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "td-group-dining",
      name: "Dining & Lounge",
      description: "Clubhouse Restaurant lunch daily and Clubhouse Lounge sunrise–sunset.",
      color: "from-amber-400 to-orange-700",
      members: 410,
    },
    {
      id: "td-group-social",
      name: "Member Socials",
      description: "Twilight gatherings, wine dinners, and clubhouse terrace evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "td-group-newcomers",
      name: "New Member Welcome",
      description: "Welcome notes, ride shares, and recommendations around Sand Castle Rd and the club.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: THE_DUNES_COMMUNITY_ID,
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
    "td-group-golf",
    "td-group-ladies",
    "td-group-dining",
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
    "td-group-social",
    "td-group-golf",
    "td-group-dining",
    "td-group-newcomers",
    "td-group-mens",
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
    { email: MEMBER_EMAIL, label: "Championship Course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Aqua Driving Range", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Har-Tru Tennis Courts", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Clubhouse Restaurant", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Clubhouse Lounge & Bar", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Edgar's Steakhouse", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Pickleball Courts", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Pool & Sundeck", href: "/member/bookings" },
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
  const michael = { email: "golf@sanibeldunesresort.com", name: "Mike Torres" };
  const laura = { email: "golf.assistant@sanibeldunesresort.com", name: "Jamie Chen" };
  const sophia = { email: "tennis@sanibeldunesresort.com", name: "Riley Brooks" };
  const megan = { email: "pickleball@sanibeldunesresort.com", name: "Jordan Lee" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: MEMBERSHIP_EMAIL, name: "Dana Swanson" };
  const frederick = { email: PM_EMAIL, name: "Dana Swanson" };
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
      id: "td-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Taylor — can we do a playing lesson Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on the the championship course — we'll focus on club selection and approach shots.",
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
      id: "td-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Taylor — the practice green is open Saturday at 10 for your the championship course. We'll work on your short-game touch.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: sophia,
          body: "Basket is ready at the range — just water and a visor. Booked 10:00–11:00.",
          hoursAgo: 24,
        },
      ],
    },
    {
      id: "td-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in Clubhouse Restaurant Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Clubhouse Restaurant. The snapper and filet are chef's highlights this week.",
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
      id: "td-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Taylor — saw you booked the championship course. Anything specific to focus on?",
          hoursAgo: 10,
        },
        {
          author: claire,
          body: "Mostly chip shots around the green — I keep leaving them short.",
          hoursAgo: 8,
        },
        {
          author: megan,
          body: "Classic. We'll drill chips on the practice green — you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
      id: "td-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Taylor — member social tonight at 5 if you're free. Loser buys Clubhouse Lounge smoothies?",
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
      id: "td-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold Clubhouse Lounge seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — Clubhouse Lounge table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "td-chat-claire-laura",
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
      id: "td-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Andrew — my guest pass for Saturday's tee time still shows pending. Can Membership confirm?",
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
      id: "td-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Taylor — 951 Sand Castle Rd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call The Dunes Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "td-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Taylor — any member comments for the July board packet? We're covering Pro Shop hours and dining expansions.",
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
      id: "td-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Taylor — board meeting next week covers pro shop hours and dining expansions. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Lounge gathering after morning rounds would be great — early appointment slots if possible.",
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
      id: "td-chat-golf-social",
      kind: "group",
      title: "Twilight Member Social",
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
          body: "Yes — see you at 4. Loser buys Clubhouse Lounge smoothies?",
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
        communityId: THE_DUNES_COMMUNITY_ID,
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

export async function ensureTheDunesDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: THE_DUNES_COMMUNITY_ID },
    create: {
      id: THE_DUNES_COMMUNITY_ID,
      name: "The Dunes Golf & Tennis Club",
      location: "Sanibel, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityTheDunes,
      primaryColor: "#1b4332",
      appDisplayName: "The Dunes",
      inviteCode: "the-dunes-demo",
    },
    update: {
      name: "The Dunes Golf & Tennis Club",
      location: "Sanibel, FL",
      logoUrl: brandAssets.communityTheDunes,
      primaryColor: "#1b4332",
      appDisplayName: "The Dunes",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-td-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-td-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-td-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-td-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: THE_DUNES_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: THE_DUNES_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "951 Sand Castle Rd",
      householdAddress: "951 Sand Castle Rd, Sanibel, FL 33957",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "953 Sand Castle Rd",
      householdAddress: "953 Sand Castle Rd, Sanibel, FL 33957",
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

  await ensureMembershipTiersSeeded(THE_DUNES_COMMUNITY_ID);
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
export async function ensureTheDunesDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureTheDunesDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureTheDunesDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureTheDunesDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureTheDunesDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureTheDunesDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureTheDunesDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "951 Sand Castle Rd",
      title: "Guest pass pending for Saturday Championship Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the Championship Course — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "951 Sand Castle Rd",
      title: "Irrigation overspray on Sand Castle driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 9200 Sand Castle soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "951 Sand Castle Rd",
      title: "Championship Course cart path near hole 7",
      category: "Amenities",
      description: "Cart path washout near Championship Course hole 7 — needs fill before weekend play.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "953 Sand Castle Rd",
      title: "Clubhouse terrace string lights out",
      category: "Maintenance",
      description: "Half the terrace string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "953 Sand Castle Rd",
      title: "Pro Shop bag storage locker stuck",
      category: "Amenities",
      description: "Locker 14 in the pro shop bag room will not open — key turns but latch sticks.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "951 Sand Castle Rd",
      title: "Championship Course range balls low mid-morning",
      category: "Amenities",
      description: "Practice range ball baskets were empty by 9:30 twice this week.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: THE_DUNES_COMMUNITY_ID,
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
        communityId: THE_DUNES_COMMUNITY_ID,
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
  const proShop = "The Dunes Pro Shop";
  const apparel = [
    {
      id: "td-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered The Dunes crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/td-apparel-polo-navy.png",
    },
    {
      id: "td-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for warm The Dunes rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/td-apparel-ladies-polo.png",
    },
    {
      id: "td-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool The Dunes mornings on the the championship course.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/td-apparel-quarter-zip.png",
    },
    {
      id: "td-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered The Dunes crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/td-apparel-cap-navy.png",
    },
    {
      id: "td-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for the championship course.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/td-apparel-visor-black.png",
    },
    {
      id: "td-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/td-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      communityId: THE_DUNES_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: THE_DUNES_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "td-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "td-apparel-cap",
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
      id: "td-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on The Dunes after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "951 Sand Castle Rd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "td-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Sand Castle Rd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "953 Sand Castle Rd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "td-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "5330 Sand Castle Blvd",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "td-marketplace-junior-set",
      title: "Junior Golf Set",
      description: "Lightly used junior golf set for ages 8–12. Fresh grips and bag included.",
      price: 32,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "340 Sand Castle Rd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 4,
    },
    {
      id: "td-marketplace-polo",
      title: "The Dunes Golf & Tennis Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "951 Sand Castle Rd",
      imageUrl: "/brand/apparel/td-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "td-marketplace-callaway-junior",
      title: "Callaway Edge Junior Set",
      description: "Junior golf set — lightly used, great for range sessions.",
      price: 85,
      category: "Golf",
      seller: SOCIAL_NAME,
      unit: "953 Sand Castle Rd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-blog-five-courses",
      title: "Playing the championship course this season",
      excerpt:
        "Director of Golf Mike Torres shares tips for The Dunes's 18 holes.",
      body: "The Dunes members enjoy 18 holes — 18-hole championship course, Audubon championship golf within an Audubon wildlife preserve. Book early mornings for the coolest conditions and ask the pro shop about member events.",
      author: "Mike Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "td-blog-breezeway",
      title: "Clubhouse Lounge favorites after golf",
      excerpt:
        "Breakfast, lunch, and small plates from through early evening.",
      body: "After a morning round, Clubhouse Lounge is the easy stop for light plates and cold drinks. Clubhouse Restaurant picks up lunch daily — reserve through Dining in the member app.",
      author: "The Dunes Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "td-blog-golf-community",
      title: "18 holes, one thriving golf community",
      excerpt:
        "Har-Tru tennis mixer days and beginner clinics on the aqua driving range.",
      body: "With 18 holes across the championship course — Audubon championship golf — The Dunes runs member events so everyone meets more members. Book a tee time in the app, arrive early for the aqua driving range, and stay for Clubhouse Lounge afterward.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 5,
    },
    {
      id: "td-blog-golf-tips",
      title: "Practice range & greens — warm-up tips",
      excerpt: "Get the most from The Dunes's practice facilities before you tee off.",
      body: "Warm up on the aqua driving range before the championship course rounds. Book lessons mid-morning when the greens are firmest. Jamie Chen runs junior clinics on weekends.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "td-blog-lifestyle",
      title: "Pro Shop summer programming",
      excerpt:
        "Range clinics, lounge gatherings, and Pro Shop hours for the warm season.",
      body: "Warm up before tee times on the aqua driving range, then recover at Clubhouse Lounge. Group clinics fill quickly — check the calendar. The Pro Shop opens early for apparel and equipment.",
      author: "Pro Shop Team",
      category: "Golf",
      daysAgo: 9,
    },
    {
      id: "td-blog-welcome",
      title: "Welcome to The Dunes Golf & Tennis Club",
      excerpt:
        "Simple ways to settle in — golf, dining, and community groups.",
      body: "Start with a casual meal at Clubhouse Restaurant or Clubhouse Lounge, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes and real-estate questions.",
      author: "Dana Swanson",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-blog-comment-golf-1",
      postId: "td-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable — thanks for the tips, Mike!",
    },
    {
      id: "td-blog-comment-golf-2",
      postId: "td-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Championship Course was in perfect shape last weekend.",
    },
    {
      id: "td-blog-comment-breezeway-1",
      postId: "td-blog-breezeway",
      author: MEMBER_NAME,
      body: "Clubhouse Lounge after golf is our Saturday ritual now.",
    },
    {
      id: "td-blog-comment-community-1",
      postId: "td-blog-golf-community",
      author: SOCIAL_NAME,
      body: "Har-Tru tennis mixer was packed but so welcoming. Counting me in next month.",
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
      id: "td-newsletter-july-2026",
      title: "The Dunes Golf & Tennis Club Summer Update — July 2026",
      summary:
        "the championship course in peak condition, lounge socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at The Dunes Golf & Tennis Club. Our 18 holes — 18-hole championship course, Audubon championship golf after a Audubon wildlife preserve — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• Clubhouse Restaurant (lunch Tue–Sun) and Clubhouse Lounge (sunrise–sunset) — reserve in Dining",
        "• Clubhouse terrace social with live music",
        "• Har-Tru Tennis Mixer — book through the pro shop",
        "",
        "Questions: Membership · (239) 472-3355 · 949 Sand Castle Rd, Sanibel, FL 33957 · dswanson@sanibeldunesresort.com · https://www.sanibeldunesresort.com/",
        "",
        "— Dana Swanson",
        "General Manager",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "td-newsletter-golf-roundup",
      title: "Golf Roundup — Championship Course",
      summary:
        "Course notes from Mike Torres, aqua driving range clinics, and apparel.",
      body: [
        "Golf members,",
        "",
        "Golf: the championship course is playing firm and fast. Warm up on the aqua driving range, then book lessons with Mike Torres or Jamie Chen.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app · (239) 472-3355.",
        "",
        "— Golf Shop",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "td-newsletter-dining",
      title: "Dining at The Dunes — Midsummer Menus",
      summary:
        "Clubhouse Restaurant/Lounge lunch daily — Edgar's Steakhouse seasonal.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Clubhouse Restaurant (lunch Tue–Sun) and Clubhouse Lounge (sunrise–sunset). After golf, Clubhouse Lounge is the easy stop. Lunch reservations for Clubhouse Restaurant book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "— The Dunes Dining",
        "dining@sanibeldunesresort.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "td-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, The Dunes Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest The Dunes neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "The Dunes does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at dswanson@sanibeldunesresort.com · (239) 472-3355 · 949 Sand Castle Rd, Sanibel, FL 33957.",
        "",
        "Thank you for making The Dunes Golf & Tennis Club a vibrant member community.",
        "",
        "— Club Administration · Dana Swanson, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-gallery-east-dusk",
      title: "Championship Course 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Mike Torres",
      daysAgo: 1,
    },
    {
      id: "td-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "td-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Jamie Chen",
      daysAgo: 3,
    },
    {
      id: "td-gallery-west",
      title: "Championship Course fairways",
      category: "Golf",
      url: brandAssets.featuredGolf,
      uploadedBy: "Mike Torres",
      daysAgo: 4,
    },
    {
      id: "td-gallery-lounge",
      title: "Clubhouse Lounge",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 5,
    },
    {
      id: "td-gallery-proshop",
      title: "Pro Shop",
      category: "Golf",
      url: brandAssets.amenityClubhouse,
      uploadedBy: "Pro Shop Team",
      daysAgo: 6,
    },
    {
      id: "td-gallery-dining",
      title: "Clubhouse Restaurant",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "The Dunes Dining",
      daysAgo: 7,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: THE_DUNES_COMMUNITY_ID,
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
      id: "td-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "951 Sand Castle Rd, Sanibel, FL 33957",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "td-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "5330 Sand Castle Blvd, Sanibel, FL 33324",
      type: "Investment property",
      owner: true,
    },
    {
      id: "td-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "953 Sand Castle Rd, Sanibel, FL 33957",
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
  const patriciaEmail = "dswanson@sanibeldunesresort.com";
  const listings = [
    {
      id: "td-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "The Dunes Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the Championship Course. Listed with Membership · dswanson@sanibeldunesresort.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 Sand Castle Rd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "td-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Sand Castle Rd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to the championship course.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 Sand Castle Rd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "td-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Sand Castle Blvd Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the the championship course. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "5330 Sand Castle Blvd",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.featuredDining],
      daysAgo: 6,
    },
    {
      id: "td-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — The Dunes Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Pro Shop. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "340 Sand Castle Rd",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.featuredGolf],
      daysAgo: 8,
    },
    {
      id: "td-real-estate-naples",
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
        communityId: THE_DUNES_COMMUNITY_ID,
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
