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

  // Create some basic amenities for the community
  const amenitiesCount = await prisma.amenity.count({
    where: { communityId: COMMUNITY_ID },
  });

  if (amenitiesCount === 0) {
    console.log("Creating default amenities...");
    await prisma.amenity.createMany({
      data: [
        {
          communityId: COMMUNITY_ID,
          name: "Pool",
          description: "Community swimming pool",
          kind: "facility",
          schedule: "6:00 AM - 10:00 PM Daily",
          fee: 0,
        },
        {
          communityId: COMMUNITY_ID,
          name: "Clubhouse",
          description: "Community clubhouse for events and gatherings",
          kind: "facility",
          schedule: "8:00 AM - 9:00 PM Daily",
          fee: 0,
        },
        {
          communityId: COMMUNITY_ID,
          name: "Fitness Center",
          description: "Community fitness center with modern equipment",
          kind: "gym",
          schedule: "5:00 AM - 11:00 PM Daily",
          fee: 0,
        },
        {
          communityId: COMMUNITY_ID,
          name: "Tennis Court 1",
          description: "Har-Tru clay tennis court",
          kind: "court",
          schedule: "7:00 AM - 9:00 PM Daily",
          fee: 0,
          unitCount: 1,
        },
        {
          communityId: COMMUNITY_ID,
          name: "Tennis Court 2",
          description: "Har-Tru clay tennis court",
          kind: "court",
          schedule: "7:00 AM - 9:00 PM Daily",
          fee: 0,
          unitCount: 1,
        },
      ],
    });
  }

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
