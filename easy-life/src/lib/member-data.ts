import type { FlexInventoryOption } from "@/lib/rental-flex";
import {
  IRON_LAKE_GOLF_CLUBS_ITEM_ID,
  IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY,
} from "@/lib/rental-flex";

export interface MemberProfile {
  name: string;
  email: string;
  phone: string;
  unit: string;
  community: string;
  joined: string;
  directoryVisible: boolean;
  vehicles: { id: string; make: string; model: string; color: string; plate: string }[];
  pets: { id: string; name: string; type: string; breed: string }[];
}

export interface Amenity {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
}

export interface MemberBooking {
  id: string;
  amenity: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
}

export interface MemberEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: "community" | "board" | "social" | "maintenance";
}

export interface MemberDocument {
  id: string;
  title: string;
  category: "legal" | "minutes" | "financial" | "policy";
  date: string;
  size: string;
}

export interface DuesItem {
  id: string;
  description: string;
  amount: number;
  due: string;
  status: "paid" | "due" | "overdue";
  paid?: string;
}

export interface MemberRequest {
  id: string;
  title: string;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  date: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  unit: string;
  role: string;
  email: string;
  visible: boolean;
}

export const memberProfile: MemberProfile = {
  name: "Member",
  email: "member@club.local",
  phone: "",
  unit: "",
  community: "Your Club",
  joined: "",
  directoryVisible: true,
  vehicles: [],
  pets: [],
};

export const amenities: Amenity[] = [
  {
    id: "a1",
    name: "Tennis Court",
    description: "Regulation court with evening lighting.",
    fee: 15,
    schedule: "Daily 7AM – 9PM",
  },
  {
    id: "a2",
    name: "Clubhouse",
    description: "Private event space for up to 50 guests.",
    fee: 75,
    schedule: "Reservations required",
  },
  {
    id: "a3",
    name: "Fitness Center",
    description: "Cardio & strength equipment, fob access.",
    fee: 0,
    schedule: "24/7 for residents",
  },
  {
    id: "a4",
    name: "Pool & Spa",
    description: "Heated pool and spa with lounge seating.",
    fee: 0,
    schedule: "Daily 6AM – 10PM",
  },
];

export const memberBookings: MemberBooking[] = [
  { id: "b1", amenity: "Tennis Court", date: "2026-06-24", time: "10:00 – 11:00", status: "confirmed" },
  { id: "b2", amenity: "Clubhouse", date: "2026-07-12", time: "14:00 – 18:00", status: "pending" },
];

export const memberEvents: MemberEvent[] = [
  {
    id: "e1",
    title: "Board Meeting",
    description: "Monthly board meeting — budget review and updates.",
    date: "2026-06-25",
    time: "6:00 PM",
    location: "Community Center Room A",
    category: "board",
  },
  {
    id: "e2",
    title: "Summer Pool Party",
    description: "Annual social event with food, music, and games.",
    date: "2026-07-04",
    time: "12:00 PM",
    location: "Pool Deck",
    category: "social",
  },
  {
    id: "e3",
    title: "Landscaping Maintenance",
    description: "Scheduled grounds maintenance — limited parking in Lot B.",
    date: "2026-06-28",
    time: "8:00 AM",
    location: "Building Perimeter",
    category: "maintenance",
  },
  {
    id: "e4",
    title: "HOA Annual Meeting",
    description: "Annual membership meeting with reserve fund vote.",
    date: "2026-07-15",
    time: "7:00 PM",
    location: "Community Center",
    category: "community",
  },
];

export const memberDocuments: MemberDocument[] = [
  { id: "d1", title: "Declaration of Covenants", category: "legal", date: "2024-01-10", size: "2.4 MB" },
  { id: "d2", title: "Board Meeting Minutes — May 2026", category: "minutes", date: "2026-06-05", size: "845 KB" },
  { id: "d3", title: "2026 Annual Budget", category: "financial", date: "2026-01-15", size: "1.2 MB" },
  { id: "d4", title: "Emergency Procedures Guide", category: "policy", date: "2025-11-20", size: "560 KB" },
  { id: "d5", title: "Community Rules & Regulations", category: "policy", date: "2025-08-01", size: "980 KB" },
];

