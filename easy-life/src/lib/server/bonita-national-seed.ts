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
 * Bonita National Golf & Country Club ? Bonita Springs, FL demo tenant.
 * 17501 Bonita National Blvd, Bonita Springs, FL 34135 ? (239) 692-8832
 * member.demo@bonitanationalgolfcc.com ? https://www.bonitanationalgolfcc.com
 * Gated community around a wildlife preserve; Gordon Lewis 18-hole championship par 72;
 * tennis, fitness, spa, three dining venues; Troon-affiliated.
 */
export const BONITA_NATIONAL_COMMUNITY_ID = "bonita-national";
const MEMBER_EMAIL = "member.demo@bonitanationalgolfcc.com";
const MEMBER_NAME = "Jordan Blake";
const SOCIAL_EMAIL = "member.social@bonitanationalgolfcc.com";
const SOCIAL_NAME = "Casey Wells";
const PM_EMAIL = "pm.demo@bonitanationalgolfcc.com";
const PM_NAME = "Alex Morgan";
const BOARD_EMAIL = "board.demo@bonitanationalgolfcc.com";
const BOARD_NAME = "Pat Rivera";
const CLUB_PHONE = "(239) 692-8832";
const PRO_SHOP_PHONE = "(239) 692-8832";
const DINING_EMAIL = "dining@bonitanationalgolfcc.com";
const MEMBERSHIP_EMAIL = "membership@bonitanationalgolfcc.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const clubhouseHours = defaultDailyHours("09:00", "21:00");
const proShopHours = defaultDailyHours("07:00", "18:00");
const spaHours = defaultDailyHours("09:00", "19:00");
const racquetHours = defaultDailyHours("07:00", "21:00");
const fitnessHours = defaultDailyHours("05:30", "21:00");
const poolHours = defaultDailyHours("07:00", "20:00");

/** Casual Dining ? breakfast, lunch, and dinner. */
const grillHours: WeeklyHours = {
  mon: { open: "07:00", close: "21:00" },
  tue: { open: "07:00", close: "21:00" },
  wed: { open: "07:00", close: "21:00" },
  thu: { open: "07:00", close: "21:00" },
  fri: { open: "07:00", close: "22:00" },
  sat: { open: "07:00", close: "22:00" },
  sun: { open: "07:00", close: "21:00" },
};

