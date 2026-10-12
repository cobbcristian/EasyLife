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
 * Jacaranda Golf Club — Plantation, FL demo tenant.
 * 9200 W. Broward Blvd, Plantation, FL 33324
 * Pro shop (954) 472-5836 · Admin (954) 472-5855
 * https://jacarandagolfclub.com/
 * 36 holes — East Course + West Course (both Golf Digest 4-star; recent $10M renovation),
 * practice range + practice greens.
 * Dining: The Grille Room (lunch Tue–Sun), The 19th Hole Lounge (sunrise–sunset).
 */
export const JACARANDA_COMMUNITY_ID = "jacaranda";
const MEMBER_EMAIL = "member.demo@jacarandagolfclub.com";
const MEMBER_NAME = "Alex Rivera";
const SOCIAL_EMAIL = "member.social@jacarandagolfclub.com";
const SOCIAL_NAME = "Sam Ortiz";
const PM_EMAIL = "pm.demo@jacarandagolfclub.com";
const PM_NAME = "Andrew Michael";
const BOARD_EMAIL = "board.demo@jacarandagolfclub.com";
const BOARD_NAME = "Kathy Gazda";
const CLUB_PHONE = "(954) 472-5855";
const PRO_SHOP_PHONE = "(954) 472-5836";
const DINING_EMAIL = "dining@jacarandagolfclub.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const clubhouseHours = defaultDailyHours("09:00", "21:00");
const proShopHours = defaultDailyHours("07:00", "18:00");

/** The Grille Room — lunch Tue–Sun. */
const grillHours: WeeklyHours = {
  mon: null,
  tue: { open: "11:00", close: "15:00" },
  wed: { open: "11:00", close: "15:00" },
  thu: { open: "11:00", close: "15:00" },
  fri: { open: "11:00", close: "15:00" },
  sat: { open: "11:00", close: "15:00" },
  sun: { open: "11:00", close: "15:00" },
};

/** The 19th Hole Lounge — sunrise to sunset, breakfast/lunch/small plates. */
const loungeHours: WeeklyHours = {
  mon: { open: "06:30", close: "19:00" },
  tue: { open: "06:30", close: "19:00" },
  wed: { open: "06:30", close: "19:00" },
  thu: { open: "06:30", close: "19:00" },
  fri: { open: "06:30", close: "19:30" },
  sat: { open: "06:30", close: "19:30" },
  sun: { open: "06:30", close: "19:00" },
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
    id: "jc-amenity-golf-east",
    name: "East Course",
    description:
      "18-hole East Course — Golf Digest 4-star. Part of Jacaranda's 36-hole layout after a recent $10M renovation.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "jc-amenity-golf-west",
    name: "West Course",
    description:
      "18-hole West Course — Golf Digest 4-star. Completes Jacaranda's 36 holes with practice range and greens nearby.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "jc-amenity-range",
    name: "Practice Range & Practice Greens",
    description:
      "Full driving range plus practice greens for warm-ups before East or West Course tee times.",
    kind: "driving_range",
    unitCount: 24,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "jc-amenity-dining-grill",
    name: "The Grille Room",
    description: "Member dining for lunch Tuesday through Sunday — post-round favorites and salads.",
    kind: "restaurant",
    unitCount: 16,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "jc-amenity-dining-lounge",
    name: "The 19th Hole Lounge",
    description:
      "Sunrise-to-sunset lounge — breakfast, lunch, and small plates overlooking the golf lifestyle.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: loungeHours,
  },
  {
    id: "jc-amenity-proshop",
    name: "Pro Shop",
    description: "Golf shop for tee times, apparel, and equipment — (954) 472-5836.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: proShopHours,
  },
  {
    id: "jc-amenity-clubhouse",
    name: "Clubhouse",
    description: "Main clubhouse serving East & West Courses, The Grille Room, The 19th Hole Lounge, and member events.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "jc-staff-gm",
    name: "Andrew Michael",
    title: "General Manager",
    department: "Club Management",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "jc-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "jc-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "jc-staff-michael",
    name: "Mike Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@jacarandagolfclub.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "jc-staff-laura",
    name: "Jamie Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@jacarandagolfclub.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "jc-staff-david",
    name: "Luis Ramirez",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@jacarandagolfclub.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "jc-staff-dining",
    name: "Dining Reservations",
    title: "The Grille Room · The 19th Hole Lounge",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "jc-staff-realtor",
    name: "Membership",
    title: "Membership · Real Estate Inquiries",
    department: "Membership",
    email: "membership@jacarandagolfclub.com",
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros — category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "jc-pro-michael",
    name: "Mike Torres",
    email: "golf@jacarandagolfclub.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on East & West Courses — both Golf Digest 4-star after Jacaranda's $10M renovation.",
  },
  {
    id: "jc-pro-laura",
    name: "Jamie Chen",
    email: "golf.assistant@jacarandagolfclub.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on 36 holes plus the practice range and greens.",
  },
] as const;