export const dues: DuesItem[] = [
  { id: "pay1", description: "June 2026 HOA Dues", amount: 485, due: "2026-06-01", status: "paid", paid: "2026-05-28" },
  { id: "pay2", description: "July 2026 HOA Dues", amount: 485, due: "2026-07-01", status: "due" },
  { id: "pay3", description: "Special Assessment — Roof", amount: 1200, due: "2026-08-15", status: "due" },
];

export const memberRequests: MemberRequest[] = [
  {
    id: "sr1",
    title: "Kitchen faucet leak",
    category: "Plumbing",
    description: "Slow drip under the kitchen sink.",
    status: "in_progress",
    date: "2026-06-20",
  },
  {
    id: "sr2",
    title: "HVAC not cooling",
    category: "HVAC",
    description: "AC running but not cooling the master bedroom.",
    status: "open",
    date: "2026-06-22",
  },
];

export const directory: DirectoryEntry[] = [
  { id: "u1", name: "Member", unit: "Lot 12", role: "Member", email: "member.demo@example.com", visible: true },
  { id: "u2", name: "James Rodriguez", unit: "101A", role: "Board Member", email: "board.member@example.com", visible: true },
  { id: "u3", name: "Emily Chen", unit: "305C", role: "Member", email: "emily.chen@example.com", visible: true },
  { id: "u4", name: "Michael Thompson", unit: "112D", role: "Property Manager", email: "pm.demo@example.com", visible: true },
  { id: "u5", name: "Lisa Park", unit: "408A", role: "Member", email: "lisa.park@example.com", visible: false },
];

export const gallery = [
  { id: "g1", title: "Sunset over the pool", category: "Community", date: "2026-05-12", color: "from-brand-400 to-brand-600" },
  { id: "g2", title: "Spring landscaping", category: "Grounds", date: "2026-04-03", color: "from-emerald-400 to-teal-600" },
  { id: "g3", title: "Holiday decorating", category: "Events", date: "2025-12-20", color: "from-sky-400 to-indigo-600" },
  { id: "g4", title: "Fitness renovation", category: "Amenities", date: "2026-02-18", color: "from-cyan-400 to-blue-600" },
];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  from: string;
  date: string;
  priority: "normal" | "important";
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: number;
  color: string;
  joined: boolean;
}

export interface GroupMessage {
  id: string;
  author: string;
  body: string;
  time: string;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  unit: string;
  date: string;
  color: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  date: string;
  readMinutes: number;
}

export const announcements: Announcement[] = [
  {
    id: "an1",
    title: "Pool deck resurfacing — July 6–8",
    body: "The pool will be closed for resurfacing July 6–8. The spa remains open. Thank you for your patience.",
    from: "Property Management",
    date: "2026-06-23",
    priority: "important",
  },
  {
    id: "an2",
    title: "New gate access codes next week",
    body: "Gate codes rotate Monday. Updated codes have been emailed to all registered residents.",
    from: "Board of Directors",
    date: "2026-06-21",
    priority: "normal",
  },
  {
    id: "an3",
    title: "Summer social committee sign-ups open",
    body: "Want to help plan community events? Join the social committee — reply or stop by the office.",
    from: "Social Committee",
    date: "2026-06-18",
    priority: "normal",
  },
];

export const groups: Group[] = [
  { id: "gr1", name: "Tennis Club", description: "Matches, ladders, and social play.", members: 34, color: "from-emerald-400 to-teal-600", joined: true },
  { id: "gr2", name: "Book Club", description: "Monthly reads and discussion.", members: 18, color: "from-brand-400 to-brand-600", joined: true },
  { id: "gr3", name: "Garden Committee", description: "Community garden plots and tips.", members: 12, color: "from-lime-400 to-green-600", joined: false },
  { id: "gr4", name: "Pickleball Crew", description: "Open play most mornings.", members: 41, color: "from-amber-400 to-orange-600", joined: false },
];