/** Grill & Bar ? daytime through evening. */
const loungeHours: WeeklyHours = {
  mon: { open: "11:00", close: "21:00" },
  tue: { open: "11:00", close: "21:00" },
  wed: { open: "11:00", close: "21:00" },
  thu: { open: "11:00", close: "21:00" },
  fri: { open: "11:00", close: "22:00" },
  sat: { open: "11:00", close: "22:00" },
  sun: { open: "11:00", close: "21:00" },
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
    id: "bn-amenity-golf",
    name: "Championship Course",
    description:
      "Gordon Lewis 18-hole championship par 72 ? Troon-affiliated golf in a gated community around a wildlife preserve.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "bn-amenity-range",
    name: "Practice Facility",
    description:
      "Full practice facility with driving range, putting greens, and short-game area.",
    kind: "driving_range",
    unitCount: 16,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "bn-amenity-tennis",
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
    id: "bn-amenity-fitness",
    name: "Fitness Center",
    description:
      "Member fitness center with cardio, strength training, and wellness programming.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "bn-amenity-pool",
    name: "Pool & Sundeck",
    description:
      "Resort-style pool and sundeck for swim, lounge, and member socials.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "bn-amenity-spa",
    name: "Spa",
    description:
      "Member spa for massage, recovery, and wellness appointments ? book through the club.",
    kind: "facility",
    unitCount: 4,
    holes: null,
    hoursJson: spaHours,
  },
  {
    id: "bn-amenity-dining-fine",
    name: "Fine Dining",
    description:
      "Fine dining for special evenings and celebrations ? steaks, seafood, and seasonal tasting menus.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "bn-amenity-dining-grill",
    name: "Casual Dining",
    description:
      "Casual clubhouse dining for breakfast, lunch, and dinner ? post-round favorites and Southwest Florida classics.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "bn-amenity-dining-lounge",
    name: "Grill & Bar",
    description:
      "Casual bar overlooking the course ? cocktails, small plates, and post-round gatherings.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: loungeHours,
  },
  {
    id: "bn-amenity-events",
    name: "Banquet & Event Spaces",
    description:
      "Banquet and event spaces for weddings, celebrations, and private dining ? inquire with Membership.",
    kind: "facility",
    unitCount: 2,
    holes: null,
    hoursJson: clubhouseHours,
  },
  {
    id: "bn-amenity-proshop",
    name: "Pro Shop",
    description:
      "Golf shop for tee times, apparel, and equipment ? (239) 692-8832.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: proShopHours,
  },
  {
    id: "bn-amenity-clubhouse",
    name: "Clubhouse",
    description:
      "Main clubhouse for Gordon Lewis golf, three dining venues, banquet, spa, fitness, tennis, and member socials ? Bonita National Blvd.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "bn-staff-gm",
    name: "Alex Morgan",
    title: "General Manager",
    department: "Club Management",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "bn-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "bn-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "bn-staff-michael",
    name: "Mike Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@bonitanationalgolfcc.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "bn-staff-laura",
    name: "Jamie Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@bonitanationalgolfcc.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "bn-staff-david",
    name: "Luis Ramirez",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@bonitanationalgolfcc.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "bn-staff-spa",
    name: "Nina Patel",
    title: "Spa Concierge",
    department: "Spa",
    email: "spa@bonitanationalgolfcc.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 20,
  },
  {
    id: "bn-staff-events",
    name: "Morgan Blake",
    title: "Events & Weddings Coordinator",
    department: "Events",
    email: "events@bonitanationalgolfcc.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 21,
  },
  {
    id: "bn-staff-dining",
    name: "Dining Reservations",
    title: "Casual Dining ? Grill & Bar",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "bn-staff-realtor",
    name: "Alex Morgan",
    title: "Membership ? Real Estate Inquiries",
    department: "Membership",
    email: MEMBERSHIP_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros ? category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "bn-pro-michael",
    name: "Mike Torres",
    email: "golf@bonitanationalgolfcc.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on the 18-hole championship golf course and practice greens.",
  },
  {
    id: "bn-pro-laura",
    name: "Jamie Chen",
    email: "golf.assistant@bonitanationalgolfcc.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on 18 holes plus practice putting and chipping.",
  },
] as const;

