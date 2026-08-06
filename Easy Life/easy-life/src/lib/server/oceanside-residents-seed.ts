import { brandAssets } from "@/lib/brand-assets";
import { amenityRequiresManagementApproval } from "@/lib/amenity-booking-policy";
import {
  OCEANSIDE_BOARD,
  OCEANSIDE_CONTACT,
} from "@/lib/server/oceanside-directory-data";
import { syncOceansideUnitHoaFees } from "@/lib/server/hoa-dues";
import { hashPassword } from "@/lib/server/password";
import { prisma } from "@/lib/server/prisma";

export const OCEANSIDE_COMMUNITY_ID = "oceanside-residents";
/** Removed from go-live seed — partners self-enroll. Kept only to delete old rows. */
const LEGACY_PARTNER_MEMBER_EMAIL = "dlms6768@gmail.com";

const DEMO_PASSWORD = "password";
const DOMAIN = "oceansideresidents.com";
const ADMIN_EMAIL = `admin.demo@${DOMAIN}`;
const SOCIAL_EMAIL = `social.committee@${DOMAIN}`;

const DEMO_USERS = [
  {
    id: "u-or-board",
    email: `board.demo@${DOMAIN}`,
    role: "board",
    name: "Board Member",
  },
  {
    id: "u-or-pm",
    email: `pm.demo@${DOMAIN}`,
    role: "pm",
    name: "Property Manager",
  },
  {
    id: "u-or-admin",
    email: ADMIN_EMAIL,
    role: "admin",
    name: "Super Admin",
  },
  {
    id: "u-or-social",
    email: SOCIAL_EMAIL,
    role: "member",
    name: "Social Committee",
  },
] as const;

/** Always appear first in Messages compose for residents. */
export const OCEANSIDE_MESSAGE_CONTACTS = [
  {
    id: "or-cm-msg-admin",
    name: "Super Admin",
    role: "Super Admin",
    email: ADMIN_EMAIL,
    userRole: "admin",
  },
  {
    id: "or-cm-msg-pm",
    name: "Property Manager",
    role: "Property Manager",
    email: `pm.demo@${DOMAIN}`,
    userRole: "pm",
  },
  {
    id: "or-cm-msg-social",
    name: "Social Committee",
    role: "Social Committee",
    email: SOCIAL_EMAIL,
    userRole: "member",
  },
  {
    id: "or-cm-msg-board",
    name: "Board Member",
    role: "Board Member",
    email: `board.demo@${DOMAIN}`,
    userRole: "board",
  },
] as const;

/**
 * Bookable amenities from oceansideresidents.com admin list (9 rows).
 * Kinds must be in BOOKABLE_AMENITY_KINDS. Fitness / pool remain walk-in for Hours.
 */
