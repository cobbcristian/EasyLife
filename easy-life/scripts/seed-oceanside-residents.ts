/**
 * Seed Oceanside Residents community for production deployment.
 * Usage: npx tsx scripts/seed-oceanside-residents.ts
 *
 * Creates:
 * - Community: oceanside-residents (Pompano Beach, FL)
 * - Demo logins (member/board/pm/admin @ oceansideresidents.com, password: password)
 * - Residents self-enroll at go-live (no seeded personal partner logins)
 * - Plaza amenities, knowledge base, tram vehicles/drivers
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

async function main() {
  const { prisma } = await import("../src/lib/server/prisma");
  const { ensureOceansideResidentsDemoSeeded } = await import(
    "../src/lib/server/oceanside-residents-seed"
  );

  console.log(`Creating community: ${COMMUNITY_NAME} (${CITY}, ${STATE})`);
  console.log(`Custom domain: ${CUSTOM_DOMAIN}`);
  console.log("Seeding demo accounts + partner member…");
  await ensureOceansideResidentsDemoSeeded();

  // Amenities are synced inside ensureOceansideResidentsDemoSeeded (Plaza at Oceanside).
  console.log("✅ Plaza amenities synced via Oceanside seed");

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
        question: "How do I reserve the tennis courts?",
        answer:
          "Use the Book feature in the app. Select the court, choose your date and time, and confirm your reservation. Courts can be booked up to 7 days in advance. Reservations are limited to 90 minutes per booking.",
        keywords: "tennis, court, reserve, book",
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
        question: "Can I reserve the Club Room for a gathering?",
        answer:
          "Yes. Reserve the Club Room, Sports Lounge, Wine Vault, or theatre in the app under Amenities. There is no on-site restaurant — residents bring their own food and drink per community rules. Book at least 48 hours in advance.",
        keywords: "club room, party, event, reserve, gathering, theatre, wine",
        sortOrder: 3,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "How do I use the golf simulator?",
        answer:
          "Book the Golf Simulator in the app under Amenities. Resident reservations are complimentary. Equipment (clubs, balls) is provided. First-time users can ask the front desk for a brief orientation.",
        keywords: "golf, simulator, booking, fee",
        sortOrder: 4,
        published: true,
        createdBy: "System",
      },
      {
        communityId: COMMUNITY_ID,
        category: "Amenities",
        question: "What amenities can I reserve?",
        answer:
          "Residents can book: Tennis Courts 1–2, Golf Simulator, Surround Sound Theatre, Outdoor Grills 1–2, Club Room, Sports Lounge, and Wine Vault. The infinity pool and fitness center are walk-in (no reservation). There is no pickleball, basketball, bocce, or clubhouse restaurant.",
        keywords: "book, reserve, tennis, grill, theatre, amenities list",
        sortOrder: 5,
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
  console.log(`\n🔐 Demo logins (password: password):`);
  console.log(`   Member  member.demo@oceansideresidents.com`);
  console.log(`   Board   board.demo@oceansideresidents.com`);
  console.log(`   PM      pm.demo@oceansideresidents.com`);
  console.log(`   Admin   admin.demo@oceansideresidents.com`);
  console.log(`\n👥 Residents self-enroll at go-live (no seeded personal logins).`);
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