export const groupMessages: GroupMessage[] = [
  { id: "gm1", author: "James Rodriguez", body: "Court 2 is open Saturday at 9 — who's in?", time: "9:14 AM" },
  { id: "gm2", author: "Emily Chen", body: "I'm in! Bringing extra balls.", time: "9:22 AM" },
  { id: "gm3", author: "Member", body: "Count me in too 🎾", time: "9:30 AM" },
];

export const listings: Listing[] = [
  { id: "l1", title: "Peloton Bike (like new)", price: 650, category: "Fitness", seller: "Emily Chen", unit: "305C", date: "2026-06-22", color: "from-brand-400 to-brand-600" },
  { id: "l2", title: "Patio dining set, 6 chairs", price: 320, category: "Furniture", seller: "Greg Sherman", unit: "210A", date: "2026-06-20", color: "from-amber-400 to-orange-600" },
  { id: "l3", title: "Kids' bicycle, 20\"", price: 45, category: "Kids", seller: "Lisa Park", unit: "408A", date: "2026-06-19", color: "from-emerald-400 to-teal-600" },
  { id: "l4", title: "Golf clubs + bag", price: 280, category: "Sports", seller: "Michael Carter", unit: "118B", date: "2026-06-17", color: "from-sky-400 to-indigo-600" },
];

export const blogPosts: BlogPost[] = [
  { id: "bp1", title: "5 ways to make the most of summer at Oceanside", excerpt: "From sunrise tennis to poolside movie nights, here's how neighbors are enjoying the season.", author: "Social Committee", category: "Lifestyle", date: "2026-06-20", readMinutes: 4 },
  { id: "bp2", title: "Meet your 2026 Board members", excerpt: "Get to know the volunteers steering the community this year and what they're focused on.", author: "Board of Directors", category: "Community", date: "2026-06-12", readMinutes: 6 },
  { id: "bp3", title: "Water-wise landscaping tips for Florida summers", excerpt: "Keep your patio garden thriving while conserving water during peak heat.", author: "Garden Committee", category: "Tips", date: "2026-06-05", readMinutes: 3 },
];

export const newsletters = [
  { id: "nl1", title: "Oceanside Monthly — June 2026", date: "2026-06-01", summary: "Pool party details, new vendors, and committee updates." },
  { id: "nl2", title: "Oceanside Monthly — May 2026", date: "2026-05-01", summary: "Spring cleanup recap and budget highlights." },
  { id: "nl3", title: "Oceanside Monthly — April 2026", date: "2026-04-01", summary: "New fitness equipment and tennis ladder kickoff." },
];

export const favorites = [
  { id: "f1", label: "Pay HOA dues", href: "/member/payments" },
  { id: "f2", label: "Book Tennis Court", href: "/member/bookings" },
  { id: "f3", label: "Submit service request", href: "/member/service-requests" },
  { id: "f4", label: "Community calendar", href: "/member/calendar" },
];

export const properties = [
  { id: "pr1", address: "Primary residence", type: "Primary residence", owner: true },
  { id: "pr2", address: "Rental property", type: "Rental", owner: true },
];

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  hours: string;
  color: string;
}

export const restaurants: Restaurant[] = [
  { id: "rst1", name: "The Greenside Grill", cuisine: "American · Casual", hours: "11AM – 9PM", color: "from-amber-400 to-orange-600" },
  { id: "rst2", name: "Marina Sushi Bar", cuisine: "Japanese", hours: "5PM – 10PM", color: "from-brand-400 to-brand-600" },
];