export const OCEANSIDE_PLAZA_AMENITIES = [
  {
    name: "Tennis Court #1",
    description:
      "Tennis Court #1 is the court that is the closest to the building. Please be courteous to your fellow tennis players by cancelling any bookings that you have made and cannot attend. You can do so by going to your calendar (My Calendar), click on your booking and then click on cancel reservation. PLEASE NOTE: There is a 5 minute grace period to get to the court to keep your reservation. Arriving 5 minutes later than your scheduled time forfeits your reservation.",
    kind: "court",
    schedule: "7:00 AM - 7:00 PM Daily",
    fee: 0,
    unitCount: 1,
    surface: "hard_court" as const,
  },
  {
    name: "Tennis Court #2",
    description:
      "Tennis Court #2 is the court that is the furthest from the building. Please be courteous to your fellow tennis players by cancelling any bookings that you have made and cannot attend. You can do so by going to your calendar (My Calendar), click on your booking and then click on cancel reservation. PLEASE NOTE: There is a 5 minute grace period to get to the court to keep your reservation. Arriving 5 minutes later than your scheduled time forfeits your reservation.",
    kind: "court",
    schedule: "7:00 AM - 7:00 PM Daily",
    fee: 0,
    unitCount: 1,
    surface: "hard_court" as const,
  },
  {
    name: "Golf Simulator",
    description:
      "Enjoy the golf simulator and explore some of the best courses from all over the world.",
    kind: "simulator",
    schedule: "8:00 AM - 11:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Theater",
    description:
      "Entertainment area to bring your own movies or watch sports on the big screen. Please contact the front desk for access if the theater is locked. The reservation reserves the use of the room for the time indicated.",
    kind: "theatre",
    schedule: "8:00 AM - 11:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Grill #1 (Left Side)",
    description:
      "Grill #1 is the grill to your left when your back is to the building. PLEASE NOTE: There is a 5 minute grace period to get to the grill to keep your reservation. Arriving 5 minutes later than your scheduled time forfeits your reservation.",
    kind: "grill",
    schedule: "10:00 AM - 9:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Grill #2 (Right Side)",
    description:
      "Grill #2 is the grill to your right when your back is to the building. PLEASE NOTE: There is a 5 minute grace period to get to the grill to keep your reservation. Arriving 5 minutes later than your scheduled time forfeits your reservation.",
    kind: "grill",
    schedule: "10:00 AM - 9:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Billiard Table",
    description:
      "Billiard Table — please visit the front desk for the billiard balls and available cues.",
    kind: "clubhouse",
    schedule: "8:00 AM - 11:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Board Room",
    description:
      "The board room is located in the alcove/hallway from the gym to the pool. The room is equipped with a large screen TV for your use.",
    kind: "clubhouse",
    schedule: "8:00 AM - 11:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Massage Room",
    description:
      "The massage room is located in the Plaza at Oceanside gym, in between the Men and Ladies locker rooms.",
    kind: "spa",
    schedule: "8:00 AM - 10:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
  {
    name: "Fitness Center",
    description:
      "Cardio, free weights, and strength equipment on the amenity level (walk-in).",
    kind: "gym",
    schedule: "5:00 AM - 11:00 PM Daily",
    fee: 0,
    unitCount: 1,
  },
] as const;

/** Clear amenity / lesson bookings for Oceanside (admin calendar should start empty). */
async function clearCommunityAdminBookings(): Promise<void> {
  const bookings = await prisma.booking.findMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
    select: { id: true },
  });
  const bookingIds = bookings.map((b) => b.id);
  if (bookingIds.length > 0) {
    await prisma.bookingInvite.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
  }
  const deleted = await prisma.booking.deleteMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
  });
  const lessons = await prisma.lessonBooking.deleteMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
  });
  console.log(
    `[oceanside] cleared community bookings: amenity=${deleted.count} lesson=${lessons.count}`,
  );
}

/** Replace Oceanside amenities with the verified Plaza at Oceanside set. */
async function syncOceansidePlazaAmenities(): Promise<void> {
  const existing = await prisma.amenity.findMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
    select: { id: true, name: true },
  });
  const wanted = new Set(OCEANSIDE_PLAZA_AMENITIES.map((a) => a.name));
  const existingNames = new Set(existing.map((a) => a.name));
  const sameSet =
    existing.length === OCEANSIDE_PLAZA_AMENITIES.length &&
    OCEANSIDE_PLAZA_AMENITIES.every((a) => existingNames.has(a.name));

  if (!sameSet) {
    // Only wipe bookings when the amenity catalog itself changes.
    await clearCommunityAdminBookings();
    const removed = await prisma.amenity.deleteMany({
      where: { communityId: OCEANSIDE_COMMUNITY_ID },
    });
    await prisma.amenity.createMany({
      data: OCEANSIDE_PLAZA_AMENITIES.map((a) => ({
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: a.name,
        description: a.description,
        kind: a.kind,
        schedule: a.schedule,
        fee: a.fee,
        unitCount: a.unitCount,
        surface: "surface" in a ? a.surface : null,
      })),
    });
    console.log(
      `[oceanside] synced Plaza amenities: removed=${removed.count} created=${OCEANSIDE_PLAZA_AMENITIES.length}`,
    );
  } else {
    // Keep amenity ids stable — update copy / metadata only.
    for (const a of OCEANSIDE_PLAZA_AMENITIES) {
      await prisma.amenity.updateMany({
        where: { communityId: OCEANSIDE_COMMUNITY_ID, name: a.name },
        data: {
          description: a.description,
          kind: a.kind,
          schedule: a.schedule,
          fee: a.fee,
          unitCount: a.unitCount,
          surface: "surface" in a ? a.surface : null,
        },
      });
    }
    console.log(
      `[oceanside] plaza amenities unchanged (${wanted.size}); booking history preserved`,
    );
  }

  // Retro-confirm free-slot bookings that were created as pending before auto-approve.
  const pending = await prisma.booking.findMany({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      status: "pending",
    },
    select: { id: true, amenity: true },
  });
  const toConfirm = pending
    .filter((b) => !amenityRequiresManagementApproval(b.amenity))
    .map((b) => b.id);
  if (toConfirm.length > 0) {
    const updated = await prisma.booking.updateMany({
      where: { id: { in: toConfirm } },
      data: { status: "confirmed" },
    });
    console.log(
      `[oceanside] auto-confirmed ${updated.count} pending amenity booking(s)`,
    );
  }
}