/** The Grille Room and The 19th Hole Lounge menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "jc-menu-l-eggs", name: "Sunrise Breakfast Plate", price: 14, category: "The 19th Hole Lounge · Breakfast" },
  { id: "jc-menu-l-bagel", name: "Smoked Salmon Bagel", price: 13, category: "The 19th Hole Lounge · Breakfast" },
  { id: "jc-menu-l-wrap", name: "Turkey Avocado Wrap", price: 14, category: "The 19th Hole Lounge · Lunch" },
  { id: "jc-menu-l-salad", name: "19th Hole Cobb Salad", price: 15, category: "The 19th Hole Lounge · Salads" },
  { id: "jc-menu-l-shrimp", name: "Gulf Shrimp Small Plate", price: 16, category: "The 19th Hole Lounge · Small Plates" },
  { id: "jc-menu-l-ceviche", name: "Citrus Ceviche", price: 14, category: "The 19th Hole Lounge · Small Plates" },
  { id: "jc-menu-l-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "The 19th Hole Lounge · Beverages" },
  { id: "jc-menu-l-margarita", name: "Sunset Margarita", price: 12, category: "The 19th Hole Lounge · Bar" },
  { id: "jc-menu-g-burger", name: "Jacaranda Burger", price: 17, category: "The Grille Room · Favorites" },
  { id: "jc-menu-g-fish", name: "Gulf Grouper Sandwich", price: 19, category: "The Grille Room · Favorites" },
  { id: "jc-menu-g-caesar", name: "Classic Caesar Salad", price: 13, category: "The Grille Room · Salads" },
  { id: "jc-menu-g-wings", name: "Club Wings", price: 15, category: "The Grille Room · Starters" },
  { id: "jc-menu-g-flatbread", name: "Margherita Flatbread", price: 14, category: "The Grille Room · Favorites" },
  { id: "jc-menu-g-club", name: "Jacaranda Club Sandwich", price: 15, category: "The Grille Room · Favorites" },
  { id: "jc-menu-g-cake", name: "Key Lime Tart", price: 10, category: "The Grille Room · Desserts" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
        communityId: JACARANDA_COMMUNITY_ID,
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
        communityId: JACARANDA_COMMUNITY_ID,
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
    where: { id: "jc-provider-dining" },
    create: {
      id: "jc-provider-dining",
      communityId: JACARANDA_COMMUNITY_ID,
      name: "Jacaranda Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "The Grille Room (lunch Tue–Sun) and The 19th Hole Lounge (sunrise–sunset).",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Jacaranda Dining",
      rating: 4.9,
      description:
        "The Grille Room (lunch Tue–Sun) and The 19th Hole Lounge (sunrise–sunset).",
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
    id: "jc-vendor-lawn",
    name: "Jacaranda Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@jacarandagolfclub.com",
    phone: "(954) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Jacaranda homes off W. Broward Blvd.",
  },
  {
    id: "jc-vendor-pool",
    name: "Plantation Home Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@jacarandagolfclub.com",
    phone: "(954) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for Jacaranda estates.",
  },
  {
    id: "jc-vendor-clean",
    name: "Broward Blvd Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@jacarandagolfclub.com",
    phone: "(954) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in Jacaranda Golf Club.",
  },
  {
    id: "jc-vendor-hvac",
    name: "Jacaranda Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@jacarandagolfclub.com",
    phone: "(954) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "jc-vendor-plumb",
    name: "Jacaranda Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@jacarandagolfclub.com",
    phone: "(954) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Jacaranda members.",
  },
  {
    id: "jc-vendor-windows",
    name: "Plantation Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@jacarandagolfclub.com",
    phone: "(954) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "jc-vendor-pest",
    name: "Bonita Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@jacarandagolfclub.com",
    phone: "(954) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Jacaranda properties.",
  },
  {
    id: "jc-vendor-handyman",
    name: "Jacaranda Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@jacarandagolfclub.com",
    phone: "(954) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "jc-vendor-paint",
    name: "Canopy Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@jacarandagolfclub.com",
    phone: "(954) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Jacaranda.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-event-ladies-golf",
      title: "Ladies Day — East Course",
      description: "Weekly Ladies Day shotgun on the East Course followed by lunch at The Grille Room.",
      date: easternDateOffset(2),
      time: "08:30",
      location: "East Course",
      category: "golf",
      isPromoted: true,
      capacity: 72,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "jc-event-mens-golf",
      title: "Men's Day — West Course",
      description: "West Course member competition — all golf members welcome.",
      date: easternDateOffset(3),
      time: "08:00",
      location: "West Course",
      category: "golf",
      isPromoted: true,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "jc-event-couples",
      title: "Couples Scramble & Grille Lunch",
      description: "Nine-hole couples scramble on the East Course followed by lunch in The Grille Room.",
      date: easternDateOffset(5),
      time: "15:30",
      location: "East Course",
      category: "golf",
      isPromoted: true,
      capacity: 56,
      requirePayment: true,
      feeCents: 8500,
    },
    {
      id: "jc-event-range-clinic",
      title: "Practice Range Clinic",
      description: "Short-game clinic on the practice greens with Mike Torres — warm up before your next East or West round.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Practice Range & Practice Greens",
      category: "golf",
      isPromoted: true,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "jc-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering at The 19th Hole Lounge with small plates and sunset views.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "The 19th Hole Lounge",
      category: "social",
      isPromoted: false,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "jc-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in The Grille Room.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "The Grille Room",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "jc-event-east-west",
      title: "East vs West Challenge",
      description: "Member teams compete East Course vs West Course — both Golf Digest 4-star layouts after the $10M renovation.",
      date: easternDateOffset(8),
      time: "08:00",
      location: "East & West Courses",
      category: "golf",
      isPromoted: true,
      capacity: 64,
      requirePayment: false,
      feeCents: 0,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: JACARANDA_COMMUNITY_ID, createdBy: "Jacaranda Golf Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "jc-booking-golf-east",
      amenityId: "jc-amenity-golf-east",
      unitNumber: 1,
      amenity: "East Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "jc-booking-golf-west",
      amenityId: "jc-amenity-golf-west",
      unitNumber: 1,
      amenity: "West Course",
      date: easternDateOffset(1),
      startTime: "09:00",
      endTime: "13:00",
    },
    {
      id: "jc-booking-range",
      amenityId: "jc-amenity-range",
      unitNumber: 1,
      amenity: "Practice Range & Practice Greens",
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
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-announcement-golf",
      title: "36 holes — East & West in peak condition",
      body: "Both Golf Digest 4-star courses are open after Jacaranda's $10M renovation. Book tee times through the pro shop at (954) 472-5836 — early mornings recommended.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "jc-announcement-range",
      title: "Practice range & greens open daily",
      body: "Warm up on the practice range and greens before East or West Course rounds. Lessons with Mike Torres and Jamie Chen book in the member app.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "jc-announcement-dining",
      title: "The Grille Room & The 19th Hole Lounge",
      body: "The Grille Room serves lunch Tuesday–Sunday. The 19th Hole Lounge is open sunrise to sunset for breakfast, lunch, and small plates.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: JACARANDA_COMMUNITY_ID },
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
      id: "jc-document-club-guide",
      title: "Jacaranda Golf Club — Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "jc-document-dues",
      title: "Membership Fees — Golf & Social",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "jc-document-golf-courses",
      title: "Golf Course Guide — East & West / 36 holes",
      category: "golf",
      url: "#",
      uploadedBy: "Mike Torres · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "jc-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "jc-document-golf",
      title: "Pro Shop Guide — Apparel & Equipment",
      category: "golf",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 10,
    },
    {
      id: "jc-document-dining",
      title: "Dining Hours — The Grille Room · The 19th Hole Lounge",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "jc-document-lifestyle",
      title: "Pro Shop & Clubhouse Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 12,
    },
    {
      id: "jc-document-naples",
      title: "Guest & Family Access Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "jc-document-real-estate",
      title: "Featured Homes — Jacaranda Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership · Jacaranda Realty",
      daysAgo: 4,
    },
    {
      id: "jc-document-governance",
      title: "Board of Governors — Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Kathy Gazda · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-group-golf",
      name: "East & West Golf",
      description:
        "36 holes — East Course + West Course (both Golf Digest 4-star). Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "jc-group-ladies",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the East Course — The Grille Room lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "jc-group-mens",
      name: "Men's Day Golf",
      description: "Men's Day competitions rotating East and West Courses.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "jc-group-dining",
      name: "Dining & Lounge",
      description: "The Grille Room lunch Tue–Sun and The 19th Hole Lounge sunrise–sunset.",
      color: "from-amber-400 to-orange-700",
      members: 410,
    },
    {
      id: "jc-group-social",
      name: "Member Socials",
      description: "Twilight gatherings, wine dinners, and clubhouse terrace evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "jc-group-newcomers",
      name: "New Member Welcome",
      description: "Welcome notes, ride shares, and recommendations around W. Broward Blvd and the club.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: JACARANDA_COMMUNITY_ID,
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
    "jc-group-golf",
    "jc-group-ladies",
    "jc-group-dining",
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
    "jc-group-social",
    "jc-group-golf",
    "jc-group-dining",
    "jc-group-newcomers",
    "jc-group-mens",
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
    { email: MEMBER_EMAIL, label: "East Course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "West Course tee times", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Practice range", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "The Grille Room", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "The 19th Hole Lounge", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "East Course tee times", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Member events", href: "/member/events" },
    { email: SOCIAL_EMAIL, label: "Pro Shop apparel", href: "/member/apparel" },
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
  const michael = { email: "golf@jacarandagolfclub.com", name: "Mike Torres" };
  const laura = { email: "golf.assistant@jacarandagolfclub.com", name: "Jamie Chen" };
  const sophia = { email: "golf.assistant@jacarandagolfclub.com", name: "Jamie Chen" };
  const megan = { email: "golf.assistant@jacarandagolfclub.com", name: "Jamie Chen" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: "membership@jacarandagolfclub.com", name: "Membership" };
  const frederick = { email: PM_EMAIL, name: "Andrew Michael" };
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
      id: "jc-chat-claire-michael",
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
          body: "Absolutely. 9:00 tee time on the East & West Courses — we'll focus on club selection and approach shots.",
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
      id: "jc-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Alex — the practice green is open Saturday at 10 for your East & West Courses. We'll work on your short-game touch.",
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
      id: "jc-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi — table for two in The Grille Room Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in The Grille Room. The snapper and filet are chef's highlights this week.",
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
      id: "jc-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Alex — saw you booked East & West Courses. Anything specific to focus on?",
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
      id: "jc-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Alex — member social tonight at 5 if you're free. Loser buys The 19th Hole Lounge smoothies?",
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
      id: "jc-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold The 19th Hole Lounge seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely — The 19th Hole Lounge table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "jc-chat-claire-laura",
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
      id: "jc-chat-claire-elena",
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
      id: "jc-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Alex — 9210 W. Broward Blvd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please — neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Jacaranda Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "jc-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Alex — any member comments for the July board packet? We're covering Pro Shop hours and dining expansions.",
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
      id: "jc-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Alex — board meeting next week covers pro shop hours and dining expansions. Any feedback from golf members?",
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
      id: "jc-chat-golf-social",
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
          body: "Yes — see you at 4. Loser buys The 19th Hole Lounge smoothies?",
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
        communityId: JACARANDA_COMMUNITY_ID,
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

export async function ensureJacarandaDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: JACARANDA_COMMUNITY_ID },
    create: {
      id: JACARANDA_COMMUNITY_ID,
      name: "Jacaranda Golf Club",
      location: "Plantation, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityJacaranda,
      primaryColor: "#1b4332",
      appDisplayName: "Jacaranda",
      inviteCode: "jacaranda-demo",
    },
    update: {
      name: "Jacaranda Golf Club",
      location: "Plantation, FL",
      logoUrl: brandAssets.communityJacaranda,
      primaryColor: "#1b4332",
      appDisplayName: "Jacaranda",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-jc-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-jc-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-jc-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-jc-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: JACARANDA_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: JACARANDA_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "9210 W. Broward Blvd",
      householdAddress: "9210 W. Broward Blvd, Plantation, FL 33324",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "9220 W. Broward Blvd",
      householdAddress: "9220 W. Broward Blvd, Plantation, FL 33324",
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

  await ensureMembershipTiersSeeded(JACARANDA_COMMUNITY_ID);
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
export async function ensureJacarandaDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureJacarandaDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureJacarandaDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureJacarandaDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureJacarandaDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureJacarandaDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureJacarandaDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "9210 W. Broward Blvd",
      title: "Guest pass pending for Saturday East Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the East Course — guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "9210 W. Broward Blvd",
      title: "Irrigation overspray on Broward driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 9200 W. Broward soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "9210 W. Broward Blvd",
      title: "East Course cart path near hole 7",
      category: "Amenities",
      description: "Cart path washout near East Course hole 7 — needs fill before weekend play.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "9220 W. Broward Blvd",
      title: "Clubhouse terrace string lights out",
      category: "Maintenance",
      description: "Half the terrace string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "9220 W. Broward Blvd",
      title: "Pro Shop bag storage locker stuck",
      category: "Amenities",
      description: "Locker 14 in the pro shop bag room will not open — key turns but latch sticks.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "9210 W. Broward Blvd",
      title: "West Course range balls low mid-morning",
      category: "Amenities",
      description: "Practice range ball baskets were empty by 9:30 twice this week.",
      status: "open",
      daysAgo: 3,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: JACARANDA_COMMUNITY_ID,
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
        communityId: JACARANDA_COMMUNITY_ID,
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
  const proShop = "Jacaranda Pro Shop";
  const apparel = [
    {
      id: "jc-apparel-polo-navy",
      name: "Club Polo — Navy",
      description: "Performance pique polo with embroidered Jacaranda crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/jc-apparel-polo-navy.png",
    },
    {
      id: "jc-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo — White",
      description: "Moisture-wicking sleeveless polo with club crest — ideal for warm Jacaranda rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/jc-apparel-ladies-polo.png",
    },
    {
      id: "jc-apparel-quarter-zip",
      name: "Member Quarter-Zip — Heather Grey",
      description: "Lightweight layer for cool Jacaranda mornings on the East & West Courses.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/jc-apparel-quarter-zip.png",
    },
    {
      id: "jc-apparel-cap",
      name: "Performance Cap — Navy",
      description: "Structured adjustable cap with embroidered Jacaranda crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/jc-apparel-cap-navy.png",
    },
    {
      id: "jc-apparel-visor",
      name: "Tour Visor — Black",
      description: "Lightweight tour visor for East & West Courses.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/jc-apparel-visor-black.png",
    },
    {
      id: "jc-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/jc-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      communityId: JACARANDA_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo — championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: JACARANDA_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "jc-apparel-polo-navy",
            name: "Club Polo — Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "jc-apparel-cap",
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
      id: "jc-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen — switching to Left Dash. Pickup on Jacaranda after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "9210 W. Broward Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "jc-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on W. Broward Blvd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "9220 W. Broward Blvd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "jc-marketplace-peloton",
      title: "Peloton Bike — Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "5330 Broward Blvd",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "jc-marketplace-junior-set",
      title: "Junior Golf Set",
      description: "Lightly used junior golf set for ages 8–12. Fresh grips and bag included.",
      price: 32,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "340 W. Broward Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 4,
    },
    {
      id: "jc-marketplace-polo",
      title: "Jacaranda Golf Club Polo — Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "9210 W. Broward Blvd",
      imageUrl: "/brand/apparel/jc-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "jc-marketplace-callaway-junior",
      title: "Callaway Edge Junior Set",
      description: "Junior golf set — lightly used, great for range sessions.",
      price: 85,
      category: "Golf",
      seller: SOCIAL_NAME,
      unit: "9220 W. Broward Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-blog-five-courses",
      title: "Playing East & West this season",
      excerpt:
        "Director of Golf Mike Torres shares tips for Jacaranda's 36 holes.",
      body: "Jacaranda members enjoy 36 holes — East Course + West Course, both Golf Digest 4-star after a recent $10M renovation. Book early mornings for the coolest conditions and ask the pro shop about member events.",
      author: "Mike Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "jc-blog-breezeway",
      title: "The 19th Hole Lounge favorites after golf",
      excerpt:
        "Breakfast, lunch, and small plates from sunrise to sunset.",
      body: "After a morning round, The 19th Hole Lounge is the easy stop for light plates and cold drinks. The Grille Room picks up lunch Tuesday through Sunday — reserve through Dining in the member app.",
      author: "Jacaranda Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "jc-blog-golf-community",
      title: "36 holes, one thriving golf community",
      excerpt:
        "East vs West challenge days and beginner clinics on the practice greens.",
      body: "With 36 holes across East and West Courses — both Golf Digest 4-star — Jacaranda runs member events so everyone meets more members. Book a tee time in the app, arrive early for the practice range, and stay for The 19th Hole Lounge afterward.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 5,
    },
    {
      id: "jc-blog-golf-tips",
      title: "Practice range & greens — warm-up tips",
      excerpt: "Get the most from Jacaranda's practice facilities before you tee off.",
      body: "Warm up on the practice range and greens before East or West Course rounds. Book lessons mid-morning when the greens are firmest. Jamie Chen runs junior clinics on weekends.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "jc-blog-lifestyle",
      title: "Pro Shop summer programming",
      excerpt:
        "Range clinics, lounge gatherings, and Pro Shop hours for the warm season.",
      body: "Warm up before tee times on the practice range, then recover at The 19th Hole Lounge. Group clinics fill quickly — check the calendar. The Pro Shop opens early for apparel and equipment.",
      author: "Pro Shop Team",
      category: "Golf",
      daysAgo: 9,
    },
    {
      id: "jc-blog-welcome",
      title: "Welcome to Jacaranda Golf Club",
      excerpt:
        "Simple ways to settle in — golf, dining, and community groups.",
      body: "Start with a casual meal at The Grille Room or The 19th Hole Lounge, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes and real-estate questions.",
      author: "Andrew Michael",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-blog-comment-golf-1",
      postId: "jc-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable — thanks for the tips, Mike!",
    },
    {
      id: "jc-blog-comment-golf-2",
      postId: "jc-blog-five-courses",
      author: SOCIAL_NAME,
      body: "East Course was in perfect shape last weekend.",
    },
    {
      id: "jc-blog-comment-breezeway-1",
      postId: "jc-blog-breezeway",
      author: MEMBER_NAME,
      body: "The 19th Hole Lounge after golf is our Saturday ritual now.",
    },
    {
      id: "jc-blog-comment-community-1",
      postId: "jc-blog-golf-community",
      author: SOCIAL_NAME,
      body: "East vs West challenge was packed but so welcoming. Counting me in next month.",
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
      id: "jc-newsletter-july-2026",
      title: "Jacaranda Golf Club Summer Update — July 2026",
      summary:
        "East & West Courses in peak condition, lounge socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Jacaranda Golf Club. Our 36 holes — East Course + West Course, both Golf Digest 4-star after a $10M renovation — are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "• The Grille Room (lunch Tue–Sun) and The 19th Hole Lounge (sunrise–sunset) — reserve in Dining",
        "• Clubhouse terrace social with live music",
        "• East vs West Challenge — book through the pro shop",
        "",
        "Questions: Membership · (954) 472-5855 · 9200 W. Broward Blvd, Plantation, FL 33324 · membership@jacarandagolfclub.com · https://jacarandagolfclub.com/",
        "",
        "— Andrew Michael",
        "General Manager",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "jc-newsletter-golf-roundup",
      title: "Golf Roundup — East & West",
      summary:
        "Course notes from Mike Torres, practice range clinics, and apparel.",
      body: [
        "Golf members,",
        "",
        "Golf: East & West are playing firm and fast. Warm up on the practice range, then book lessons with Mike Torres or Jamie Chen.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked — order through Club Apparel in the app · (954) 472-5836.",
        "",
        "— Golf Shop",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "jc-newsletter-dining",
      title: "Dining at Jacaranda — Midsummer Menus",
      summary:
        "The Grille Room lunches and The 19th Hole Lounge from sunrise to sunset.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across The Grille Room (lunch Tue–Sun) and The 19th Hole Lounge (sunrise–sunset). After golf, The 19th Hole Lounge is the easy stop. Lunch reservations for The Grille Room book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club — we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "— Jacaranda Dining",
        "dining@jacarandagolfclub.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "jc-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Jacaranda Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Jacaranda neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "Jacaranda does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at membership@jacarandagolfclub.com · (954) 472-5855 · 9200 W. Broward Blvd, Plantation, FL 33324.",
        "",
        "Thank you for making Jacaranda Golf Club a vibrant member community.",
        "",
        "— Club Administration · Andrew Michael, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-gallery-east-dusk",
      title: "East Course 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Mike Torres",
      daysAgo: 1,
    },
    {
      id: "jc-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "jc-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Jamie Chen",
      daysAgo: 3,
    },
    {
      id: "jc-gallery-west",
      title: "West Course fairways",
      category: "Golf",
      url: brandAssets.featuredGolf,
      uploadedBy: "Mike Torres",
      daysAgo: 4,
    },
    {
      id: "jc-gallery-lounge",
      title: "The 19th Hole Lounge",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 5,
    },
    {
      id: "jc-gallery-proshop",
      title: "Pro Shop",
      category: "Golf",
      url: brandAssets.amenityClubhouse,
      uploadedBy: "Pro Shop Team",
      daysAgo: 6,
    },
    {
      id: "jc-gallery-dining",
      title: "The Grille Room",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Jacaranda Dining",
      daysAgo: 7,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: JACARANDA_COMMUNITY_ID,
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
      id: "jc-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "9210 W. Broward Blvd, Plantation, FL 33324",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "jc-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "5330 Broward Blvd, Plantation, FL 33324",
      type: "Investment property",
      owner: true,
    },
    {
      id: "jc-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "9220 W. Broward Blvd, Plantation, FL 33324",
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
  const patriciaEmail = "membership@jacarandagolfclub.com";
  const listings = [
    {
      id: "jc-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Jacaranda Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the East Course. Listed with Membership · membership@jacarandagolfclub.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "22888 W. Broward Blvd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "jc-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "W. Broward Blvd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to East & West Courses.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "22920 W. Broward Blvd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "jc-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Broward Blvd Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the East & West Courses. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "5330 Broward Blvd",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.featuredDining],
      daysAgo: 6,
    },
    {
      id: "jc-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental — Jacaranda Court",
      description:
        "Turnkey three-bedroom seasonal rental near the Pro Shop. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "340 W. Broward Blvd",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.featuredGolf],
      daysAgo: 8,
    },
    {
      id: "jc-real-estate-naples",
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
        communityId: JACARANDA_COMMUNITY_ID,
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