export const menuItems = [
  { id: "mi1", name: "Clubhouse Burger", price: 16, category: "Entree" },
  { id: "mi2", name: "Caesar Salad", price: 12, category: "Salad" },
  { id: "mi3", name: "Grilled Salmon", price: 24, category: "Entree" },
  { id: "mi4", name: "Ceviche Mixto", price: 18, category: "Seafood" },
  { id: "mi5", name: "Mint Ice Cream Cup", price: 8, category: "Dessert" },
];

export interface Tournament {
  id: string;
  title: string;
  sport: string;
  date: string;
  spots: number;
  registered: number;
  color: string;
}

export const tournaments: Tournament[] = [
  { id: "t1", title: "Summer Tennis Open", sport: "Tennis", date: "2026-07-11", spots: 32, registered: 24, color: "from-emerald-400 to-teal-600" },
  { id: "t2", title: "Pickleball Doubles", sport: "Pickleball", date: "2026-07-19", spots: 16, registered: 16, color: "from-amber-400 to-orange-600" },
  { id: "t3", title: "Member Golf Scramble", sport: "Golf", date: "2026-08-02", spots: 40, registered: 18, color: "from-brand-400 to-brand-600" },
];

export const rewards = {
  points: 1240,
  tier: "Gold",
  nextTier: "Platinum",
  toNext: 260,
  history: [
    { id: "rw1", label: "Online dues payment", points: 50, date: "2026-06-01" },
    { id: "rw2", label: "Booked Clubhouse", points: 75, date: "2026-05-20" },
    { id: "rw3", label: "Referred a neighbor", points: 200, date: "2026-05-04" },
  ],
  perks: [
    { id: "pk1", label: "10% off amenity fees", cost: 500 },
    { id: "pk2", label: "Free clubhouse hour", cost: 800 },
    { id: "pk3", label: "Priority booking window", cost: 1200 },
  ],
};

export type RentalPricingUnit = "day" | "night" | "hour";

export interface RentalItem {
  id: string;
  name: string;
  category: string;
  pricePerDay: number;
  available: number;
  color: string;
  /** Defaults to day (equipment). Tower lodging uses night/hour. */
  pricingUnit?: RentalPricingUnit;
  note?: string;
  /** When set, members must pick a shaft flex; inventory is per flex. */
  flexOptions?: FlexInventoryOption[];
}

/** Default equipment catalog (shared Easy Life communities). */
export const rentalItems: RentalItem[] = [
  { id: "re1", name: "Golf Clubs (full set)", category: "Golf", pricePerDay: 25, available: 4, color: "from-emerald-400 to-green-600" },
  { id: "re2", name: "Electric Golf Cart", category: "Golf", pricePerDay: 40, available: 2, color: "from-lime-400 to-emerald-600" },
  { id: "re3", name: "Tennis Racquet", category: "Tennis", pricePerDay: 8, available: 10, color: "from-brand-400 to-brand-600" },
  { id: "re4", name: "Pickleball Paddle Set", category: "Pickleball", pricePerDay: 10, available: 6, color: "from-amber-400 to-orange-600" },
  { id: "re5", name: "Beach Cruiser Bike", category: "Cycling", pricePerDay: 15, available: 5, color: "from-cyan-400 to-blue-600" },
  { id: "re6", name: "Kayak (single)", category: "Water", pricePerDay: 30, available: 3, color: "from-sky-400 to-indigo-600" },
  { id: "re-cabana", name: "Pool Cabana", category: "Pool", pricePerDay: 40, available: 4, color: "from-teal-400 to-cyan-600" },
];