/**
 * Ensures Oceanside Residents community + standard demo logins exist.
 * Personal partner accounts are not seeded — residents self-enroll at go-live.
 */
export async function ensureOceansideResidentsDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  await prisma.community.upsert({
    where: { id: OCEANSIDE_COMMUNITY_ID },
    create: {
      id: OCEANSIDE_COMMUNITY_ID,
      name: "The Plaza at Oceanside",
      location: OCEANSIDE_CONTACT.address,
      coverColor: "from-cyan-500 to-blue-600",
      logoUrl: brandAssets.communityOceanside,
      primaryColor: "#0891b2",
      appDisplayName: "The Plaza at Oceanside",
      customDomain: DOMAIN,
      stagingMode: false,
      inviteCode: "oceanside-demo",
    },
    update: {
      name: "The Plaza at Oceanside",
      location: OCEANSIDE_CONTACT.address,
      logoUrl: brandAssets.communityOceanside,
      primaryColor: "#0891b2",
      appDisplayName: "The Plaza at Oceanside",
      customDomain: DOMAIN,
      stagingMode: false,
    },
  });

  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        password: hashPassword(DEMO_PASSWORD),
        role: user.role,
        name: user.name,
        communityId: OCEANSIDE_COMMUNITY_ID,
        status: "active",
      },
      update: {
        role: user.role,
        name: user.name,
        communityId: OCEANSIDE_COMMUNITY_ID,
        status: "active",
        password: hashPassword(DEMO_PASSWORD),
        // Role hubs use initials — never keep a leftover headshot.
        avatarUrl: null,
      },
    });
  }

  // Clear any uploaded/seeded photos on management hubs.
  await prisma.user.updateMany({
    where: {
      email: {
        in: OCEANSIDE_MESSAGE_CONTACTS.map((c) => c.email),
      },
    },
    data: { avatarUrl: null },
  });
  // Remove previously seeded partner login (self-enroll at go-live instead).
  const legacyPartner = LEGACY_PARTNER_MEMBER_EMAIL.toLowerCase();
  await prisma.memberProfileExt.deleteMany({
    where: { userEmail: legacyPartner },
  });
  await prisma.communityMember.deleteMany({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      name: "David Mathieu",
    },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: legacyPartner },
        { id: "u-or-partner-member" },
      ],
    },
  });
  console.log("[oceanside] removed legacy partner login (self-enroll)");

  // Remove retired seed resident (live Oceanside uses self-enroll only).
  await prisma.memberProfileExt.deleteMany({
    where: { userEmail: `member.demo@${DOMAIN}` },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: `member.demo@${DOMAIN}` },
        { id: "u-or-member" },
      ],
    },
  });

  for (const profile of [
    ...OCEANSIDE_MESSAGE_CONTACTS.map((c) => ({
      email: c.email,
      unit: "Mgmt",
      householdAddress: OCEANSIDE_CONTACT.address,
    })),
  ] as const) {
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { email: true },
    });
    if (!user) continue;
    await prisma.memberProfileExt.upsert({
      where: { userEmail: profile.email },
      create: {
        userEmail: profile.email,
        membershipTier: "hoa",
        residencyStatus: "resident",
        paysHoa: true,
        unit: profile.unit,
        householdAddress: profile.householdAddress,
        directoryVisible: true,
      },
      update: {
        membershipTier: "hoa",
        residencyStatus: "resident",
        paysHoa: true,
        unit: profile.unit,
        householdAddress: profile.householdAddress,
        directoryVisible: true,
      },
    });
  }

  await syncOceansidePlazaAmenities();
  await syncOceansideRealEstateListings();
  await syncOceansideDirectory();
  await syncOceansideGallery();
  await syncOceansideContactStaff();
  await syncOceansideUnitHoaFees();
  // Condo HOA — never carry club F&B minimum periods from earlier seeds.
  await prisma.memberFbPeriod.updateMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
    data: { requiredAmount: 0, status: "met" },
  });
  // No paid sponsorships / Clubhouse Restaurant featured placements.
  await prisma.promotion.deleteMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID, type: "featured" },
  });
  // Go-live: no one has loyalty points yet — wipe demo balances.
  const oceansideEmails = (
    await prisma.user.findMany({
      where: { communityId: OCEANSIDE_COMMUNITY_ID },
      select: { email: true },
    })
  ).map((u) => u.email.toLowerCase());
  if (oceansideEmails.length > 0) {
    await prisma.rewardTransaction.deleteMany({
      where: { userEmail: { in: oceansideEmails } },
    });
    await prisma.rewardAccount.updateMany({
      where: { userEmail: { in: oceansideEmails } },
      data: { points: 0, tier: "Bronze" },
    });
  }
}