/** Casual Dining (B/L/D) and Grill & Bar menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "bn-menu-b-omelet", name: "Clubhouse Omelet", price: 14, category: "Casual Dining ? Breakfast" },
  { id: "bn-menu-b-benedict", name: "Eggs Benedict", price: 16, category: "Casual Dining ? Breakfast" },
  { id: "bn-menu-b-fruit", name: "Fresh Fruit Plate", price: 11, category: "Casual Dining ? Breakfast" },
  { id: "bn-menu-l-burger", name: "Bonita National Burger", price: 17, category: "Casual Dining ? Lunch" },
  { id: "bn-menu-l-fish", name: "Grouper Sandwich", price: 19, category: "Casual Dining ? Lunch" },
  { id: "bn-menu-l-caesar", name: "Classic Caesar Salad", price: 13, category: "Casual Dining ? Lunch" },
  { id: "bn-menu-l-club", name: "Club Sandwich", price: 15, category: "Casual Dining ? Lunch" },
  { id: "bn-menu-d-salmon", name: "Pan-Seared Salmon", price: 32, category: "Casual Dining ? Dinner" },
  { id: "bn-menu-d-filet", name: "Filet Mignon", price: 48, category: "Casual Dining ? Dinner" },
  { id: "bn-menu-d-chicken", name: "Herb Roasted Chicken", price: 28, category: "Casual Dining ? Dinner" },
  { id: "bn-menu-d-cake", name: "Key Lime Tart", price: 10, category: "Casual Dining ? Desserts" },
  { id: "bn-menu-f-filet", name: "Prime Filet Mignon", price: 54, category: "Fine Dining ? Dinner" },
  { id: "bn-menu-f-lobster", name: "Butter-Poached Lobster", price: 58, category: "Fine Dining ? Dinner" },
  { id: "bn-menu-f-risotto", name: "Wild Mushroom Risotto", price: 32, category: "Fine Dining ? Dinner" },
  { id: "bn-menu-bar-wrap", name: "Turkey Avocado Wrap", price: 14, category: "Grill & Bar ? Small Plates" },
  { id: "bn-menu-bar-wings", name: "Club Wings", price: 15, category: "Grill & Bar ? Small Plates" },
  { id: "bn-menu-bar-flatbread", name: "Margherita Flatbread", price: 14, category: "Grill & Bar ? Small Plates" },
  { id: "bn-menu-bar-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Grill & Bar ? Beverages" },
  { id: "bn-menu-bar-margarita", name: "Bonita National Margarita", price: 12, category: "Grill & Bar ? Cocktails" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
    where: { id: "bn-provider-dining" },
    create: {
      id: "bn-provider-dining",
      communityId: BONITA_NATIONAL_COMMUNITY_ID,
      name: "Bonita National Dining",
      category: "Dining",
      type: "service",
      rating: 4.9,
      description:
        "Casual Dining (breakfast, lunch, dinner) and Grill & Bar.",
      phone: CLUB_PHONE,
      email: DINING_EMAIL,
      imageUrl: brandAssets.featuredDining,
      listingKind: "club",
    },
    update: {
      name: "Bonita National Dining",
      rating: 4.9,
      description:
        "Casual Dining (breakfast, lunch, dinner) and Grill & Bar.",
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
    id: "bn-vendor-lawn",
    name: "Bonita Springs Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@bonitanationalgolfcc.com",
    phone: "(239) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Bonita National homes off Bonita National Blvd",
  },
  {
    id: "bn-vendor-pool",
    name: "Bonita Springs Home Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@bonitanationalgolfcc.com",
    phone: "(239) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for Bonita National estates.",
  },
  {
    id: "bn-vendor-clean",
    name: "Bonita National Blvd Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@bonitanationalgolfcc.com",
    phone: "(239) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in Bonita National Golf & Country Club.",
  },
  {
    id: "bn-vendor-hvac",
    name: "Bonita Springs Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@bonitanationalgolfcc.com",
    phone: "(239) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "bn-vendor-plumb",
    name: "Bonita Springs Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@bonitanationalgolfcc.com",
    phone: "(239) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Bonita National members.",
  },
  {
    id: "bn-vendor-windows",
    name: "Bonita Springs Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@bonitanationalgolfcc.com",
    phone: "(239) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "bn-vendor-pest",
    name: "Bonita Springs Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@bonitanationalgolfcc.com",
    phone: "(239) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Bonita National properties.",
  },
  {
    id: "bn-vendor-handyman",
    name: "Bonita Springs Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@bonitanationalgolfcc.com",
    phone: "(239) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "bn-vendor-paint",
    name: "Island Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@bonitanationalgolfcc.com",
    phone: "(239) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Bonita National.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-event-ladies-golf",
      title: "Ladies Day ? Championship Course",
      description: "Weekly Ladies Day shotgun on the Championship Course followed by lunch at Casual Dining.",
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
      id: "bn-event-mens-golf",
      title: "Men's Day ? Championship Course",
      description: "Championship Course member competition ? all golf members welcome.",
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
      id: "bn-event-couples",
      title: "Couples Scramble & Clubhouse Lunch",
      description: "Nine-hole couples scramble on the Championship Course followed by lunch in Casual Dining.",
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
      id: "bn-event-range-clinic",
      title: "Short-Game Practice Clinic",
      description: "Putting and chipping clinic with Mike Torres ? warm up before your next Championship Course round.",
      date: easternDateOffset(4),
      time: "16:00",
      location: "Practice Facility",
      category: "golf",
      isPromoted: true,
      capacity: 24,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bn-event-member-social",
      title: "Member Twilight Social",
      description: "Twilight gathering at the Grill & Bar with small plates and course views.",
      date: easternDateOffset(7),
      time: "16:30",
      location: "Grill & Bar",
      category: "social",
      isPromoted: false,
      capacity: 80,
      requirePayment: false,
      feeCents: 0,
    },
    {
      id: "bn-event-wine-dinner",
      title: "Chef's Wine Dinner Series",
      description: "Five-course tasting menu with paired wines in Casual Dining.",
      date: easternDateOffset(9),
      time: "18:30",
      location: "Casual Dining",
      category: "dining",
      isPromoted: true,
      capacity: 48,
      requirePayment: true,
      feeCents: 12500,
    },
    {
      id: "bn-event-spa-evening",
      title: "Spa Recovery Evening",
      description: "Member spa evening ? massage and recovery appointments after afternoon rounds.",
      date: easternDateOffset(8),
      time: "16:00",
      location: "Spa",
      category: "wellness",
      isPromoted: true,
      capacity: 16,
      requirePayment: true,
      feeCents: 7500,
    },
    {
      id: "bn-event-wedding-open",
      title: "Wedding Venue Open House",
      description: "Tour clubhouse event spaces for weddings and private celebrations ? under new ownership revitalization.",
      date: easternDateOffset(12),
      time: "11:00",
      location: "Banquet & Event Spaces",
      category: "social",
      isPromoted: true,
      capacity: 40,
      requirePayment: false,
      feeCents: 0,
    },
  ] as const;

  for (const event of events) {
    await prisma.communityEvent.upsert({
      where: { id: event.id },
      create: { ...event, communityId: BONITA_NATIONAL_COMMUNITY_ID, createdBy: "Bonita National Golf & Country Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "bn-booking-golf",
      amenityId: "bn-amenity-golf",
      unitNumber: 1,
      amenity: "Championship Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "bn-booking-spa",
      amenityId: "bn-amenity-spa",
      unitNumber: 1,
      amenity: "Spa",
      date: easternDateOffset(1),
      startTime: "14:00",
      endTime: "15:00",
    },
    {
      id: "bn-booking-dining",
      amenityId: "bn-amenity-dining-grill",
      unitNumber: 1,
      amenity: "Casual Dining",
      date: easternDateOffset(2),
      startTime: "18:30",
      endTime: "20:00",
    },
    {
      id: "bn-booking-range",
      amenityId: "bn-amenity-range",
      unitNumber: 1,
      amenity: "Practice Facility",
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-announcement-golf",
      title: "Championship course in peak condition",
      body: "The championship course is in peak condition. Book tee times through the pro shop at (239) 692-8832 ? early mornings recommended.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "bn-announcement-range",
      title: "Practice putting & chipping open daily",
      body: "Warm up on the practice greens before Championship Course rounds. Lessons with Mike Torres and Jamie Chen book in the member app.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "bn-announcement-dining",
      title: "Casual Dining & Bar",
      body: "Casual Dining serves breakfast, lunch, and dinner. Grill & Bar is open for cocktails and small plates. Spa and wedding event spaces available ? inquire with Membership.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: BONITA_NATIONAL_COMMUNITY_ID },
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
      id: "bn-document-club-guide",
      title: "Bonita National Golf & Country Club ? Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "bn-document-dues",
      title: "Membership Fees ? Golf & Social",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "bn-document-golf-courses",
      title: "Golf Course Guide ? 18 holes ? championship layout",
      category: "golf",
      url: "#",
      uploadedBy: "Mike Torres ? Director of Golf",
      daysAgo: 3,
    },
    {
      id: "bn-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "bn-document-golf",
      title: "Pro Shop Guide ? Apparel & Equipment",
      category: "golf",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 10,
    },
    {
      id: "bn-document-dining",
      title: "Dining Hours ? Casual Dining ? Grill & Bar",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "bn-document-lifestyle",
      title: "Pro Shop & Clubhouse Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 12,
    },
    {
      id: "bn-document-naples",
      title: "Guest & Family Access Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "bn-document-real-estate",
      title: "Featured Homes ? Bonita National Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership ? Bonita National Realty",
      daysAgo: 4,
    },
    {
      id: "bn-document-governance",
      title: "Board of Governors ? Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Pat Rivera ? Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-group-golf",
      name: "Championship Golf",
      description:
        "18 holes ? 18-hole championship golf course. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "bn-group-ladies",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the Championship Course ? Casual Dining lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "bn-group-mens",
      name: "Men's Day Golf",
      description: "Men's Day competitions rotating the championship course.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "bn-group-dining",
      name: "Dining & Lounge",
      description: "Casual Dining lunch daily and Grill & Bar sunrise?sunset.",
      color: "from-amber-400 to-orange-700",
      members: 410,
    },
    {
      id: "bn-group-social",
      name: "Member Socials",
      description: "Twilight gatherings, wine dinners, and clubhouse terrace evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "bn-group-newcomers",
      name: "New Member Welcome",
      description: "Welcome notes, ride shares, and recommendations around Bonita National Blvd and the club.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
    "bn-group-golf",
    "bn-group-ladies",
    "bn-group-dining",
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
    "bn-group-social",
    "bn-group-golf",
    "bn-group-dining",
    "bn-group-newcomers",
    "bn-group-mens",
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
    { email: MEMBER_EMAIL, label: "Practice Facility", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Private golf lessons", href: "/member/lessons" },
    { email: MEMBER_EMAIL, label: "Spa", href: "/member/bookings" },
    { email: MEMBER_EMAIL, label: "Casual Dining", href: "/member/dining" },
    { email: MEMBER_EMAIL, label: "Club calendar", href: "/member/calendar" },
    { email: MEMBER_EMAIL, label: "Pay dues", href: "/member/payments" },
    { email: SOCIAL_EMAIL, label: "Grill & Bar", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Casual Dining", href: "/member/dining" },
    { email: SOCIAL_EMAIL, label: "Spa", href: "/member/bookings" },
    { email: SOCIAL_EMAIL, label: "Wedding event spaces", href: "/member/events" },
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
  const michael = { email: "golf@bonitanationalgolfcc.com", name: "Mike Torres" };
  const laura = { email: "golf.assistant@bonitanationalgolfcc.com", name: "Jamie Chen" };
  const sophia = { email: "spa@bonitanationalgolfcc.com", name: "Nina Patel" };
  const megan = { email: "events@bonitanationalgolfcc.com", name: "Morgan Blake" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: MEMBERSHIP_EMAIL, name: "Alex Morgan" };
  const frederick = { email: PM_EMAIL, name: "Alex Morgan" };
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
      id: "bn-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Taylor ? can we do a playing lesson Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on the championship course ? we'll focus on club selection and approach shots.",
          hoursAgo: 38,
        },
        {
          author: claire,
          body: "Perfect. Should I warm up on the range first?",
          hoursAgo: 36,
        },
        {
          author: michael,
          body: "Yes ? arrive by 8:30. The greens are firm this week, so we'll talk landing areas too.",
          hoursAgo: 2,
        },
      ],
    },
    {
      id: "bn-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Taylor ? the practice green is open Saturday at 10 for your the championship course. We'll work on your short-game touch.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: sophia,
          body: "Basket is ready at the range ? just water and a visor. Booked 10:00?11:00.",
          hoursAgo: 24,
        },
      ],
    },
    {
      id: "bn-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi ? table for two in Casual Dining Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Casual Dining. The snapper and filet are chef's highlights this week.",
          hoursAgo: 18,
        },
        {
          author: claire,
          body: "Wonderful ? thank you!",
          hoursAgo: 17,
        },
      ],
    },
    {
      id: "bn-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Taylor ? saw you booked the championship course. Anything specific to focus on?",
          hoursAgo: 10,
        },
        {
          author: claire,
          body: "Mostly chip shots around the green ? I keep leaving them short.",
          hoursAgo: 8,
        },
        {
          author: megan,
          body: "Classic. We'll drill chips on the practice green ? you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
      id: "bn-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Taylor ? member social tonight at 5 if you're free. Loser buys Grill & Bar smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got an early tee time in the morning ? rain check for the lounge social Friday?",
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
      id: "bn-chat-robert-dining",
      createdBy: robert.email,
      participants: [robert, dining],
      messages: [
        {
          author: robert,
          body: "Can we hold Grill & Bar seating Sunday for four? Visiting family.",
          hoursAgo: 16,
        },
        {
          author: dining,
          body: "Absolutely ? Grill & Bar table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "bn-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Jamie ? guest rate for my sister Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies ? I can put you on a 2:30 tee. Course conditions are excellent this week.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Book it please ? she'll love the course.",
          hoursAgo: 27,
        },
      ],
    },
    {
      id: "bn-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Andrew ? my guest pass for Saturday's tee time still shows pending. Can Membership confirm?",
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
      id: "bn-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Taylor ? 17501 Bonita National Blvd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please ? neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Bonita National Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "bn-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Taylor ? any member comments for the July board packet? We're covering Pro Shop hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the lounge socials on the calendar through October ? they've been wonderful for the community.",
          hoursAgo: 42,
        },
        {
          author: frederick,
          body: "Noted ? Dan will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "bn-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Taylor ? board meeting next week covers pro shop hours and dining expansions. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Lounge gathering after morning rounds would be great ? early appointment slots if possible.",
          hoursAgo: 48,
        },
        {
          author: james,
          body: "Thank you ? I'll share that with Marcus and the fitness team.",
          hoursAgo: 46,
        },
      ],
    },
    {
      id: "bn-chat-golf-social",
      kind: "group",
      title: "Twilight Member Social",
      createdBy: megan.email,
      participants: [claire, robert, megan],
      messages: [
        {
          author: megan,
          body: "Round-robin Thursday at 4 across Courts 1?6. All levels ? borrow a paddle at the desk if needed.",
          hoursAgo: 15,
        },
        {
          author: robert,
          body: "I'm in. Anyone up for Court 12 after if it frees up?",
          hoursAgo: 12,
        },
        {
          author: claire,
          body: "Yes ? see you at 4. Loser buys Grill & Bar smoothies?",
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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

export async function ensureBonitaNationalDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: BONITA_NATIONAL_COMMUNITY_ID },
    create: {
      id: BONITA_NATIONAL_COMMUNITY_ID,
      name: "Bonita National Golf & Country Club",
      location: "Bonita Springs, FL",
      residentCount: 1240,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1a4d2e] to-[#c9a227]",
      logoUrl: brandAssets.communityBonitaNational,
      primaryColor: "#1a4d2e",
      appDisplayName: "Bonita National",
      inviteCode: "bonita-national-demo",
    },
    update: {
      name: "Bonita National Golf & Country Club",
      location: "Bonita Springs, FL",
      logoUrl: brandAssets.communityBonitaNational,
      primaryColor: "#1a4d2e",
      appDisplayName: "Bonita National",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-bn-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-bn-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-bn-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-bn-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "17501 Bonita National Blvd",
      householdAddress: "17501 Bonita National Blvd, Bonita Springs, FL 34135",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "17503 Bonita National Blvd",
      householdAddress: "17503 Bonita National Blvd, Bonita Springs, FL 34135",
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

  await ensureMembershipTiersSeeded(BONITA_NATIONAL_COMMUNITY_ID);
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
export async function ensureBonitaNationalDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureBonitaNationalDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureBonitaNationalDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureBonitaNationalDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureBonitaNationalDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureBonitaNationalDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureBonitaNationalDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "17501 Bonita National Blvd",
      title: "Guest pass pending for Saturday Championship Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the Championship Course ? guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "17501 Bonita National Blvd",
      title: "Irrigation overspray on Bonita National Blvd driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 17501 Bonita National Blvd soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "17501 Bonita National Blvd",
      title: "Championship Course cart path near hole 7",
      category: "Amenities",
      description: "Cart path washout near Championship Course hole 7 ? needs fill before weekend play.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "17503 Bonita National Blvd",
      title: "Clubhouse terrace string lights out",
      category: "Maintenance",
      description: "Half the terrace string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "17503 Bonita National Blvd",
      title: "Pro Shop bag storage locker stuck",
      category: "Amenities",
      description: "Locker 14 in the pro shop bag room will not open ? key turns but latch sticks.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "17501 Bonita National Blvd",
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
  const proShop = "Bonita National Pro Shop";
  const apparel = [
    {
      id: "bn-apparel-polo-navy",
      name: "Club Polo ? Navy",
      description: "Performance pique polo with embroidered Bonita National crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/bn-apparel-polo-navy.png",
    },
    {
      id: "bn-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo ? White",
      description: "Moisture-wicking sleeveless polo with club crest ? ideal for warm Bonita National rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/bn-apparel-ladies-polo.png",
    },
    {
      id: "bn-apparel-quarter-zip",
      name: "Member Quarter-Zip ? Heather Grey",
      description: "Lightweight layer for cool Bonita National mornings on the championship course.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/bn-apparel-quarter-zip.png",
    },
    {
      id: "bn-apparel-cap",
      name: "Performance Cap ? Navy",
      description: "Structured adjustable cap with embroidered Bonita National crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bn-apparel-cap-navy.png",
    },
    {
      id: "bn-apparel-visor",
      name: "Tour Visor ? Black",
      description: "Lightweight tour visor for the championship course.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bn-apparel-visor-black.png",
    },
    {
      id: "bn-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/bn-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      communityId: BONITA_NATIONAL_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo ? championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "bn-apparel-polo-navy",
            name: "Club Polo ? Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "bn-apparel-cap",
            name: "Performance Cap ? Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo ? championship tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "bn-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen ? switching to Left Dash. Pickup on Bonita National after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "17501 Bonita National Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "bn-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Bonita National Blvd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "17503 Bonita National Blvd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "bn-marketplace-peloton",
      title: "Peloton Bike ? Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "17510 Bonita National Blvd",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "bn-marketplace-junior-set",
      title: "Junior Golf Set",
      description: "Lightly used junior golf set for ages 8?12. Fresh grips and bag included.",
      price: 32,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "17515 Bonita National Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 4,
    },
    {
      id: "bn-marketplace-polo",
      title: "Bonita National Golf & Country Club Polo ? Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "17501 Bonita National Blvd",
      imageUrl: "/brand/apparel/bn-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "bn-marketplace-callaway-junior",
      title: "Callaway Edge Junior Set",
      description: "Junior golf set ? lightly used, great for range sessions.",
      price: 85,
      category: "Golf",
      seller: SOCIAL_NAME,
      unit: "17503 Bonita National Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-blog-five-courses",
      title: "Playing the championship course this season",
      excerpt:
        "Director of Golf Mike Torres shares tips for Bonita National's 18 holes.",
      body: "Bonita National members enjoy 18 holes ? 18-hole championship golf course. Book early mornings for the coolest conditions and ask the pro shop about member events.",
      author: "Mike Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "bn-blog-breezeway",
      title: "Grill & Bar favorites after golf",
      excerpt:
        "Breakfast, lunch, and small plates from through early evening.",
      body: "After a morning round, Grill & Bar is the easy stop for light plates and cold drinks. Casual Dining picks up lunch daily ? reserve through Dining in the member app.",
      author: "Bonita National Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "bn-blog-golf-community",
      title: "18 holes, one thriving golf community",
      excerpt:
        "Spa recovery evenings and short-game clinics on the practice greens.",
      body: "With 18 holes across the championship course ? private equity championship golf ? Bonita National runs member events so everyone meets more members. Book a tee time in the app, arrive early for the practice putting and chipping, and stay for Grill & Bar afterward.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 5,
    },
    {
      id: "bn-blog-golf-tips",
      title: "Practice range & greens ? warm-up tips",
      excerpt: "Get the most from Bonita National's practice facilities before you tee off.",
      body: "Warm up on the practice putting and chipping before the championship course rounds. Book lessons mid-morning when the greens are firmest. Jamie Chen runs junior clinics on weekends.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "bn-blog-lifestyle",
      title: "Pro Shop summer programming",
      excerpt:
        "Range clinics, lounge gatherings, and Pro Shop hours for the warm season.",
      body: "Warm up before tee times on the practice putting and chipping, then recover at Grill & Bar. Group clinics fill quickly ? check the calendar. The Pro Shop opens early for apparel and equipment.",
      author: "Pro Shop Team",
      category: "Golf",
      daysAgo: 9,
    },
    {
      id: "bn-blog-welcome",
      title: "Welcome to Bonita National Golf & Country Club",
      excerpt:
        "Simple ways to settle in ? golf, dining, and community groups.",
      body: "Start with a casual meal at Casual Dining or Grill & Bar, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes and real-estate questions.",
      author: "Alex Morgan",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-blog-comment-golf-1",
      postId: "bn-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable ? thanks for the tips, Mike!",
    },
    {
      id: "bn-blog-comment-golf-2",
      postId: "bn-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Championship Course was in perfect shape last weekend.",
    },
    {
      id: "bn-blog-comment-breezeway-1",
      postId: "bn-blog-breezeway",
      author: MEMBER_NAME,
      body: "Grill & Bar after golf is our Saturday ritual now.",
    },
    {
      id: "bn-blog-comment-community-1",
      postId: "bn-blog-golf-community",
      author: SOCIAL_NAME,
      body: "Spa recovery evening was packed but so welcoming. Counting me in next month.",
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
      id: "bn-newsletter-july-2026",
      title: "Bonita National Golf & Country Club Summer Update ? July 2026",
      summary:
        "the championship course in peak condition, lounge socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Bonita National Golf & Country Club. Our 18 holes ? 18-hole championship course, private equity championship golf ? are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "? Casual Dining (lunch Tue?Sun) and Grill & Bar (sunrise?sunset) ? reserve in Dining",
        "? Clubhouse terrace social with live music",
        "? Spa Recovery Evening ? book through the pro shop",
        "",
        "Questions: Membership ? (239) 692-8832 ? 17501 Bonita National Blvd, Bonita Springs, FL 34135 ? membership@bonitanationalgolfcc.com ? https://www.bonitanationalgolfcc.com/",
        "",
        "? Alex Morgan",
        "General Manager",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "bn-newsletter-golf-roundup",
      title: "Golf Roundup ? Championship Course",
      summary:
        "Course notes from Mike Torres, practice putting and chipping clinics, and apparel.",
      body: [
        "Golf members,",
        "",
        "Golf: the championship course is playing firm and fast. Warm up on the practice putting and chipping, then book lessons with Mike Torres or Jamie Chen.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked ? order through Club Apparel in the app ? (239) 692-8832.",
        "",
        "? Golf Shop",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "bn-newsletter-dining",
      title: "Dining at Bonita National ? Midsummer Menus",
      summary:
        "Casual Dining/Lounge lunch daily ? Casual Dining seasonal.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Casual Dining (lunch Tue?Sun) and Grill & Bar (sunrise?sunset). After golf, Grill & Bar is the easy stop. Lunch reservations for Casual Dining book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club ? we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "? Bonita National Dining",
        "dining@bonitanationalgolfcc.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "bn-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Bonita National Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Bonita National neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "Bonita National does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at membership@bonitanationalgolfcc.com ? (239) 692-8832 ? 17501 Bonita National Blvd, Bonita Springs, FL 34135.",
        "",
        "Thank you for making Bonita National Golf & Country Club a vibrant member community.",
        "",
        "? Club Administration ? Alex Morgan, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-gallery-east-dusk",
      title: "Championship Course 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Mike Torres",
      daysAgo: 1,
    },
    {
      id: "bn-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "bn-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Jamie Chen",
      daysAgo: 3,
    },
    {
      id: "bn-gallery-west",
      title: "Championship Course fairways",
      category: "Golf",
      url: brandAssets.featuredGolf,
      uploadedBy: "Mike Torres",
      daysAgo: 4,
    },
    {
      id: "bn-gallery-lounge",
      title: "Grill & Bar",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 5,
    },
    {
      id: "bn-gallery-proshop",
      title: "Pro Shop",
      category: "Golf",
      url: brandAssets.amenityClubhouse,
      uploadedBy: "Pro Shop Team",
      daysAgo: 6,
    },
    {
      id: "bn-gallery-dining",
      title: "Casual Dining",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Bonita National Dining",
      daysAgo: 7,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
      id: "bn-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "17501 Bonita National Blvd, Bonita Springs, FL 34135",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "bn-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "17510 Bonita National Blvd, Bonita Springs, FL 34135",
      type: "Investment property",
      owner: true,
    },
    {
      id: "bn-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "17503 Bonita National Blvd, Bonita Springs, FL 34135",
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
  const patriciaEmail = "membership@bonitanationalgolfcc.com";
  const listings = [
    {
      id: "bn-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Bonita National Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the Championship Course. Listed with Membership ? membership@bonitanationalgolfcc.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "17520 Bonita National Blvd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "bn-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Bonita National Blvd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to the championship course.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "17525 Bonita National Blvd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "bn-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Military Trail Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the championship course. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "17510 Bonita National Blvd",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.featuredDining],
      daysAgo: 6,
    },
    {
      id: "bn-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental ? Bonita National Blvd",
      description:
        "Turnkey three-bedroom seasonal rental near the Pro Shop. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "17515 Bonita National Blvd",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.featuredGolf],
      daysAgo: 8,
    },
    {
      id: "bn-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Pro Shop Adjacent Condo",
      description:
        "Two-bedroom condo steps from the Pro Shop ? lock-and-leave for snowbirds with full golf and dining access.",
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
        communityId: BONITA_NATIONAL_COMMUNITY_ID,
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