/** The Club at Iron Lake — Tower Lodging & Event Space (May 2026 schedule). */
export const ironLakeTowerLodging: RentalItem[] = [
  {
    id: "il-tower-sky",
    name: "5th Floor Sky Suite",
    category: "Tower Lodging",
    pricePerDay: 550,
    available: 1,
    color: "from-stone-600 to-amber-800",
    pricingUnit: "night",
  },
  {
    id: "il-tower-king",
    name: "3rd Floor Executive King Bedroom",
    category: "Tower Lodging",
    pricePerDay: 375,
    available: 4,
    color: "from-stone-500 to-stone-700",
    pricingUnit: "night",
  },
  {
    id: "il-tower-dual",
    name: "3rd Floor Dual Executive King Reservation",
    category: "Tower Lodging",
    pricePerDay: 575,
    available: 2,
    color: "from-amber-700 to-stone-800",
    pricingUnit: "night",
    note: "Two Executive King bedrooms reserved together.",
  },
  {
    id: "il-tower-event",
    name: "4th Floor Event Space",
    category: "Event Space",
    pricePerDay: 150,
    available: 1,
    color: "from-slate-600 to-stone-900",
    pricingUnit: "hour",
    note: "Bespoke charge for special events greater than 3 hours.",
  },
];

/** Iron Lake racquet equipment available for member rental. */
export const ironLakeEquipmentRentals: RentalItem[] = [
  {
    id: "il-tennis-ball-machine",
    name: "Tennis Ball Machine",
    category: "Tennis",
    pricePerDay: 25,
    available: 2,
    color: "from-brand-400 to-emerald-700",
    pricingUnit: "hour",
    note: "On-court ball machine rental. Pair with a tennis court reservation.",
  },
];

/** IronCrest golf shop — full sets tracked by shaft flex inventory. */
export const ironLakeGolfClubRentals: RentalItem[] = [
  {
    id: IRON_LAKE_GOLF_CLUBS_ITEM_ID,
    name: "IronCrest Golf Clubs (full set)",
    category: "Golf",
    pricePerDay: 45,
    available: IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY.reduce((n, o) => n + o.inventory, 0),
    color: "from-emerald-500 to-teal-800",
    pricingUnit: "day",
    note: "Choose a shaft flex. Each flex has a limited number of sets — booking fails when that flex is fully rented for your dates.",
    flexOptions: IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY,
  },
];

/** Generic equipment catalog ids that Iron Lake replaces with club-specific offerings. */
export const IRON_LAKE_REPLACED_RENTAL_IDS = new Set(["re1"]);

export function rentalUnitLabel(item: RentalItem): string {
  const unit = item.pricingUnit ?? "day";
  switch (unit) {
    case "night":
      return "night";
    case "hour":
      return "hour";
    case "day":
      return "day";
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

export interface RealEstateListing {
  id: string;
  title: string;
  type: "sale" | "rent";
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  unit: string;
  color: string;
}

export const realEstate: RealEstateListing[] = [
  { id: "rl1", title: "Lakeview 2BR Condo", type: "sale", price: 415000, beds: 2, baths: 2, sqft: 1180, unit: "Unit 612", color: "from-brand-400 to-brand-600" },
  { id: "rl2", title: "Garden Villa 3BR", type: "sale", price: 529000, beds: 3, baths: 2, sqft: 1620, unit: "Villa 14", color: "from-emerald-400 to-teal-600" },
  { id: "rl3", title: "Furnished 1BR — seasonal", type: "rent", price: 2400, beds: 1, baths: 1, sqft: 720, unit: "Unit 305", color: "from-amber-400 to-orange-600" },
  { id: "rl4", title: "Penthouse 3BR, ocean view", type: "rent", price: 4800, beds: 3, baths: 3, sqft: 2100, unit: "PH-2", color: "from-sky-400 to-indigo-600" },
];

export const faqs = [
  { q: "How do I book an amenity?", a: "Go to Bookings, choose an amenity, pick a date/time, and submit your request." },
  { q: "How do I pay my HOA dues?", a: "Open Payments and use the Pay button or QuickPay to settle outstanding balances." },
  { q: "How do I submit a maintenance request?", a: "Use Service Requests to describe the issue; property management is notified." },
  { q: "How do I hide my info from the directory?", a: "Toggle directory visibility off in your Profile." },
];