/**
 * Active Plaza at Oceanside (1 N Ocean Blvd) sale + rent inventory pulled from
 * public MLS aggregators (Skyrises, Condo.net, Pompano Beach Realty, Compass, Zillow).
 * Snapshot for demos — not a live feed; prices/status change on the open market.
 */
async function syncOceansideRealEstateListings(): Promise<void> {
  const cover = brandAssets.communityOceansideCover;
  const tower = brandAssets.communityOceansideBuilding;
  const agentEmail = `pm.demo@${DOMAIN}`;

  const listings = [
    // —— For sale ——
    {
      id: "or-re-sale-607",
      title: "Corner residence · Unit 607",
      description:
        "Furnished 3-bed corner home with wraparound balcony — sunrise and sunset views. Plaza at Oceanside, across from the beach. MLS B26036048.",
      type: "sale",
      price: 2149000,
      beds: 3,
      baths: 4,
      sqft: 2726,
      unit: "1 N Ocean Blvd #607",
      color: "from-cyan-500 to-blue-800",
      images: [cover, tower],
      daysAgo: 1,
    },
    {
      id: "or-re-sale-806",
      title: "Ocean & city views · Unit 806",
      description:
        "Original-owner 3-bed / 3-bath with marble floors, Poggenpohl kitchen, den with Murphy bed, and ~286 sq ft terrace. Two garage spaces + storage. MLS A12004630.",
      type: "sale",
      price: 1895000,
      beds: 3,
      baths: 3,
      sqft: 2108,
      unit: "1 N Ocean Blvd #806",
      color: "from-sky-500 to-slate-800",
      images: [tower, cover],
      daysAgo: 2,
    },
    {
      id: "or-re-sale-1408",
      title: "Intracoastal sky home · Unit 1408",
      description:
        "14th-floor residence with unobstructed Intracoastal views. Elegant finishes throughout. Listed with The Keyes Company.",
      type: "sale",
      price: 1850000,
      beds: 2,
      baths: 2,
      sqft: 1815,
      unit: "1 N Ocean Blvd #1408",
      color: "from-teal-500 to-cyan-900",
      images: [cover, tower],
      daysAgo: 3,
    },
    {
      id: "or-re-sale-903",
      title: "Ocean-view private elevator · Unit 903",
      description:
        "2-bed / 2.5-bath with ocean views from every room and private elevator entry. MLS B26035976.",
      type: "sale",
      price: 1525000,
      beds: 2,
      baths: 3,
      sqft: 1975,
      unit: "1 N Ocean Blvd #903",
      color: "from-blue-500 to-indigo-900",
      images: [tower, cover],
      daysAgo: 4,
    },
    {
      id: "or-re-sale-513",
      title: "Renovated 5th-floor home · Unit 513",
      description:
        "Fully renovated 2-bed / 2-bath, 1,463 sq ft. New listing on the Plaza market. MLS B26054806.",
      type: "sale",
      price: 1275000,
      beds: 2,
      baths: 2,
      sqft: 1463,
      unit: "1 N Ocean Blvd #513",
      color: "from-cyan-400 to-blue-700",
      images: [cover, tower],
      daysAgo: 5,
    },
    {
      id: "or-re-sale-814",
      title: "SW corner sky residence · Unit 814",
      description:
        "Southwest corner “14” line with panoramic ocean, Intracoastal, city, and sunset views. High-end renovations throughout. MLS B26013501.",
      type: "sale",
      price: 1195000,
      beds: 2,
      baths: 2,
      sqft: 1470,
      unit: "1 N Ocean Blvd #814",
      color: "from-amber-400 to-cyan-800",
      images: [tower, cover],
      daysAgo: 6,
    },
    {
      id: "or-re-sale-709",
      title: "Designer 2-bed near the pier · Unit 709",
      description:
        "2-bed / 2-bath with European kitchen, Viking appliances, and wood finishes. Close to pier, beach, shops. Price recently reduced (may show pending on some boards). MLS F10533162.",
      type: "sale",
      price: 975000,
      beds: 2,
      baths: 2,
      sqft: 1478,
      unit: "1 N Ocean Blvd #709",
      color: "from-slate-500 to-cyan-800",
      images: [cover, tower],
      daysAgo: 7,
    },
    // —— For rent (monthly) ——
    {
      id: "or-re-rent-1007",
      title: "Seasonal rental · Unit 1007",
      description:
        "Spacious 3-bed / 4-bath corner-style home (2,726 sq ft). Monthly lease at Plaza at Oceanside. MLS B26045955.",
      type: "rent",
      price: 8750,
      beds: 3,
      baths: 4,
      sqft: 2726,
      unit: "1 N Ocean Blvd #1007",
      color: "from-emerald-400 to-teal-800",
      images: [cover, tower],
      daysAgo: 2,
    },
    {
      id: "or-re-rent-1004",
      title: "Ocean-view rental · Unit 1004",
      description:
        "Elegant 2-bed / 2.5-bath with private elevator foyer, motorized shades, and ocean-view balcony. Resort amenities included. Min. lease applies. Listed ~$8,000/mo.",
      type: "rent",
      price: 8000,
      beds: 2,
      baths: 2.5,
      sqft: 1967,
      unit: "1 N Ocean Blvd #1004",
      color: "from-cyan-400 to-blue-800",
      images: [tower, cover],
      daysAgo: 3,
    },
    {
      id: "or-re-rent-1214",
      title: "High-season Intracoastal rental · Unit 1214",
      description:
        "Turnkey 2-bed / 2-bath with ~48-ft balcony, Intracoastal and ocean views. Available Sep 2026–May 2027 (6-month minimum). No pets / no smoking. $7,500/mo.",
      type: "rent",
      price: 7500,
      beds: 2,
      baths: 2,
      sqft: 1470,
      unit: "1 N Ocean Blvd #1214",
      color: "from-sky-400 to-indigo-800",
      images: [cover, tower],
      daysAgo: 4,
    },
    {
      id: "or-re-rent-812",
      title: "Furnished rental · Unit 812",
      description:
        "2-bed / 2-bath, 1,439 sq ft. Monthly rental at the Plaza. MLS R11157745.",
      type: "rent",
      price: 7500,
      beds: 2,
      baths: 2,
      sqft: 1439,
      unit: "1 N Ocean Blvd #812",
      color: "from-teal-400 to-slate-800",
      images: [tower, cover],
      daysAgo: 5,
    },
    {
      id: "or-re-rent-513",
      title: "Renovated rental · Unit 513",
      description:
        "2-bed / 2-bath also offered for rent while listed for sale. 1,463 sq ft. MLS B26030188.",
      type: "rent",
      price: 7500,
      beds: 2,
      baths: 2,
      sqft: 1463,
      unit: "1 N Ocean Blvd #513",
      color: "from-blue-400 to-cyan-800",
      images: [cover, tower],
      daysAgo: 6,
    },
    {
      id: "or-re-rent-508",
      title: "Pool-deck level rental · Unit 508",
      description:
        "2-bed / 2-bath, 1,815 sq ft. Monthly lease. MLS R11165476.",
      type: "rent",
      price: 6500,
      beds: 2,
      baths: 2,
      sqft: 1815,
      unit: "1 N Ocean Blvd #508",
      color: "from-cyan-500 to-teal-900",
      images: [tower, cover],
      daysAgo: 7,
    },
    {
      id: "or-re-rent-913",
      title: "Bright 2-bed rental · Unit 913",
      description:
        "2-bed / 2-bath, 1,463 sq ft at Plaza at Oceanside. MLS B26025268.",
      type: "rent",
      price: 6500,
      beds: 2,
      baths: 2,
      sqft: 1463,
      unit: "1 N Ocean Blvd #913",
      color: "from-indigo-400 to-blue-900",
      images: [cover, tower],
      daysAgo: 8,
    },
  ] as const;

  const keepIds = listings.map((l) => l.id);
  await prisma.realEstateListing.deleteMany({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      id: { notIn: [...keepIds] },
    },
  });

  for (const listing of listings) {
    await prisma.realEstateListing.upsert({
      where: { id: listing.id },
      create: {
        id: listing.id,
        communityId: OCEANSIDE_COMMUNITY_ID,
        memberEmail: agentEmail,
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
        memberEmail: agentEmail,
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

  console.log(
    `[oceanside] synced real estate listings: ${listings.length} (sale + rent)`,
  );
}

/**
 * Go-live directory: message hubs only. Scraped ~108 residents are removed.
 * Real residents self-enroll → pending → approve → directoryVisible.
 * Preserves CommunityMember rows for existing self-registered users.
 */
async function syncOceansideDirectory(): Promise<void> {
  const hubIdList: string[] = OCEANSIDE_MESSAGE_CONTACTS.map((c) => c.id);
  const hubIds = new Set(hubIdList);
  const liveMembers = await prisma.user.findMany({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      role: "member",
      status: { in: ["active", "pending"] },
    },
    select: { name: true, email: true },
  });
  const keepNames = new Set(liveMembers.map((u) => u.name));

  const existing = await prisma.communityMember.findMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
    select: { id: true, name: true },
  });
  for (const row of existing) {
    if (hubIds.has(row.id)) continue;
    if (keepNames.has(row.name)) continue;
    // Drop scraped stub rows (or-cm-001…) and other demo directory entries.
    await prisma.communityMember.delete({ where: { id: row.id } });
  }

  for (const c of OCEANSIDE_MESSAGE_CONTACTS) {
    await prisma.communityMember.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: c.name,
        role: c.role,
        isManagement: true,
      },
      update: {
        name: c.name,
        role: c.role,
        isManagement: true,
        communityId: OCEANSIDE_COMMUNITY_ID,
      },
    });
  }

  const stubs = await prisma.user.findMany({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      id: { startsWith: "u-or-dir-" },
    },
    select: { id: true, email: true },
  });
  if (stubs.length > 0) {
    await prisma.memberProfileExt.deleteMany({
      where: { userEmail: { in: stubs.map((s) => s.email) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: stubs.map((s) => s.id) } },
    });
  }

  for (const c of OCEANSIDE_MESSAGE_CONTACTS) {
    await prisma.memberProfileExt.upsert({
      where: { userEmail: c.email },
      create: {
        userEmail: c.email,
        membershipTier: "hoa",
        residencyStatus: "resident",
        paysHoa: true,
        unit: "Mgmt",
        directoryVisible: true,
        householdAddress: OCEANSIDE_CONTACT.address,
      },
      update: {
        directoryVisible: true,
        unit: "Mgmt",
        residencyStatus: "resident",
        paysHoa: true,
        membershipTier: "hoa",
      },
    });
  }

  console.log(
    `[oceanside] directory ready for self-enroll (hubs=${OCEANSIDE_MESSAGE_CONTACTS.length}, stubs removed=${stubs.length})`,
  );
}

