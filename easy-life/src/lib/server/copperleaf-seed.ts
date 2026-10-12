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
 * Copperleaf Golf Club (at The Brooks) · Bonita Springs, FL demo tenant.
 * 23101 Copperleaf Blvd, Bonita Springs, FL 34135 · (239) 390-2030
 * membership@copperleafgolf.com
 * Private equity golf club at The Brooks, Bonita Springs · championship course,
 * practice facility, fitness, pool, spa, casual + fine dining and banquet.
 */
export const COPPERLEAF_COMMUNITY_ID = "copperleaf";
const MEMBER_EMAIL = "member.demo@copperleafgolf.com";
const MEMBER_NAME = "Morgan Blake";
const SOCIAL_EMAIL = "member.social@copperleafgolf.com";
const SOCIAL_NAME = "Taylor Wells";
const PM_EMAIL = "pm.demo@copperleafgolf.com";
const PM_NAME = "Chris Coleman";
const BOARD_EMAIL = "board.demo@copperleafgolf.com";
const BOARD_NAME = "Jordan Rivera";
const CLUB_PHONE = "(239) 390-2030";
const PRO_SHOP_PHONE = "(239) 390-2030";
const DINING_EMAIL = "dining@copperleafgolf.com";
const MEMBERSHIP_EMAIL = "membership@copperleafgolf.com";

const golfHours = defaultDailyHours("07:00", "18:30");
const clubhouseHours = defaultDailyHours("09:00", "21:00");
const proShopHours = defaultDailyHours("07:00", "18:00");
const spaHours = defaultDailyHours("09:00", "19:00");
const racquetHours = defaultDailyHours("07:00", "21:00");
const fitnessHours = defaultDailyHours("05:30", "21:00");
const poolHours = defaultDailyHours("07:00", "20:00");

/** Casual Dining · breakfast, lunch, and dinner. */
const grillHours: WeeklyHours = {
  mon: { open: "07:00", close: "21:00" },
  tue: { open: "07:00", close: "21:00" },
  wed: { open: "07:00", close: "21:00" },
  thu: { open: "07:00", close: "21:00" },
  fri: { open: "07:00", close: "22:00" },
  sat: { open: "07:00", close: "22:00" },
  sun: { open: "07:00", close: "21:00" },
};

/** Grill & Bar · daytime through evening. */
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
    id: "cl-amenity-golf",
    name: "Championship Course",
    description:
      "18-hole championship golf course at The Brooks · part of the Copperleaf Hospitality portfolio in Bonita Springs.",
    kind: "golf_course",
    unitCount: 8,
    holes: 18,
    hoursJson: golfHours,
  },
  {
    id: "cl-amenity-range",
    name: "Practice Facility",
    description:
      "Full practice facility with driving range, putting greens, and short-game area.",
    kind: "driving_range",
    unitCount: 16,
    holes: null,
    hoursJson: golfHours,
  },
  {
    id: "cl-amenity-tennis",
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
    id: "cl-amenity-fitness",
    name: "Fitness Center",
    description:
      "Member fitness center with cardio, strength training, and wellness programming.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: fitnessHours,
  },
  {
    id: "cl-amenity-pool",
    name: "Pool & Sundeck",
    description:
      "Resort-style pool and sundeck for swim, lounge, and member socials.",
    kind: "pool",
    unitCount: 1,
    holes: null,
    hoursJson: poolHours,
  },
  {
    id: "cl-amenity-spa",
    name: "Spa",
    description:
      "Member spa for massage, recovery, and wellness appointments · book through the club.",
    kind: "facility",
    unitCount: 4,
    holes: null,
    hoursJson: spaHours,
  },
  {
    id: "cl-amenity-dining-fine",
    name: "Fine Dining",
    description:
      "Fine dining for special evenings and celebrations · steaks, seafood, and seasonal tasting menus.",
    kind: "restaurant",
    unitCount: 12,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "cl-amenity-dining-grill",
    name: "Casual Dining",
    description:
      "Casual clubhouse dining for breakfast, lunch, and dinner · post-round favorites and Bonita Springs classics.",
    kind: "restaurant",
    unitCount: 18,
    holes: null,
    hoursJson: grillHours,
  },
  {
    id: "cl-amenity-dining-lounge",
    name: "Grill & Bar",
    description:
      "Casual bar overlooking the course · cocktails, small plates, and post-round gatherings.",
    kind: "restaurant",
    unitCount: 14,
    holes: null,
    hoursJson: loungeHours,
  },
  {
    id: "cl-amenity-events",
    name: "Banquet & Event Spaces",
    description:
      "Banquet and event spaces for weddings, celebrations, and private dining · inquire with Membership.",
    kind: "facility",
    unitCount: 2,
    holes: null,
    hoursJson: clubhouseHours,
  },
  {
    id: "cl-amenity-proshop",
    name: "Pro Shop",
    description:
      "Golf shop for tee times, apparel, and equipment · (239) 390-2030.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: proShopHours,
  },
  {
    id: "cl-amenity-clubhouse",
    name: "Clubhouse",
    description:
      "Main clubhouse for golf, casual and fine dining, banquet, spa, fitness, and member socials · at The Brooks.",
    kind: "facility",
    unitCount: 1,
    holes: null,
    hoursJson: clubhouseHours,
  },
];

