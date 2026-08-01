/**
 * Seed Oceanside Residents community for production deployment.
 * Usage: npx tsx scripts/seed-oceanside-residents.ts
 *
 * Creates:
 * - Community: oceanside-residents (Pompano Beach, FL)
 * - Admin user: Dlms6768@gmail.com / Slater96!
 * - Custom domain: oceansideresidents.com
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

function loadEnvFile(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const COMMUNITY_ID = "oceanside-residents";
const COMMUNITY_NAME = "Oceanside Residents";
const CITY = "Pompano Beach";
const STATE = "FL";
const CUSTOM_DOMAIN = "oceansideresidents.com";

const ADMIN_EMAIL = "Dlms6768@gmail.com";
const ADMIN_PASSWORD = "Slater96!";
const ADMIN_NAME = "Community Admin";

async function main() {
  const { prisma } = await import("../src/lib/server/prisma");
  const { hashPassword } = await import("../src/lib/server/password");

  console.log(`Creating community: ${COMMUNITY_NAME} (${CITY}, ${STATE})`);
  console.log(`Custom domain: ${CUSTOM_DOMAIN}`);
  console.log(`Admin email: ${ADMIN_EMAIL}`);

  // Check if community already exists
  const existingCommunity = await prisma.community.findUnique({
    where: { id: COMMUNITY_ID },
  });

  if (existingCommunity) {
    console.log(`Community "${COMMUNITY_ID}" already exists. Updating...`);
    await prisma.community.update({
      where: { id: COMMUNITY_ID },
      data: {
        name: COMMUNITY_NAME,
        location: `${CITY}, ${STATE}`,
        customDomain: CUSTOM_DOMAIN,
        stagingMode: false,
      },
    });
  } else {
    console.log(`Creating new community: ${COMMUNITY_ID}`);
    await prisma.community.create({
      data: {
        id: COMMUNITY_ID,
        name: COMMUNITY_NAME,
        location: `${CITY}, ${STATE}`,
        coverColor: "from-cyan-500 to-blue-600",
        customDomain: CUSTOM_DOMAIN,
        stagingMode: false,
        members: {
          create: [
            { name: ADMIN_NAME, role: "Community Admin", isManagement: true },
          ],
        },
      },
    });
  }

  // Check if admin user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL.toLowerCase() },
  });

  if (existingUser) {
    console.log(`User "${ADMIN_EMAIL}" already exists. Updating password and community...`);
    await prisma.user.update({
      where: { email: ADMIN_EMAIL.toLowerCase() },
      data: {
        password: hashPassword(ADMIN_PASSWORD),
        communityId: COMMUNITY_ID,
        role: "admin",
        name: ADMIN_NAME,
        status: "active",
      },
    });
  } else {
    console.log(`Creating admin user: ${ADMIN_EMAIL}`);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL.toLowerCase(),
        password: hashPassword(ADMIN_PASSWORD),
        role: "admin",
        name: ADMIN_NAME,
        communityId: COMMUNITY_ID,
        status: "active",
      },
    });
  }

  // Delete existing amenities and recreate with full Plaza amenities
  console.log("Setting up Plaza amenities...");
  await prisma.amenity.deleteMany({
    where: { communityId: COMMUNITY_ID },
  });

  await prisma.amenity.createMany({
    data: [
      // ===== EXISTING PLAZA AMENITIES =====
      {
        communityId: COMMUNITY_ID,
        name: "Theatre",
        description: "Private screening room with surround sound, comfortable seating for 20+, and streaming capabilities",
        kind: "facility",
        schedule: "9:00 AM - 11:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Billiards Room",
        description: "Professional billiards tables, comfortable lounge seating, and refreshment area",
        kind: "facility",
        schedule: "8:00 AM - 11:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Tennis Court 1",
        description: "Hard court tennis with lighting for night play",
        kind: "court",
        schedule: "7:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Tennis Court 2",
        description: "Hard court tennis with lighting for night play",
        kind: "court",
        schedule: "7:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Resort Pool",
        description: "Heated resort-style pool with sun deck, lounge chairs, and poolside service",
        kind: "pool",
        schedule: "6:00 AM - 10:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Outdoor Grill 1",
        description: "Gas grill station with prep counter, sink, and covered seating area",
        kind: "facility",
        schedule: "8:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Outdoor Grill 2",
        description: "Gas grill station with prep counter, sink, and covered seating area",
        kind: "facility",
        schedule: "8:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Fitness Center",
        description: "State-of-the-art gym with cardio machines, free weights, and strength training equipment",
        kind: "gym",
        schedule: "5:00 AM - 11:00 PM Daily",
        fee: 0,
      },

      // ===== NEW AMENITIES (from research) =====
      // Wellness & Spa
      {
        communityId: COMMUNITY_ID,
        name: "Sauna",
        description: "Relaxing dry sauna for post-workout recovery",
        kind: "spa",
        schedule: "6:00 AM - 10:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Hot Tub / Spa",
        description: "Heated spa with jets, adjacent to the pool area",
        kind: "spa",
        schedule: "6:00 AM - 10:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Yoga Studio",
        description: "Dedicated yoga and Pilates studio with mirrors, mats, and props",
        kind: "gym",
        schedule: "6:00 AM - 9:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },

      // Sports & Recreation
      {
        communityId: COMMUNITY_ID,
        name: "Pickleball Court 1",
        description: "Regulation pickleball court with lighting",
        kind: "court",
        schedule: "7:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Pickleball Court 2",
        description: "Regulation pickleball court with lighting",
        kind: "court",
        schedule: "7:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Basketball Court",
        description: "Half-court basketball with lighting",
        kind: "court",
        schedule: "7:00 AM - 10:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Golf Simulator",
        description: "Indoor golf simulator with multiple course options",
        kind: "facility",
        schedule: "8:00 AM - 10:00 PM Daily",
        fee: 25,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Bocce Ball Court",
        description: "Outdoor bocce ball court",
        kind: "court",
        schedule: "7:00 AM - Dusk Daily",
        fee: 0,
        unitCount: 1,
      },

      // Social & Entertainment
      {
        communityId: COMMUNITY_ID,
        name: "Wine Room",
        description: "Private wine tasting room with climate-controlled storage",
        kind: "facility",
        schedule: "5:00 PM - 11:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Private Dining Room",
        description: "Elegant private dining space with catering kitchen, seats 12",
        kind: "facility",
        schedule: "11:00 AM - 10:00 PM Daily",
        fee: 50,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Game Room",
        description: "Ping pong, shuffleboard, video games, and card tables",
        kind: "facility",
        schedule: "8:00 AM - 11:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Fire Pit Lounge",
        description: "Outdoor fire pit with comfortable seating for evening gatherings",
        kind: "facility",
        schedule: "5:00 PM - 11:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Pool Cabanas",
        description: "Private poolside cabanas with shade and service",
        kind: "facility",
        schedule: "9:00 AM - 6:00 PM Daily",
        fee: 25,
        unitCount: 4,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Event Lawn",
        description: "Open lawn space for community events and private parties",
        kind: "facility",
        schedule: "8:00 AM - 10:00 PM Daily",
        fee: 100,
        unitCount: 1,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Clubhouse",
        description: "Main clubhouse with lounge areas, kitchen, and multi-purpose rooms",
        kind: "facility",
        schedule: "7:00 AM - 11:00 PM Daily",
        fee: 0,
      },

      // Work & Business
      {
        communityId: COMMUNITY_ID,
        name: "Co-Working Space",
        description: "Professional workspace with desks, high-speed WiFi, and printing",
        kind: "facility",
        schedule: "6:00 AM - 10:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Conference Room",
        description: "Private conference room with video conferencing, seats 8",
        kind: "facility",
        schedule: "8:00 AM - 8:00 PM Daily",
        fee: 0,
        unitCount: 1,
      },

      // Family & Kids
      {
        communityId: COMMUNITY_ID,
        name: "Children's Playground",
        description: "Outdoor playground with swings, slides, and climbing structures",
        kind: "facility",
        schedule: "Dawn - Dusk Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Kids Playroom",
        description: "Indoor playroom with toys, games, and activities for children",
        kind: "facility",
        schedule: "8:00 AM - 8:00 PM Daily",
        fee: 0,
      },

      // Pet Amenities
      {
        communityId: COMMUNITY_ID,
        name: "Dog Park",
        description: "Fenced off-leash dog park with separate areas for small and large dogs",
        kind: "facility",
        schedule: "6:00 AM - 10:00 PM Daily",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Pet Wash Station",
        description: "Self-service pet grooming station with tub, dryer, and supplies",
        kind: "facility",
        schedule: "7:00 AM - 9:00 PM Daily",
        fee: 0,
      },

      // Outdoor & Nature
      {
        communityId: COMMUNITY_ID,
        name: "Walking Trail",
        description: "Scenic walking and jogging path around the community",
        kind: "facility",
        schedule: "Open 24 hours",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Community Garden",
        description: "Raised garden beds available for resident use",
        kind: "facility",
        schedule: "Dawn - Dusk Daily",
        fee: 0,
      },

      // Services
      {
        communityId: COMMUNITY_ID,
        name: "EV Charging Stations",
        description: "Electric vehicle charging stations in the parking garage",
        kind: "facility",
        schedule: "Open 24 hours",
        fee: 0,
        unitCount: 8,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Bike Storage",
        description: "Secure indoor bicycle storage with repair station",
        kind: "facility",
        schedule: "Open 24 hours",
        fee: 0,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Package Room",
        description: "Secure package delivery room with lockers and refrigerated storage",
        kind: "facility",
        schedule: "Open 24 hours",
        fee: 0,
      },
    ],
  });

  console.log("✅ Created 35 amenities for The Plaza");

  // Create Knowledge Base articles
  console.log("Setting up Knowledge Base articles...");
  await prisma.knowledgeArticle.deleteMany({
    where: { communityId: COMMUNITY_ID },
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      // General
      {
        communityId: COMMUNITY_ID,
        category: "General",
        question: "What are the community office hours?",
        answer: "The management office is open Monday through Friday from 9:00 AM to 5:00 PM. For after-hours emergencies, please call the 24-hour concierge line.",
        keywords: "office, hours, contact, management",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "General",
        question: "How do I contact the property manager?",
        answer: "You can reach the property manager through the app's Messages feature, by calling the front desk, or by visiting the management office during business hours.",
        keywords: "contact, manager, phone, email",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "General",
        question: "How do I submit a maintenance request?",
        answer: "Go to Service Requests in the app, tap 'New Request', select the category (Plumbing, Electrical, HVAC, etc.), describe the issue, and optionally attach photos. You'll receive updates on your request status.",
        keywords: "maintenance, repair, fix, broken",
        sortOrder: 3,
        published: true,
        createdBy: "System",
      },

      // Amenities
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "How do I reserve the tennis or pickleball courts?",
        answer: "Use the Book feature in the app. Select the court, choose your date and time, and confirm your reservation. Courts can be booked up to 7 days in advance. Reservations are limited to 90 minutes per booking.",
        keywords: "tennis, pickleball, court, reserve, book",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "What are the pool rules?",
        answer: "Pool hours are 6:00 AM - 10:00 PM daily. No glass containers, no diving, children under 14 must be accompanied by an adult. Guests are allowed with resident supervision (max 2 guests per unit).",
        keywords: "pool, swimming, rules, hours, guests",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "Can I reserve the private dining room for events?",
        answer: "Yes! The private dining room can be reserved through the app. There's a $50 reservation fee. The room seats up to 12 and includes access to the catering kitchen. Book at least 48 hours in advance.",
        keywords: "dining, party, event, reserve, catering",
        sortOrder: 3,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "How do I use the golf simulator?",
        answer: "The golf simulator is available for $25/hour. Book through the app under Amenities > Golf Simulator. Equipment (clubs, balls) is provided. First-time users receive a brief orientation from staff.",
        keywords: "golf, simulator, booking, fee",
        sortOrder: 4,
        published: true,
        createdBy: "System",
      },

      // Payments
      {
        communityId: COMMUNITY_ID,
        category: "Payments",
        question: "How do I pay my HOA fees?",
        answer: "Go to Payments in the app to view your balance and make payments. We accept credit/debit cards and bank transfers. You can also set up autopay for monthly convenience.",
        keywords: "hoa, dues, payment, autopay, fees",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Payments",
        question: "When are HOA dues due?",
        answer: "Monthly HOA dues are due on the 1st of each month. A grace period extends to the 10th. Late fees apply after the grace period.",
        keywords: "due date, payment, late fee, monthly",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },

      // Parking
      {
        communityId: COMMUNITY_ID,
        category: "Parking",
        question: "How do I register my vehicle?",
        answer: "Register your vehicle through the app under Profile > Vehicles. You'll need your license plate, make, model, and color. Registered vehicles receive a parking decal from the front desk.",
        keywords: "car, vehicle, registration, decal, parking",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Parking",
        question: "Where can guests park?",
        answer: "Guest parking is available in the designated visitor spots near the main entrance. Guests staying overnight must register at the front desk. Maximum guest parking is 48 hours without prior approval.",
        keywords: "guest, visitor, parking, overnight",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Parking",
        question: "How do I use the EV charging stations?",
        answer: "EV charging stations are located in the parking garage (Level P1). Use your resident fob to activate. Charging is complimentary. Please limit sessions to 4 hours to allow others access.",
        keywords: "electric, ev, charging, tesla, car",
        sortOrder: 3,
        published: true,
        createdBy: "System",
      },

      // Pets
      {
        communityId: COMMUNITY_ID,
        category: "Pets",
        question: "What is the pet policy?",
        answer: "Residents may have up to 2 pets (dogs or cats). All pets must be registered with management. Dogs must be leashed in common areas except the dog park. Breed restrictions apply - contact management for details.",
        keywords: "pet, dog, cat, policy, rules",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Pets",
        question: "Where is the dog park?",
        answer: "The dog park is located on the east side of the property, near the walking trail entrance. It features separate areas for small dogs (under 25 lbs) and large dogs. Open 6:00 AM - 10:00 PM.",
        keywords: "dog, park, off-leash, location",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },

      // Move-In
      {
        communityId: COMMUNITY_ID,
        category: "Move-In",
        question: "How do I schedule a move-in?",
        answer: "Contact the management office at least 2 weeks before your move-in date. Moves are allowed Monday-Saturday, 9:00 AM - 5:00 PM. You'll need to reserve the service elevator and loading dock.",
        keywords: "move, moving, elevator, schedule",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Move-In",
        question: "Is there a move-in deposit?",
        answer: "Yes, a refundable $500 move-in deposit is required. This covers any potential damage to common areas during the move. The deposit is returned within 30 days after inspection.",
        keywords: "deposit, move, refund, fee",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },

      // Security
      {
        communityId: COMMUNITY_ID,
        category: "Security",
        question: "How do I add guests to the visitor list?",
        answer: "Use the app's Guest Access feature to add expected visitors. You can set one-time or recurring access. Guests will need to show ID at the front desk and will be announced before entry.",
        keywords: "guest, visitor, security, access",
        sortOrder: 1,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Security",
        question: "What if I lose my key fob?",
        answer: "Report lost fobs immediately to the front desk so they can be deactivated. Replacement fobs cost $50. You'll need to show ID to receive a replacement.",
        keywords: "key, fob, lost, replacement",
        sortOrder: 2,
        published: true,
        createdBy: "System",
      },
    ],
  });

  console.log("✅ Created 18 Knowledge Base articles");

  // ============================================================================
  // TRAM / SHUTTLE VEHICLES
  // ============================================================================
  await prisma.tramVehicle.deleteMany({ where: { communityId: COMMUNITY_ID } });
  await prisma.tramVehicle.createMany({
    data: [
      {
        communityId: COMMUNITY_ID,
        name: "Tram 1",
        capacity: 8,
        status: "available",
        vehicleType: "tram",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Tram 2",
        capacity: 8,
        status: "available",
        vehicleType: "tram",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Golf Cart A",
        capacity: 4,
        status: "available",
        vehicleType: "golf_cart",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Golf Cart B",
        capacity: 4,
        status: "available",
        vehicleType: "golf_cart",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Golf Cart C",
        capacity: 4,
        status: "available",
        vehicleType: "golf_cart",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Shuttle Van",
        capacity: 12,
        status: "available",
        vehicleType: "van",
        active: true,
      },
    ],
  });
  console.log("✅ Created 6 Tram/Shuttle vehicles");

  // ============================================================================
  // TRAM DRIVERS
  // ============================================================================
  await prisma.tramDriver.deleteMany({ where: { communityId: COMMUNITY_ID } });
  await prisma.tramDriver.createMany({
    data: [
      {
        communityId: COMMUNITY_ID,
        name: "Carlos Martinez",
        phone: "+15551234567",
        pin: "1234",
        status: "on_duty",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "Maria Santos",
        phone: "+15551234568",
        pin: "2345",
        status: "on_duty",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "James Thompson",
        phone: "+15551234569",
        pin: "3456",
        status: "off_duty",
        active: true,
      },
      {
        communityId: COMMUNITY_ID,
        name: "David Rodriguez",
        phone: "+15551234570",
        pin: "4567",
        status: "off_duty",
        active: true,
      },
    ],
  });
  console.log("✅ Created 4 Tram Drivers (with SMS numbers)");

  console.log("\n✅ Oceanside Residents community created successfully!");
  console.log("\n📋 Summary:");
  console.log(`   Community ID: ${COMMUNITY_ID}`);
  console.log(`   Community Name: ${COMMUNITY_NAME}`);
  console.log(`   Location: ${CITY}, ${STATE}`);
  console.log(`   Custom Domain: ${CUSTOM_DOMAIN}`);
  console.log(`\n🔐 Admin Login:`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`\n🌐 After deploying to Azure:`);
  console.log(`   1. Configure DNS: Point ${CUSTOM_DOMAIN} to your Azure App Service`);
  console.log(`   2. Add custom domain in Azure App Service → Custom domains`);
  console.log(`   3. Enable HTTPS with App Service Managed Certificate`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