async function syncOceansideGallery(): Promise<void> {
  const photos = [
    {
      id: "or-gal-tennis",
      title: "Tennis Courts",
      category: "Amenities",
      url: brandAssets.oceansideTennis,
    },
    {
      id: "or-gal-fitness",
      title: "Fitness Center",
      category: "Amenities",
      url: brandAssets.oceansideFitness,
    },
    {
      id: "or-gal-lounge",
      title: "Club Lounge",
      category: "Amenities",
      url: brandAssets.oceansideClubLounge,
    },
    {
      id: "or-gal-theater",
      title: "Theater",
      category: "Amenities",
      url: brandAssets.oceansideTheater,
    },
    {
      id: "or-gal-patio",
      title: "Ocean Patio",
      category: "Amenities",
      url: brandAssets.oceansidePatio,
    },
    {
      id: "or-gal-grill",
      title: "Community Grills",
      category: "Amenities",
      url: brandAssets.oceansideGrill,
    },
    {
      id: "or-gal-tower",
      title: "Plaza at night",
      category: "Building",
      url: brandAssets.oceansideTowerNight,
    },
    {
      id: "or-gal-pier",
      title: "Pompano Beach Pier",
      category: "Neighborhood",
      url: brandAssets.oceansidePier,
    },
  ] as const;

  for (const photo of photos) {
    await prisma.galleryImage.upsert({
      where: { id: photo.id },
      create: {
        id: photo.id,
        communityId: OCEANSIDE_COMMUNITY_ID,
        title: photo.title,
        category: photo.category,
        url: photo.url,
        uploadedBy: "Oceanside Management",
      },
      update: {
        title: photo.title,
        category: photo.category,
        url: photo.url,
      },
    });
  }
  console.log(`[oceanside] synced gallery photos: ${photos.length}`);
}