const staff = [
  {
    id: "cl-staff-gm",
    name: "Chris Coleman",
    title: "General Manager",
    department: "Club Management",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 1,
  },
  {
    id: "cl-staff-pm",
    name: PM_NAME,
    title: "Membership & Communications",
    department: "Membership",
    email: PM_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 2,
  },
  {
    id: "cl-staff-james",
    name: BOARD_NAME,
    title: "Board of Governors",
    department: "Governance",
    email: BOARD_EMAIL,
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 3,
  },
  {
    id: "cl-staff-michael",
    name: "Mike Torres",
    title: "Director of Golf",
    department: "Golf",
    email: "golf@copperleafgolf.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 10,
  },
  {
    id: "cl-staff-laura",
    name: "Jamie Chen",
    title: "First Assistant Golf Professional",
    department: "Golf",
    email: "golf.assistant@copperleafgolf.com",
    phone: PRO_SHOP_PHONE,
    category: "golf_pro",
    sortOrder: 11,
  },
  {
    id: "cl-staff-david",
    name: "Luis Ramirez",
    title: "Golf Course Superintendent",
    department: "Golf Course Operations",
    email: "superintendent@copperleafgolf.com",
    phone: CLUB_PHONE,
    category: "golf_pro",
    sortOrder: 12,
  },
  {
    id: "cl-staff-spa",
    name: "Nina Patel",
    title: "Spa Concierge",
    department: "Spa",
    email: "spa@copperleafgolf.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 20,
  },
  {
    id: "cl-staff-events",
    name: "Morgan Blake",
    title: "Events & Weddings Coordinator",
    department: "Events",
    email: "events@copperleafgolf.com",
    phone: CLUB_PHONE,
    category: "management",
    sortOrder: 21,
  },
  {
    id: "cl-staff-dining",
    name: "Dining Reservations",
    title: "Casual Dining · Grill & Bar",
    department: "Dining",
    email: DINING_EMAIL,
    phone: CLUB_PHONE,
    category: "dining",
    sortOrder: 31,
  },
  {
    id: "cl-staff-realtor",
    name: "Chris Coleman",
    title: "Membership · Real Estate Inquiries",
    department: "Membership",
    email: MEMBERSHIP_EMAIL,
    phone: CLUB_PHONE,
    category: "front_desk",
    sortOrder: 40,
  },
] as const;

/** Lesson pros · category must be lowercase so Lessons filters match on Postgres. */
const lessonPros = [
  {
    id: "cl-pro-michael",
    name: "Mike Torres",
    email: "golf@copperleafgolf.com",
    category: "golf",
    description:
      "Director of Golf. Instruction on the 18-hole championship golf course at The Brooks and practice greens.",
  },
  {
    id: "cl-pro-laura",
    name: "Jamie Chen",
    email: "golf.assistant@copperleafgolf.com",
    category: "golf",
    description:
      "First Assistant Professional. Private lessons, playing lessons, and junior programs on 18 holes plus practice putting and chipping.",
  },
] as const;

/** Casual Dining (B/L/D) and Grill & Bar menus. */
const menuItems: Array<{ id: string; name: string; price: number; category: string }> = [
  { id: "cl-menu-b-omelet", name: "Clubhouse Omelet", price: 14, category: "Casual Dining · Breakfast" },
  { id: "cl-menu-b-benedict", name: "Eggs Benedict", price: 16, category: "Casual Dining · Breakfast" },
  { id: "cl-menu-b-fruit", name: "Fresh Fruit Plate", price: 11, category: "Casual Dining · Breakfast" },
  { id: "cl-menu-l-burger", name: "Copperleaf Burger", price: 17, category: "Casual Dining · Lunch" },
  { id: "cl-menu-l-fish", name: "Grouper Sandwich", price: 19, category: "Casual Dining · Lunch" },
  { id: "cl-menu-l-caesar", name: "Classic Caesar Salad", price: 13, category: "Casual Dining · Lunch" },
  { id: "cl-menu-l-club", name: "Club Sandwich", price: 15, category: "Casual Dining · Lunch" },
  { id: "cl-menu-d-salmon", name: "Pan-Seared Salmon", price: 32, category: "Casual Dining · Dinner" },
  { id: "cl-menu-d-filet", name: "Filet Mignon", price: 48, category: "Casual Dining · Dinner" },
  { id: "cl-menu-d-chicken", name: "Herb Roasted Chicken", price: 28, category: "Casual Dining · Dinner" },
  { id: "cl-menu-d-cake", name: "Key Lime Tart", price: 10, category: "Casual Dining · Desserts" },
  { id: "cl-menu-f-filet", name: "Prime Filet Mignon", price: 54, category: "Fine Dining · Dinner" },
  { id: "cl-menu-f-lobster", name: "Butter-Poached Lobster", price: 58, category: "Fine Dining · Dinner" },
  { id: "cl-menu-f-risotto", name: "Wild Mushroom Risotto", price: 32, category: "Fine Dining · Dinner" },
  { id: "cl-menu-bar-wrap", name: "Turkey Avocado Wrap", price: 14, category: "Grill & Bar · Small Plates" },
  { id: "cl-menu-bar-wings", name: "Club Wings", price: 15, category: "Grill & Bar · Small Plates" },
  { id: "cl-menu-bar-flatbread", name: "Margherita Flatbread", price: 14, category: "Grill & Bar · Small Plates" },
  { id: "cl-menu-bar-iced", name: "Fresh-Brewed Iced Tea", price: 4, category: "Grill & Bar · Beverages" },
  { id: "cl-menu-bar-margarita", name: "Bonita Springs Margarita", price: 12, category: "Grill & Bar · Cocktails" },
];