async function syncOceansideContactStaff(): Promise<void> {
  await prisma.clubStaff.deleteMany({
    where: { communityId: OCEANSIDE_COMMUNITY_ID },
  });
  await prisma.clubStaff.createMany({
    data: [
      {
        id: "or-staff-super-admin",
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: "Super Admin",
        title: "Super Admin",
        department: "Administration",
        email: ADMIN_EMAIL,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 1,
        active: true,
      },
      {
        id: "or-staff-pm",
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: "Property Manager",
        title: "Property Manager",
        department: "Management",
        email: `pm.demo@${DOMAIN}`,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 2,
        active: true,
      },
      {
        id: "or-staff-social",
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: "Social Committee",
        title: "Social Committee",
        department: "Social",
        email: SOCIAL_EMAIL,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 3,
        active: true,
      },
      {
        id: "or-staff-board-hub",
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: "Board Member",
        title: "Board Member",
        department: "Board",
        email: `board.demo@${DOMAIN}`,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 4,
        active: true,
      },
      {
        id: "or-staff-mgmt-office",
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: "Oceanside Management Office",
        title: "Front Desk / Support",
        department: "Management",
        email: OCEANSIDE_CONTACT.email,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 5,
        active: true,
      },
      ...OCEANSIDE_BOARD.map((b, i) => ({
        id: `or-staff-board-${i + 1}`,
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: `${b.first} ${b.last}`,
        title: "Board Member",
        department: "Board",
        email: b.email,
        phone: OCEANSIDE_CONTACT.phone,
        category: "management",
        sortOrder: 10 + i,
        active: true,
      })),
    ],
  });
  console.log("[oceanside] synced contact / message hubs + board staff");

  await ensureOceansideServiceProvider(
    {
      email: "isaacbreno@gmail.com",
      contactName: "Isaac Andrade",
      businessName: "Afonso Andrade Floor Installation",
      phone: "(754) 423-7703",
      category: "Floor Installation",
      description:
        "Floor installation and related interior finishes for Plaza at Oceanside residents.",
    },
  );
}

async function ensureOceansideServiceProvider(input: {
  email: string;
  contactName: string;
  businessName: string;
  phone: string;
  category: string;
  description: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email,
        name: input.contactName,
        role: "provider",
        communityId: OCEANSIDE_COMMUNITY_ID,
        status: "active",
        // Temp login Isaac can change after first sign-in.
        password: hashPassword("PlazaFloor2026!"),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "provider",
        name: input.contactName,
        communityId: OCEANSIDE_COMMUNITY_ID,
        status: "active",
      },
    });
  }

  const existingProvider = await prisma.provider.findFirst({
    where: {
      communityId: OCEANSIDE_COMMUNITY_ID,
      OR: [{ email }, { name: input.businessName }],
    },
  });
  if (existingProvider) {
    await prisma.provider.update({
      where: { id: existingProvider.id },
      data: {
        name: input.businessName,
        email,
        phone: input.phone,
        category: input.category,
        type: "service",
        listingKind: "local_pro",
        description: input.description,
        status: "active",
        imageUrl: brandAssets.serviceCarpet,
      },
    });
  } else {
    await prisma.provider.create({
      data: {
        communityId: OCEANSIDE_COMMUNITY_ID,
        name: input.businessName,
        email,
        phone: input.phone,
        category: input.category,
        type: "service",
        listingKind: "local_pro",
        description: input.description,
        status: "active",
        imageUrl: brandAssets.serviceCarpet,
      },
    });
  }

  await prisma.providerSubscription.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      businessName: input.businessName,
      planId: "starter",
      status: "active",
    },
    update: {
      businessName: input.businessName,
      status: "active",
    },
  });

  const providerRow =
    (await prisma.provider.findFirst({
      where: { communityId: OCEANSIDE_COMMUNITY_ID, email },
    })) ??
    (await prisma.provider.findFirst({
      where: { communityId: OCEANSIDE_COMMUNITY_ID, name: input.businessName },
    }));
  if (providerRow) {
    const featured = await prisma.promotion.findFirst({
      where: {
        providerEmail: email,
        communityId: OCEANSIDE_COMMUNITY_ID,
        type: "featured",
        status: "active",
      },
    });
    if (featured) {
      await prisma.promotion.update({
        where: { id: featured.id },
        data: {
          title: input.businessName,
          detail: input.description,
          imageUrl: brandAssets.serviceCarpet,
          href: `/member/local-pros?highlight=${providerRow.id}`,
          subtitle: "Floor Installation",
          status: "active",
          priceLabel: "Sponsored",
          paidCents: Math.max(featured.paidCents, 1),
        },
      });
    } else {
      await prisma.promotion.create({
        data: {
          providerEmail: email,
          communityId: OCEANSIDE_COMMUNITY_ID,
          title: input.businessName,
          type: "featured",
          detail: input.description,
          status: "active",
          redemptions: 0,
          imageUrl: brandAssets.serviceCarpet,
          href: `/member/local-pros?highlight=${providerRow.id}`,
          subtitle: "Floor Installation",
          rating: "New",
          priceLabel: "Sponsored",
          paidCents: 4900,
        },
      });
    }
  }
  console.log(`[oceanside] service provider ready: ${email}`);
}