async function seedAmenities() {
  for (const amenity of amenities) {
    const schedule = formatHoursSummary(amenity.hoursJson);
    await prisma.amenity.upsert({
      where: { id: amenity.id },
      create: {
        id: amenity.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
    where: { id: "cl-provider-dining" },
    create: {
      id: "cl-provider-dining",
      communityId: COPPERLEAF_COMMUNITY_ID,
      name: "Copperleaf Dining",
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
      name: "Copperleaf Dining",
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
    id: "cl-vendor-lawn",
    name: "Bonita Springs Lawn & Landscape",
    category: "Lawn Care",
    rating: 4.8,
    email: "lawn@copperleafgolf.com",
    phone: "(239) 555-5101",
    description:
      "Weekly mowing, edging, and seasonal plantings for Copperleaf homes off Copperleaf Blvd",
  },
  {
    id: "cl-vendor-pool",
    name: "Bonita Springs Home Care",
    category: "Pool",
    rating: 4.7,
    email: "pool@copperleafgolf.com",
    phone: "(239) 555-5102",
    description:
      "Residential pool chemistry, weekly cleaning, and equipment service for Copperleaf estates.",
  },
  {
    id: "cl-vendor-clean",
    name: "Copperleaf Blvd Cleaning",
    category: "Cleaning",
    rating: 4.9,
    email: "cleaning@copperleafgolf.com",
    phone: "(239) 555-5103",
    description:
      "Housekeeping and deep cleans for villas and single-family homes in Copperleaf Golf Club.",
  },
  {
    id: "cl-vendor-hvac",
    name: "Bonita Springs Climate HVAC",
    category: "HVAC",
    rating: 4.6,
    email: "hvac@copperleafgolf.com",
    phone: "(239) 555-5104",
    description:
      "AC service, filter changes, and emergency cooling repair for gated-community residences.",
  },
  {
    id: "cl-vendor-plumb",
    name: "Bonita Springs Plumbing",
    category: "Plumbing",
    rating: 4.5,
    email: "plumbing@copperleafgolf.com",
    phone: "(239) 555-5105",
    description:
      "Same-day plumbing, fixture installs, and water heater service for Copperleaf members.",
  },
  {
    id: "cl-vendor-windows",
    name: "Bonita Springs Window Cleaning",
    category: "Window Cleaning",
    rating: 4.7,
    email: "windows@copperleafgolf.com",
    phone: "(239) 555-5106",
    description:
      "Interior and exterior window cleaning for lanais, golf views, and multi-story homes.",
  },
  {
    id: "cl-vendor-pest",
    name: "Bonita Springs Pest Pros",
    category: "Pest Control",
    rating: 4.6,
    email: "pest@copperleafgolf.com",
    phone: "(239) 555-5107",
    description:
      "Quarterly pest control and seasonal mosquito treatments for Copperleaf properties.",
  },
  {
    id: "cl-vendor-handyman",
    name: "Bonita Springs Handyman Co.",
    category: "Handyman",
    rating: 4.8,
    email: "handyman@copperleafgolf.com",
    phone: "(239) 555-5108",
    description:
      "Small repairs, TV mounts, closet hardware, and punch-list work for member homes.",
  },
  {
    id: "cl-vendor-paint",
    name: "Island Paint & Finish",
    category: "Painting",
    rating: 4.5,
    email: "paint@copperleafgolf.com",
    phone: "(239) 555-5109",
    description:
      "Interior and exterior painting for villas and estate residences throughout Copperleaf.",
  },
] as const;

async function seedNearbyVendors() {
  for (const vendor of nearbyVendors) {
    const imageUrl = imageForProviderCategory(vendor.category, "service", vendor.name);
    await prisma.provider.upsert({
      where: { id: vendor.id },
      create: {
        id: vendor.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-event-ladies-golf",
      title: "Ladies Day · Championship Course",
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
      id: "cl-event-mens-golf",
      title: "Men's Day · Championship Course",
      description: "Championship Course member competition · all golf members welcome.",
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
      id: "cl-event-couples",
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
      id: "cl-event-range-clinic",
      title: "Short-Game Practice Clinic",
      description: "Putting and chipping clinic with Mike Torres · warm up before your next Championship Course round.",
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
      id: "cl-event-member-social",
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
      id: "cl-event-wine-dinner",
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
      id: "cl-event-spa-evening",
      title: "Spa Recovery Evening",
      description: "Member spa evening · massage and recovery appointments after afternoon rounds.",
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
      id: "cl-event-wedding-open",
      title: "Wedding Venue Open House",
      description: "Tour clubhouse event spaces for weddings and private celebrations · under new ownership revitalization.",
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
      create: { ...event, communityId: COPPERLEAF_COMMUNITY_ID, createdBy: "Copperleaf Golf Club" },
      update: event,
    });
  }

  const bookings = [
    {
      id: "cl-booking-golf",
      amenityId: "cl-amenity-golf",
      unitNumber: 1,
      amenity: "Championship Course",
      date: easternDateOffset(2),
      startTime: "08:12",
      endTime: "12:30",
    },
    {
      id: "cl-booking-spa",
      amenityId: "cl-amenity-spa",
      unitNumber: 1,
      amenity: "Spa",
      date: easternDateOffset(1),
      startTime: "14:00",
      endTime: "15:00",
    },
    {
      id: "cl-booking-dining",
      amenityId: "cl-amenity-dining-grill",
      unitNumber: 1,
      amenity: "Casual Dining",
      date: easternDateOffset(2),
      startTime: "18:30",
      endTime: "20:00",
    },
    {
      id: "cl-booking-range",
      amenityId: "cl-amenity-range",
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-announcement-golf",
      title: "Championship course in peak condition",
      body: "The Joe Lee / Gene Bates restored 18-hole championship course is in peak condition. Book tee times through the pro shop at (239) 390-2030 · early mornings recommended.",
      author: "Golf Shop",
      priority: "important",
    },
    {
      id: "cl-announcement-range",
      title: "Practice putting & chipping open daily",
      body: "Warm up on the practice greens before Championship Course rounds. Lessons with Mike Torres and Jamie Chen book in the member app.",
      author: "Golf Shop",
      priority: "normal",
    },
    {
      id: "cl-announcement-dining",
      title: "Casual Dining & Bar",
      body: "Casual Dining serves breakfast, lunch, and dinner. Grill & Bar is open for cocktails and small plates. Spa and wedding event spaces available · inquire with Membership.",
      author: "Dining",
      priority: "normal",
    },
  ] as const;

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: { ...a, communityId: COPPERLEAF_COMMUNITY_ID },
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
      id: "cl-document-club-guide",
      title: "Copperleaf Golf Club · Member Guide 2026",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 5,
    },
    {
      id: "cl-document-dues",
      title: "Membership Fees · Golf & Social",
      category: "membership",
      url: "#",
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "cl-document-golf-courses",
      title: "Golf Course Guide · Joe Lee / Gene Bates · 18 holes",
      category: "golf",
      url: "#",
      uploadedBy: "Mike Torres · Director of Golf",
      daysAgo: 3,
    },
    {
      id: "cl-document-tee-policy",
      title: "Tee Time & Guest Policy",
      category: "golf",
      url: "#",
      uploadedBy: "Golf Shop",
      daysAgo: 7,
    },
    {
      id: "cl-document-golf",
      title: "Pro Shop Guide · Apparel & Equipment",
      category: "golf",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 10,
    },
    {
      id: "cl-document-dining",
      title: "Dining Hours · Casual Dining · Grill & Bar",
      category: "dining",
      url: "#",
      uploadedBy: "Food & Beverage",
      daysAgo: 6,
    },
    {
      id: "cl-document-lifestyle",
      title: "Pro Shop & Clubhouse Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Pro Shop",
      daysAgo: 12,
    },
    {
      id: "cl-document-naples",
      title: "Guest & Family Access Guide",
      category: "membership",
      url: "#",
      uploadedBy: "Club Administration",
      daysAgo: 14,
    },
    {
      id: "cl-document-real-estate",
      title: "Featured Homes · Copperleaf Realty Listings",
      category: "real_estate",
      url: "#",
      uploadedBy: "Membership · Copperleaf Realty",
      daysAgo: 4,
    },
    {
      id: "cl-document-governance",
      title: "Board of Governors · Meeting Summary",
      category: "legal",
      url: "#",
      uploadedBy: "Jordan Rivera · Board",
      daysAgo: 20,
    },
  ] as const;

  for (const document of documents) {
    await prisma.communityDocument.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-group-golf",
      name: "Championship Golf",
      description:
        "18 holes · 18-hole championship golf course at The Brooks. Pairings, leagues, and member tournaments.",
      color: "from-emerald-500 to-teal-800",
      members: 920,
    },
    {
      id: "cl-group-ladies",
      name: "Ladies Day Golf",
      description: "Weekly Ladies Day on the Championship Course · Casual Dining lunches after the round.",
      color: "from-rose-400 to-purple-700",
      members: 142,
    },
    {
      id: "cl-group-mens",
      name: "Men's Day Golf",
      description: "Men's Day competitions rotating the championship course.",
      color: "from-lime-400 to-green-700",
      members: 186,
    },
    {
      id: "cl-group-dining",
      name: "Dining & Lounge",
      description: "Casual Dining lunch daily and Grill & Bar sunrise·sunset.",
      color: "from-amber-400 to-orange-700",
      members: 410,
    },
    {
      id: "cl-group-social",
      name: "Member Socials",
      description: "Twilight gatherings, wine dinners, and clubhouse terrace evenings.",
      color: "from-violet-400 to-fuchsia-700",
      members: 428,
    },
    {
      id: "cl-group-newcomers",
      name: "New Member Welcome",
      description: "Welcome notes, ride shares, and recommendations around Copperleaf Blvd and the club.",
      color: "from-slate-400 to-slate-700",
      members: 276,
    },
  ] as const;

  for (const group of groups) {
    await prisma.communityGroup.upsert({
      where: { id: group.id },
      create: {
        ...group,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
    "cl-group-golf",
    "cl-group-ladies",
    "cl-group-dining",
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
    "cl-group-social",
    "cl-group-golf",
    "cl-group-dining",
    "cl-group-newcomers",
    "cl-group-mens",
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
  const michael = { email: "golf@copperleafgolf.com", name: "Mike Torres" };
  const laura = { email: "golf.assistant@copperleafgolf.com", name: "Jamie Chen" };
  const sophia = { email: "spa@copperleafgolf.com", name: "Nina Patel" };
  const megan = { email: "events@copperleafgolf.com", name: "Morgan Blake" };
  const dining = { email: DINING_EMAIL, name: "Dining Reservations" };
  const elena = { email: PM_EMAIL, name: PM_NAME };
  const patricia = { email: MEMBERSHIP_EMAIL, name: "Chris Coleman" };
  const frederick = { email: PM_EMAIL, name: "Chris Coleman" };
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
      id: "cl-chat-claire-michael",
      createdBy: claire.email,
      participants: [claire, michael],
      messages: [
        {
          author: claire,
          body: "Taylor · can we do a playing lesson Friday? Want to work on approach shots into the elevated greens.",
          hoursAgo: 40,
        },
        {
          author: michael,
          body: "Absolutely. 9:00 tee time on the championship course · we'll focus on club selection and approach shots.",
          hoursAgo: 38,
        },
        {
          author: claire,
          body: "Perfect. Should I warm up on the range first?",
          hoursAgo: 36,
        },
        {
          author: michael,
          body: "Yes · arrive by 8:30. The greens are firm this week, so we'll talk landing areas too.",
          hoursAgo: 2,
        },
      ],
    },
    {
      id: "cl-chat-claire-sophia",
      createdBy: sophia.email,
      participants: [claire, sophia],
      messages: [
        {
          author: sophia,
          body: "Taylor · the practice green is open Saturday at 10 for your the championship course. We'll work on your short-game touch.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Yes please! Do I need to bring balls?",
          hoursAgo: 26,
        },
        {
          author: sophia,
          body: "Basket is ready at the range · just water and a visor. Booked 10:00·11:00.",
          hoursAgo: 24,
        },
      ],
    },
    {
      id: "cl-chat-claire-dining",
      createdBy: claire.email,
      participants: [claire, dining],
      messages: [
        {
          author: claire,
          body: "Hi · table for two in Casual Dining Saturday around 7:00? Anniversary dinner.",
          hoursAgo: 20,
        },
        {
          author: dining,
          body: "Congratulations! You're held Saturday 7:00 in Casual Dining. The snapper and filet are chef's highlights this week.",
          hoursAgo: 18,
        },
        {
          author: claire,
          body: "Wonderful · thank you!",
          hoursAgo: 17,
        },
      ],
    },
    {
      id: "cl-chat-claire-megan",
      createdBy: megan.email,
      participants: [claire, megan],
      messages: [
        {
          author: megan,
          body: "Hi Taylor · saw you booked the championship course. Anything specific to focus on?",
          hoursAgo: 10,
        },
        {
          author: claire,
          body: "Mostly chip shots around the green · I keep leaving them short.",
          hoursAgo: 8,
        },
        {
          author: megan,
          body: "Classic. We'll drill chips on the practice green · you'll feel steadier in one session.",
          hoursAgo: 1,
        },
      ],
    },
    {
      id: "cl-chat-claire-robert",
      createdBy: robert.email,
      participants: [claire, robert],
      messages: [
        {
          author: robert,
          body: "Taylor · member social tonight at 5 if you're free. Loser buys Grill & Bar smoothies?",
          hoursAgo: 9,
        },
        {
          author: claire,
          body: "Tempting! I've got an early tee time in the morning · rain check for the lounge social Friday?",
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
      id: "cl-chat-robert-dining",
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
          body: "Absolutely · Grill & Bar table held for noon. Happy hour starts at 4 if you want to linger.",
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
      id: "cl-chat-claire-laura",
      createdBy: claire.email,
      participants: [claire, laura],
      messages: [
        {
          author: claire,
          body: "Jamie · guest rate for my sister Saturday? She's visiting from Chicago.",
          hoursAgo: 30,
        },
        {
          author: laura,
          body: "Guest accompanied rate applies · I can put you on a 2:30 tee. Course conditions are excellent this week.",
          hoursAgo: 28,
        },
        {
          author: claire,
          body: "Book it please · she'll love the course.",
          hoursAgo: 27,
        },
      ],
    },
    {
      id: "cl-chat-claire-elena",
      createdBy: claire.email,
      participants: [claire, elena],
      messages: [
        {
          author: claire,
          body: "Andrew · my guest pass for Saturday's tee time still shows pending. Can Membership confirm?",
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
      id: "cl-chat-claire-patricia",
      createdBy: patricia.email,
      participants: [claire, patricia],
      messages: [
        {
          author: patricia,
          body: "Taylor · 23101 Copperleaf Blvd is still active. Want the updated listing packet with golf membership notes?",
          hoursAgo: 22,
        },
        {
          author: claire,
          body: "Yes please · neighbors keep asking about lake and course views.",
          hoursAgo: 21,
        },
        {
          author: patricia,
          body: "Packet sent. Call Copperleaf Realty if you need anything before showings.",
          hoursAgo: 19,
        },
      ],
    },
    {
      id: "cl-chat-frederick-claire",
      createdBy: frederick.email,
      participants: [frederick, claire],
      messages: [
        {
          author: frederick,
          body: "Taylor · any member comments for the July board packet? We're covering Pro Shop hours and dining expansions.",
          hoursAgo: 45,
        },
        {
          author: claire,
          body: "Please keep the lounge socials on the calendar through October · they've been wonderful for the community.",
          hoursAgo: 42,
        },
        {
          author: frederick,
          body: "Noted · Dan will add that to the social calendar notes.",
          hoursAgo: 40,
        },
      ],
    },
    {
      id: "cl-chat-james-claire",
      createdBy: james.email,
      participants: [james, claire],
      messages: [
        {
          author: james,
          body: "Taylor · board meeting next week covers pro shop hours and dining expansions. Any feedback from golf members?",
          hoursAgo: 50,
        },
        {
          author: claire,
          body: "Lounge gathering after morning rounds would be great · early appointment slots if possible.",
          hoursAgo: 48,
        },
        {
          author: james,
          body: "Thank you · I'll share that with Marcus and the fitness team.",
          hoursAgo: 46,
        },
      ],
    },
    {
      id: "cl-chat-golf-social",
      kind: "group",
      title: "Twilight Member Social",
      createdBy: megan.email,
      participants: [claire, robert, megan],
      messages: [
        {
          author: megan,
          body: "Round-robin Thursday at 4 across Courts 1·6. All levels · borrow a paddle at the desk if needed.",
          hoursAgo: 15,
        },
        {
          author: robert,
          body: "I'm in. Anyone up for Court 12 after if it frees up?",
          hoursAgo: 12,
        },
        {
          author: claire,
          body: "Yes · see you at 4. Loser buys Grill & Bar smoothies?",
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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

export async function ensureCopperleafDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  await prisma.community.upsert({
    where: { id: COPPERLEAF_COMMUNITY_ID },
    create: {
      id: COPPERLEAF_COMMUNITY_ID,
      name: "Copperleaf Golf Club",
      location: "Bonita Springs, FL",
      residentCount: 1850,
      serviceCount: 2,
      activityCount: 14,
      coverColor: "from-[#1b4332] to-[#95d5b2]",
      logoUrl: brandAssets.communityCopperleaf,
      primaryColor: "#1b4332",
      appDisplayName: "Copperleaf",
      inviteCode: "copperleaf-demo",
    },
    update: {
      name: "Copperleaf Golf Club",
      location: "Bonita Springs, FL",
      logoUrl: brandAssets.communityCopperleaf,
      primaryColor: "#1b4332",
      appDisplayName: "Copperleaf",
      activityCount: 14,
    },
  });

  for (const user of [
    { id: "u-cl-member", email: MEMBER_EMAIL, role: "member", name: MEMBER_NAME },
    { id: "u-cl-member-social", email: SOCIAL_EMAIL, role: "member", name: SOCIAL_NAME },
    { id: "u-cl-pm", email: PM_EMAIL, role: "pm", name: PM_NAME },
    { id: "u-cl-board", email: BOARD_EMAIL, role: "board", name: BOARD_NAME },
  ] as const) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword("password"),
        role: user.role,
        name: user.name,
        communityId: COPPERLEAF_COMMUNITY_ID,
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: COPPERLEAF_COMMUNITY_ID,
      },
    });
  }

  for (const profile of [
    {
      email: MEMBER_EMAIL,
      membershipTier: "golf",
      unit: "23101 Copperleaf Blvd",
      householdAddress: "23101 Copperleaf Blvd, Bonita Springs, FL 33445",
    },
    {
      email: SOCIAL_EMAIL,
      membershipTier: "social",
      unit: "23103 Copperleaf Blvd",
      householdAddress: "23103 Copperleaf Blvd, Bonita Springs, FL 33445",
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

  await ensureMembershipTiersSeeded(COPPERLEAF_COMMUNITY_ID);
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
export async function ensureCopperleafDemoServiceRequests(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedServiceRequests();
}

/** Idempotent Pro Shop apparel catalog for Club Apparel demos. */
export async function ensureCopperleafDemoApparel(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedApparel();
}

/** Idempotent resident marketplace listings. */
export async function ensureCopperleafDemoMarketplace(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedMarketplace();
}

/** Idempotent club blog posts + comments. */
export async function ensureCopperleafDemoBlog(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedBlog();
}

/** Idempotent club newsletters. */
export async function ensureCopperleafDemoNewsletters(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedNewsletters();
}

/** Idempotent community gallery photos. */
export async function ensureCopperleafDemoGallery(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;
  await seedGallery();
}

/** Idempotent member properties + real-estate listings. */
export async function ensureCopperleafDemoPropertiesAndRealEstate(): Promise<void> {
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
      unit: "23101 Copperleaf Blvd",
      title: "Guest pass pending for Saturday Championship Course tee time",
      category: "Access",
      description:
        "Sister visiting Saturday 2:30 on the Championship Course · guest pass still shows pending in Membership.",
      status: "open",
      daysAgo: 1,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "23101 Copperleaf Blvd",
      title: "Irrigation overspray on Copperleaf Blvd driveway",
      category: "Landscaping",
      description:
        "Common-area heads near 23101 Copperleaf Blvd soak the paver driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 4,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "23101 Copperleaf Blvd",
      title: "Championship Course cart path near hole 7",
      category: "Amenities",
      description: "Cart path washout near Championship Course hole 7 · needs fill before weekend play.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "23103 Copperleaf Blvd",
      title: "Clubhouse terrace string lights out",
      category: "Maintenance",
      description: "Half the terrace string lights are dark after dusk on the west side.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: SOCIAL_EMAIL,
      memberName: SOCIAL_NAME,
      unit: "23103 Copperleaf Blvd",
      title: "Pro Shop bag storage locker stuck",
      category: "Amenities",
      description: "Locker 14 in the pro shop bag room will not open · key turns but latch sticks.",
      status: "resolved",
      daysAgo: 7,
    },
    {
      memberEmail: MEMBER_EMAIL,
      memberName: MEMBER_NAME,
      unit: "23101 Copperleaf Blvd",
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
  const proShop = "Copperleaf Pro Shop";
  const apparel = [
    {
      id: "cl-apparel-polo-navy",
      name: "Club Polo · Navy",
      description: "Performance pique polo with embroidered Copperleaf crest.",
      price: 58,
      category: "Polo",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/cl-apparel-polo-navy.png",
    },
    {
      id: "cl-apparel-ladies-polo",
      name: "Ladies Sleeveless Polo · White",
      description: "Moisture-wicking sleeveless polo with club crest · ideal for warm Copperleaf rounds.",
      price: 52,
      category: "Polo",
      sizesJson: '["XS","S","M","L","XL"]',
      imageUrl: "/brand/apparel/cl-apparel-ladies-polo.png",
    },
    {
      id: "cl-apparel-quarter-zip",
      name: "Member Quarter-Zip · Heather Grey",
      description: "Lightweight layer for cool Copperleaf mornings on the championship course.",
      price: 78,
      category: "Outerwear",
      sizesJson: '["S","M","L","XL","XXL"]',
      imageUrl: "/brand/apparel/cl-apparel-quarter-zip.png",
    },
    {
      id: "cl-apparel-cap",
      name: "Performance Cap · Navy",
      description: "Structured adjustable cap with embroidered Copperleaf crest.",
      price: 32,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/cl-apparel-cap-navy.png",
    },
    {
      id: "cl-apparel-visor",
      name: "Tour Visor · Black",
      description: "Lightweight tour visor for the championship course.",
      price: 28,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/cl-apparel-visor-black.png",
    },
    {
      id: "cl-apparel-towel",
      name: "Crest Golf Towel",
      description: "Microfiber towel with carabiner clip and embroidered crest.",
      price: 24,
      category: "Accessories",
      sizesJson: '["One Size"]',
      imageUrl: "/brand/apparel/cl-apparel-towel.png",
    },
  ] as const;

  for (const item of apparel) {
    await prisma.apparelProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      communityId: COPPERLEAF_COMMUNITY_ID,
      orderedByEmail: MEMBER_EMAIL,
      notes: "Member demo · championship tournament kit",
    },
  });
  if (!existingOrder) {
    await prisma.apparelOrder.create({
      data: {
        communityId: COPPERLEAF_COMMUNITY_ID,
        vendorName: proShop,
        orderType: "member",
        orderedByEmail: MEMBER_EMAIL,
        orderedByName: MEMBER_NAME,
        itemsJson: JSON.stringify([
          {
            productId: "cl-apparel-polo-navy",
            name: "Club Polo · Navy",
            size: "M",
            qty: 1,
            unitPrice: 58,
          },
          {
            productId: "cl-apparel-cap",
            name: "Performance Cap · Navy",
            size: "One Size",
            qty: 1,
            unitPrice: 32,
          },
        ]),
        total: 90,
        notes: "Member demo · championship tournament kit",
        status: "confirmed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function seedMarketplace() {
  const listings = [
    {
      id: "cl-marketplace-golf-balls",
      title: "Titleist Pro V1 Dozen",
      description: "Unopened dozen · switching to Left Dash. Pickup on Copperleaf after golf.",
      price: 42,
      category: "Golf",
      seller: MEMBER_NAME,
      unit: "23101 Copperleaf Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 1,
    },
    {
      id: "cl-marketplace-patio",
      title: "Lanai Dining Set, 6 Chairs",
      description: "Weather-resistant table and six chairs. Local pickup on Copperleaf Blvd only.",
      price: 295,
      category: "Home",
      seller: SOCIAL_NAME,
      unit: "23103 Copperleaf Blvd",
      imageUrl: brandAssets.marketplacePatioSet,
      daysAgo: 2,
    },
    {
      id: "cl-marketplace-peloton",
      title: "Peloton Bike · Like New",
      description: "Barely used Bike+ with mat. Moving and need it gone this week.",
      price: 625,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "4200 Military Trail",
      imageUrl: brandAssets.marketplacePeloton,
      daysAgo: 3,
    },
    {
      id: "cl-marketplace-junior-set",
      title: "Junior Golf Set",
      description: "Lightly used junior golf set for ages 8·12. Fresh grips and bag included.",
      price: 32,
      category: "Golf",
      seller: "Jamie Chen",
      unit: "3650 Copperleaf Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 4,
    },
    {
      id: "cl-marketplace-polo",
      title: "Copperleaf Golf Club Polo · Men's Large",
      description: "Navy performance polo with embroidered crest. Worn twice; like new.",
      price: 30,
      category: "Apparel",
      seller: MEMBER_NAME,
      unit: "23101 Copperleaf Blvd",
      imageUrl: "/brand/apparel/cl-apparel-polo-navy.png",
      daysAgo: 5,
    },
    {
      id: "cl-marketplace-callaway-junior",
      title: "Callaway Edge Junior Set",
      description: "Junior golf set · lightly used, great for range sessions.",
      price: 85,
      category: "Golf",
      seller: SOCIAL_NAME,
      unit: "23103 Copperleaf Blvd",
      imageUrl: brandAssets.marketplaceGolfBalls,
      daysAgo: 6,
    },
  ] as const;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-blog-five-courses",
      title: "Playing the championship course this season",
      excerpt:
        "Director of Golf Mike Torres shares tips for Copperleaf's 18 holes.",
      body: "Copperleaf members enjoy 18 holes · 18-hole championship golf course at The Brooks. Book early mornings for the coolest conditions and ask the pro shop about member events.",
      author: "Mike Torres, PGA",
      category: "Golf",
      daysAgo: 1,
    },
    {
      id: "cl-blog-breezeway",
      title: "Grill & Bar favorites after golf",
      excerpt:
        "Breakfast, lunch, and small plates from through early evening.",
      body: "After a morning round, Grill & Bar is the easy stop for light plates and cold drinks. Casual Dining picks up lunch daily · reserve through Dining in the member app.",
      author: "Copperleaf Dining",
      category: "Dining",
      daysAgo: 3,
    },
    {
      id: "cl-blog-golf-community",
      title: "18 holes, one thriving golf community",
      excerpt:
        "Spa recovery evenings and short-game clinics on the practice greens.",
      body: "With 18 holes across the championship course · championship golf at The Brooks · Copperleaf runs member events so everyone meets more members. Book a tee time in the app, arrive early for the practice putting and chipping, and stay for Grill & Bar afterward.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 5,
    },
    {
      id: "cl-blog-golf-tips",
      title: "Practice range & greens · warm-up tips",
      excerpt: "Get the most from Copperleaf's practice facilities before you tee off.",
      body: "Warm up on the practice putting and chipping before the championship course rounds. Book lessons mid-morning when the greens are firmest. Jamie Chen runs junior clinics on weekends.",
      author: "Jamie Chen",
      category: "Golf",
      daysAgo: 7,
    },
    {
      id: "cl-blog-lifestyle",
      title: "Pro Shop summer programming",
      excerpt:
        "Range clinics, lounge gatherings, and Pro Shop hours for the warm season.",
      body: "Warm up before tee times on the practice putting and chipping, then recover at Grill & Bar. Group clinics fill quickly · check the calendar. The Pro Shop opens early for apparel and equipment.",
      author: "Pro Shop Team",
      category: "Golf",
      daysAgo: 9,
    },
    {
      id: "cl-blog-welcome",
      title: "Welcome to Copperleaf Golf Club",
      excerpt:
        "Simple ways to settle in · golf, dining, and community groups.",
      body: "Start with a casual meal at Casual Dining or Grill & Bar, join a community group in the app, and book one clinic on the calendar. Membership can help with guest passes and real-estate questions.",
      author: "Chris Coleman",
      category: "Community",
      daysAgo: 12,
    },
  ] as const;

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-blog-comment-golf-1",
      postId: "cl-blog-five-courses",
      author: MEMBER_NAME,
      body: "The course at dawn is unbeatable · thanks for the tips, Mike!",
    },
    {
      id: "cl-blog-comment-golf-2",
      postId: "cl-blog-five-courses",
      author: SOCIAL_NAME,
      body: "Championship Course was in perfect shape last weekend.",
    },
    {
      id: "cl-blog-comment-breezeway-1",
      postId: "cl-blog-breezeway",
      author: MEMBER_NAME,
      body: "Grill & Bar after golf is our Saturday ritual now.",
    },
    {
      id: "cl-blog-comment-community-1",
      postId: "cl-blog-golf-community",
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
      id: "cl-newsletter-july-2026",
      title: "Copperleaf Golf Club Summer Update · July 2026",
      summary:
        "the championship course in peak condition, lounge socials, and July calendar highlights.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at Copperleaf Golf Club. Our 18 holes · 18-hole championship course, championship golf at The Brooks · are in excellent condition. Early tee times remain the coolest window for 18 holes.",
        "",
        "This month:",
        "· Casual Dining (lunch Tue·Sun) and Grill & Bar (sunrise·sunset) · reserve in Dining",
        "· Clubhouse terrace social with live music",
        "· Spa Recovery Evening · book through the pro shop",
        "",
        "Questions: Membership · (239) 390-2030 · 23101 Copperleaf Blvd, Bonita Springs, FL 33445 · membership@copperleafgolf.com · https://www.copperleafgolf.com/",
        "",
        "· Chris Coleman",
        "General Manager",
      ].join("\n"),
      daysAgo: 2,
    },
    {
      id: "cl-newsletter-golf-roundup",
      title: "Golf Roundup · Championship Course",
      summary:
        "Course notes from Mike Torres, practice putting and chipping clinics, and apparel.",
      body: [
        "Golf members,",
        "",
        "Golf: the championship course is playing firm and fast. Warm up on the practice putting and chipping, then book lessons with Mike Torres or Jamie Chen.",
        "",
        "Pro Shop: Crest polos, caps, and towels stocked · order through Club Apparel in the app · (239) 390-2030.",
        "",
        "· Golf Shop",
      ].join("\n"),
      daysAgo: 8,
    },
    {
      id: "cl-newsletter-dining",
      title: "Dining at Copperleaf · Midsummer Menus",
      summary:
        "Casual Dining/Lounge lunch daily · Casual Dining seasonal.",
      body: [
        "Dining members,",
        "",
        "Summer menus are live across Casual Dining (lunch Tue·Sun) and Grill & Bar (sunrise·sunset). After golf, Grill & Bar is the easy stop. Lunch reservations for Casual Dining book quickly on weekends.",
        "",
        "There is no minimum spending requirement at the club · we offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "· Copperleaf Dining",
        "dining@copperleafgolf.com",
      ].join("\n"),
      daysAgo: 14,
    },
    {
      id: "cl-newsletter-membership",
      title: "Membership Notes & Community Spotlight",
      summary:
        "Guest passes, directory updates, Copperleaf Realty, and connecting in the app.",
      body: [
        "Members,",
        "",
        "Welcome to our newest Copperleaf neighbors. Use Directory, Groups, Marketplace, and Documents in the app to settle in. Guest pass requests can be submitted as Service Requests or through Membership.",
        "",
        "Copperleaf does not require any minimum spending at the club. We offer a wide variety of dining experiences, frequent menu changes, and social events so members choose to dine with us.",
        "",
        "For Membership and real-estate questions, contact Membership at membership@copperleafgolf.com · (239) 390-2030 · 23101 Copperleaf Blvd, Bonita Springs, FL 33445.",
        "",
        "Thank you for making Copperleaf Golf Club a vibrant member community.",
        "",
        "· Club Administration · Chris Coleman, General Manager",
      ].join("\n"),
      daysAgo: 21,
    },
  ] as const;

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { id: newsletter.id },
      create: {
        id: newsletter.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-gallery-east-dusk",
      title: "Championship Course 18th at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Mike Torres",
      daysAgo: 1,
    },
    {
      id: "cl-gallery-clubhouse",
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
      daysAgo: 2,
    },
    {
      id: "cl-gallery-range",
      title: "Practice range warm-up",
      category: "Golf",
      url: brandAssets.amenityDrivingRange,
      uploadedBy: "Jamie Chen",
      daysAgo: 3,
    },
    {
      id: "cl-gallery-west",
      title: "Championship Course fairways",
      category: "Golf",
      url: brandAssets.featuredGolf,
      uploadedBy: "Mike Torres",
      daysAgo: 4,
    },
    {
      id: "cl-gallery-lounge",
      title: "Grill & Bar",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: SOCIAL_NAME,
      daysAgo: 5,
    },
    {
      id: "cl-gallery-proshop",
      title: "Pro Shop",
      category: "Golf",
      url: brandAssets.amenityClubhouse,
      uploadedBy: "Pro Shop Team",
      daysAgo: 6,
    },
    {
      id: "cl-gallery-dining",
      title: "Casual Dining",
      category: "Dining",
      url: brandAssets.featuredDining,
      uploadedBy: "Copperleaf Dining",
      daysAgo: 7,
    },
  ] as const;

  for (const image of images) {
    await prisma.galleryImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        communityId: COPPERLEAF_COMMUNITY_ID,
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
      id: "cl-property-claire-primary",
      userEmail: MEMBER_EMAIL,
      address: "23101 Copperleaf Blvd, Bonita Springs, FL 33445",
      type: "Primary residence",
      owner: true,
    },
    {
      id: "cl-property-claire-guest",
      userEmail: MEMBER_EMAIL,
      address: "4200 Military Trail, Bonita Springs, FL 33445",
      type: "Investment property",
      owner: true,
    },
    {
      id: "cl-property-robert-primary",
      userEmail: SOCIAL_EMAIL,
      address: "23103 Copperleaf Blvd, Bonita Springs, FL 33445",
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
  const patriciaEmail = "membership@copperleafgolf.com";
  const listings = [
    {
      id: "cl-real-estate-bay-harbor",
      memberEmail: patriciaEmail,
      title: "Copperleaf Estate with Lake Views",
      description:
        "Updated four-bedroom estate with lanai, pool, and golf cart garage. Course views and easy access to the Championship Course. Listed with Membership · membership@copperleafgolf.com.",
      type: "sale",
      price: 1895000,
      beds: 4,
      baths: 3.5,
      sqft: 3420,
      unit: "3700 Copperleaf Blvd",
      color: "from-sky-600 to-teal-800",
      images: [brandAssets.amenityLodging, brandAssets.galleryClubhouseTerrace],
      daysAgo: 2,
    },
    {
      id: "cl-real-estate-country-club",
      memberEmail: patriciaEmail,
      title: "Copperleaf Blvd Villa",
      description:
        "Bright three-bedroom villa with screened lanai and marsh backdrop. Walking distance to the championship course.",
      type: "sale",
      price: 875000,
      beds: 3,
      baths: 2.5,
      sqft: 2180,
      unit: "3720 Copperleaf Blvd",
      color: "from-emerald-500 to-slate-700",
      images: [brandAssets.amenityClubhouse, brandAssets.featuredDining],
      daysAgo: 4,
    },
    {
      id: "cl-real-estate-marsh",
      memberEmail: patriciaEmail,
      title: "Military Trail Custom Home",
      description:
        "Spacious five-bedroom custom home overlooking lakes near the championship course. Private pool, outdoor kitchen, and three-car garage.",
      type: "sale",
      price: 2250000,
      beds: 5,
      baths: 4.5,
      sqft: 4100,
      unit: "4200 Military Trail",
      color: "from-[#0c4a6e] to-emerald-700",
      images: [brandAssets.gallery18thGreenDusk, brandAssets.featuredDining],
      daysAgo: 6,
    },
    {
      id: "cl-real-estate-creekside-rent",
      memberEmail: patriciaEmail,
      title: "Furnished Seasonal Rental · Copperleaf Blvd",
      description:
        "Turnkey three-bedroom seasonal rental near the Pro Shop. Includes golf cart parking and preferred dining access. Available through April.",
      type: "rent",
      price: 9500,
      beds: 3,
      baths: 2.5,
      sqft: 2280,
      unit: "3650 Copperleaf Blvd",
      color: "from-cyan-400 to-blue-700",
      images: [brandAssets.amenityLodging, brandAssets.featuredGolf],
      daysAgo: 8,
    },
    {
      id: "cl-real-estate-naples",
      memberEmail: patriciaEmail,
      title: "Pro Shop Adjacent Condo",
      description:
        "Two-bedroom condo steps from the Pro Shop · lock-and-leave for snowbirds with full golf and dining access.",
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
        communityId: COPPERLEAF_COMMUNITY_ID,
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
