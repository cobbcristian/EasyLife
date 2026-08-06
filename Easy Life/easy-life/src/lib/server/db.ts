import { randomBytes } from "node:crypto";
import { communities as seedCommunities } from "@/lib/communities-data";
import {
  communityLogoById,
  imageForProviderCategory,
} from "@/lib/brand-assets";
import { IRON_LAKE_DEMO_USERS } from "@/lib/iron-lake-demo";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import { defaultCommunityForRole } from "@/lib/server/auth";
import { isDemoSeedAllowed } from "@/lib/server/demo-mode";
import {
  communityRequiresEnrollmentApproval,
  createPendingResident,
} from "@/lib/server/member-enrollment";
import { sendBusinessInvitationEmail } from "@/lib/server/notify";
import type { AuthUser, Community, Provider } from "@/lib/types";

const seedUsers: AuthUser[] = [
  { id: "u-admin", email: "superadmin@gmail.com", password: "password", role: "admin", name: "Easy Life Admin", communityId: null },
  { id: "u-club-admin", email: "pm.demo@willowcreekhoa.com", password: "password", role: "admin", name: "Priya Nair", communityId: "willow-creek" },
  { id: "u-provider", email: "cassiesmeticuloustouch@gmail.com", password: "password1!", role: "provider", name: "Cassie's Meticulous Touch", communityId: "golden-ocala" },
  { id: "u-member", email: "sarah.mitchell@oceanside.com", password: "password", role: "member", name: "Sarah Mitchell", communityId: "golden-ocala" },
  { id: "u-board", email: "james.rodriguez@oceanside.com", password: "password", role: "board", name: "James Rodriguez", communityId: "golden-ocala" },
  { id: "u-pm", email: "michael.thompson@oceanside.com", password: "password", role: "pm", name: "Michael Thompson", communityId: "golden-ocala" },
  { id: "u-hb-member", email: "member.demo@golfheritagebay.com", password: "password", role: "member", name: "Kelly Anderson", communityId: "heritage-bay" },
  { id: "u-hb-member-social", email: "member.social@golfheritagebay.com", password: "password", role: "member", name: "Carlos Martinez", communityId: "heritage-bay" },
  { id: "u-hb-member-tennis", email: "member.tennis@golfheritagebay.com", password: "password", role: "member", name: "Linda Chen", communityId: "heritage-bay" },
  { id: "u-hb-pm", email: "admin@golfheritagebay.com", password: "password", role: "pm", name: "Stephanie McIntosh", communityId: "heritage-bay" },
  { id: "u-hb-board", email: "board.demo@golfheritagebay.com", password: "password", role: "board", name: "Doug Brown", communityId: "heritage-bay" },
  { id: "u-hr-member", email: "member.demo@huntersridge-ca.com", password: "password", role: "member", name: "Grace Holloway", communityId: "hunters-ridge" },
  { id: "u-hr-member-social", email: "member.social@huntersridge-ca.com", password: "password", role: "member", name: "Peter Callahan", communityId: "hunters-ridge" },
  { id: "u-hr-pm", email: "pm.demo@huntersridge-ca.com", password: "password", role: "pm", name: "Naomi Weathers", communityId: "hunters-ridge" },
  { id: "u-hr-board", email: "board.demo@huntersridge-ca.com", password: "password", role: "board", name: "Don Huprich", communityId: "hunters-ridge" },
  { id: "u-bb-member", email: "member.demo@bonitabayclub.net", password: "password", role: "member", name: "Claire Montgomery", communityId: "bonita-bay" },
  { id: "u-bb-member-social", email: "member.social@bonitabayclub.net", password: "password", role: "member", name: "Robert Hale", communityId: "bonita-bay" },
  { id: "u-bb-pm", email: "pm.demo@bonitabayclub.net", password: "password", role: "pm", name: "Elena Vargas", communityId: "bonita-bay" },
  { id: "u-bb-board", email: "board.demo@bonitabayclub.net", password: "password", role: "board", name: "James Whitfield", communityId: "bonita-bay" },
  { id: "u-sw-member", email: "member.demo@shadowwoodcc.com", password: "password", role: "member", name: "Natalie Brooks", communityId: "shadow-wood" },
  { id: "u-sw-member-social", email: "member.social@shadowwoodcc.com", password: "password", role: "member", name: "David Chen", communityId: "shadow-wood" },
  { id: "u-sw-pm", email: "pm.demo@shadowwoodcc.com", password: "password", role: "pm", name: "Amanda Reeves", communityId: "shadow-wood" },
  { id: "u-sw-board", email: "board.demo@shadowwoodcc.com", password: "password", role: "board", name: "Richard Coleman", communityId: "shadow-wood" },
  { id: "u-hc-member", email: "member.demo@heroncreekgcc.com", password: "password", role: "member", name: "Megan Torres", communityId: "heron-creek" },
  { id: "u-hc-member-social", email: "member.social@heroncreekgcc.com", password: "password", role: "member", name: "Ryan Patel", communityId: "heron-creek" },
  { id: "u-hc-pm", email: "pm.demo@heroncreekgcc.com", password: "password", role: "pm", name: "Richelle Harris", communityId: "heron-creek" },
  { id: "u-hc-board", email: "board.demo@heroncreekgcc.com", password: "password", role: "board", name: "Alan Briggs", communityId: "heron-creek" },
  { id: "u-db-member", email: "member.demo@debarycc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "debary" },
  { id: "u-db-member-social", email: "member.social@debarycc.com", password: "password", role: "member", name: "Casey Nguyen", communityId: "debary" },
  { id: "u-db-pm", email: "pm.demo@debarycc.com", password: "password", role: "pm", name: "Dan Flood", communityId: "debary" },
  { id: "u-db-board", email: "board.demo@debarycc.com", password: "password", role: "board", name: "Patricia Owens", communityId: "debary" },
  { id: "u-jc-member", email: "member.demo@jacarandagolfclub.com", password: "password", role: "member", name: "Alex Rivera", communityId: "jacaranda" },
  { id: "u-jc-member-social", email: "member.social@jacarandagolfclub.com", password: "password", role: "member", name: "Sam Ortiz", communityId: "jacaranda" },
  { id: "u-jc-pm", email: "pm.demo@jacarandagolfclub.com", password: "password", role: "pm", name: "Andrew Michael", communityId: "jacaranda" },
  { id: "u-jc-board", email: "board.demo@jacarandagolfclub.com", password: "password", role: "board", name: "Kathy Gazda", communityId: "jacaranda" },
  { id: "u-td-member", email: "member.demo@sanibeldunesresort.com", password: "password", role: "member", name: "Taylor Quinn", communityId: "the-dunes" },
  { id: "u-td-member-social", email: "member.social@sanibeldunesresort.com", password: "password", role: "member", name: "Morgan Ellis", communityId: "the-dunes" },
  { id: "u-td-pm", email: "pm.demo@sanibeldunesresort.com", password: "password", role: "pm", name: "Dana Swanson", communityId: "the-dunes" },
  { id: "u-td-board", email: "board.demo@sanibeldunesresort.com", password: "password", role: "board", name: "Chris Adler", communityId: "the-dunes" },
  { id: "u-md-member", email: "member.demo@martindownsgolfclub.com", password: "password", role: "member", name: "Cameron Walsh", communityId: "martin-downs" },
  { id: "u-md-member-social", email: "member.social@martindownsgolfclub.com", password: "password", role: "member", name: "Avery Brooks", communityId: "martin-downs" },
  { id: "u-md-pm", email: "pm.demo@martindownsgolfclub.com", password: "password", role: "pm", name: "Jamie Reed", communityId: "martin-downs" },
  { id: "u-md-board", email: "board.demo@martindownsgolfclub.com", password: "password", role: "board", name: "Robin Castillo", communityId: "martin-downs" },
  { id: "u-tn-member", email: "member.demo@nestgolf.com", password: "password", role: "member", name: "Blake Avery", communityId: "the-nest" },
  { id: "u-tn-member-social", email: "member.social@nestgolf.com", password: "password", role: "member", name: "Riley Santos", communityId: "the-nest" },
  { id: "u-tn-pm", email: "pm.demo@nestgolf.com", password: "password", role: "pm", name: "AJ Szymanski", communityId: "the-nest" },
  { id: "u-tn-board", email: "board.demo@nestgolf.com", password: "password", role: "board", name: "Jordan Hale", communityId: "the-nest" },
  { id: "u-sg-member", email: "member.demo@seagatedelray.com", password: "password", role: "member", name: "Jordan Blake", communityId: "seagate" },
  { id: "u-sg-member-social", email: "member.social@seagatedelray.com", password: "password", role: "member", name: "Casey Wells", communityId: "seagate" },
  { id: "u-sg-pm", email: "pm.demo@seagatedelray.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "seagate" },
  { id: "u-sg-board", email: "board.demo@seagatedelray.com", password: "password", role: "board", name: "Pat Rivera", communityId: "seagate" },
  { id: "u-cl-member", email: "member.demo@copperleafgolf.com", password: "password", role: "member", name: "Morgan Blake", communityId: "copperleaf" },
  { id: "u-cl-member-social", email: "member.social@copperleafgolf.com", password: "password", role: "member", name: "Taylor Wells", communityId: "copperleaf" },
  { id: "u-cl-pm", email: "pm.demo@copperleafgolf.com", password: "password", role: "pm", name: "Chris Coleman", communityId: "copperleaf" },
  { id: "u-cl-board", email: "board.demo@copperleafgolf.com", password: "password", role: "board", name: "Jordan Rivera", communityId: "copperleaf" },
  { id: "u-cr-member", email: "member.demo@clubrenaissance.com", password: "password", role: "member", name: "Sam Parker", communityId: "club-renaissance" },
  { id: "u-cr-member-social", email: "member.social@clubrenaissance.com", password: "password", role: "member", name: "Riley Chen", communityId: "club-renaissance" },
  { id: "u-cr-pm", email: "pm.demo@clubrenaissance.com", password: "password", role: "pm", name: "Alexis Macon", communityId: "club-renaissance" },
  { id: "u-cr-board", email: "board.demo@clubrenaissance.com", password: "password", role: "board", name: "Drew Hoffman", communityId: "club-renaissance" },
  { id: "u-wo-member", email: "member.demo@worthingtoncc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "worthington" },
  { id: "u-wo-member-social", email: "member.social@worthingtoncc.com", password: "password", role: "member", name: "Casey Wells", communityId: "worthington" },
  { id: "u-wo-pm", email: "pm.demo@worthingtoncc.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "worthington" },
  { id: "u-wo-board", email: "board.demo@worthingtoncc.com", password: "password", role: "board", name: "Pat Rivera", communityId: "worthington" },
  { id: "u-fc-member", email: "member.demo@thefallsclub.com", password: "password", role: "member", name: "Cameron Walsh", communityId: "falls-club" },
  { id: "u-fc-member-social", email: "member.social@thefallsclub.com", password: "password", role: "member", name: "Avery Brooks", communityId: "falls-club" },
  { id: "u-fc-pm", email: "pm.demo@thefallsclub.com", password: "password", role: "pm", name: "Jamie Reed", communityId: "falls-club" },
  { id: "u-fc-board", email: "board.demo@thefallsclub.com", password: "password", role: "board", name: "Robin Castillo", communityId: "falls-club" },
  { id: "u-ec-member", email: "member.demo@esterocc.com", password: "password", role: "member", name: "Cameron Walsh", communityId: "estero" },
  { id: "u-ec-member-social", email: "member.social@esterocc.com", password: "password", role: "member", name: "Avery Brooks", communityId: "estero" },
  { id: "u-ec-pm", email: "pm.demo@esterocc.com", password: "password", role: "pm", name: "Jamie Reed", communityId: "estero" },
  { id: "u-ec-board", email: "board.demo@esterocc.com", password: "password", role: "board", name: "Robin Castillo", communityId: "estero" },
  { id: "u-wr-member", email: "member.demo@wildcatruncc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "wildcat-run" },
  { id: "u-wr-member-social", email: "member.social@wildcatruncc.com", password: "password", role: "member", name: "Casey Wells", communityId: "wildcat-run" },
  { id: "u-wr-pm", email: "pm.demo@wildcatruncc.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "wildcat-run" },
  { id: "u-wr-board", email: "board.demo@wildcatruncc.com", password: "password", role: "board", name: "Pat Rivera", communityId: "wildcat-run" },
  { id: "u-hw-member", email: "member.demo@hwgcc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "highland-woods" },
  { id: "u-hw-member-social", email: "member.social@hwgcc.com", password: "password", role: "member", name: "Casey Wells", communityId: "highland-woods" },
  { id: "u-hw-pm", email: "pm.demo@hwgcc.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "highland-woods" },
  { id: "u-hw-board", email: "board.demo@hwgcc.com", password: "password", role: "board", name: "Pat Rivera", communityId: "highland-woods" },
  { id: "u-bn-member", email: "member.demo@bonitanationalgolfcc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "bonita-national" },
  { id: "u-bn-member-social", email: "member.social@bonitanationalgolfcc.com", password: "password", role: "member", name: "Casey Wells", communityId: "bonita-national" },
  { id: "u-bn-pm", email: "pm.demo@bonitanationalgolfcc.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "bonita-national" },
  { id: "u-bn-board", email: "board.demo@bonitanationalgolfcc.com", password: "password", role: "board", name: "Pat Rivera", communityId: "bonita-national" },
  { id: "u-cw-member", email: "member.demo@carrollwoodcc.com", password: "password", role: "member", name: "Jordan Blake", communityId: "carrollwood" },
  { id: "u-cw-member-social", email: "member.social@carrollwoodcc.com", password: "password", role: "member", name: "Casey Wells", communityId: "carrollwood" },
  { id: "u-cw-pm", email: "pm.demo@carrollwoodcc.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "carrollwood" },
  { id: "u-cw-board", email: "board.demo@carrollwoodcc.com", password: "password", role: "board", name: "Pat Rivera", communityId: "carrollwood" },
  { id: "u-wi-member", email: "member.demo@windsorflorida.com", password: "password", role: "member", name: "Jordan Blake", communityId: "windsor" },
  { id: "u-wi-member-social", email: "member.social@windsorflorida.com", password: "password", role: "member", name: "Casey Wells", communityId: "windsor" },
  { id: "u-wi-pm", email: "pm.demo@windsorflorida.com", password: "password", role: "pm", name: "Alex Morgan", communityId: "windsor" },
  { id: "u-wi-board", email: "board.demo@windsorflorida.com", password: "password", role: "board", name: "Pat Rivera", communityId: "windsor" },
  ...IRON_LAKE_DEMO_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    password: u.password,
    role: u.role,
    name: u.name,
    communityId: u.communityId,
  })),
];

// Idempotent seed — runs once when the database is empty.
let seedPromise: Promise<void> | null = null;

function newInviteCode(): string {
  return randomBytes(8).toString("hex");
}

export async function backfillBrandImages(): Promise<{ communities: number; providers: number }> {
  let communities = 0;
  let providers = 0;

  for (const [id, logoUrl] of Object.entries(communityLogoById)) {
    const row = await prisma.community.findUnique({ where: { id } });
    if (row && row.logoUrl !== logoUrl) {
      await prisma.community.update({ where: { id }, data: { logoUrl } });
      communities += 1;
    }
  }

  const providerRows = await prisma.provider.findMany({
    select: { id: true, category: true, type: true, imageUrl: true, name: true },
  });
  for (const p of providerRows) {
    const imageUrl = imageForProviderCategory(p.category, p.type, p.name);
    if (p.imageUrl === imageUrl) continue;
    await prisma.provider.update({ where: { id: p.id }, data: { imageUrl } });
    providers += 1;
  }

  return { communities, providers };
}

async function backfillInviteCodes(): Promise<void> {
  const communities = await prisma.community.findMany({
    select: { id: true, inviteCode: true },
  });
  for (const c of communities) {
    if (c.inviteCode) continue;
    await prisma.community.update({
      where: { id: c.id },
      data: { inviteCode: newInviteCode() },
    });
  }
}

async function backfillSeedUsers(): Promise<void> {
  for (const u of seedUsers) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: u.id }, { email: u.email }] },
    });
    if (existing) continue;
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        password: hashPassword(u.password),
        role: u.role,
        name: u.name,
        communityId: u.communityId ?? null,
      },
    });
  }
}

/** Rename legacy platform master login → superadmin@gmail.com. */
async function backfillSuperAdminIdentity(): Promise<void> {
  const OLD_EMAIL = "goldenocala01@gmail.com";
  const NEW_EMAIL = "superadmin@gmail.com";
  const oldUser = await prisma.user.findUnique({ where: { email: OLD_EMAIL } });
  const newUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });

  if (oldUser && !newUser) {
    await prisma.user.update({
      where: { id: oldUser.id },
      data: {
        email: NEW_EMAIL,
        name: "Easy Life Admin",
        role: "admin",
        communityId: null,
        password: hashPassword("password"),
      },
    });
  } else if (oldUser && newUser) {
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        name: "Easy Life Admin",
        role: "admin",
        communityId: null,
        password: hashPassword("password"),
      },
    });
    await prisma.user.delete({ where: { id: oldUser.id } }).catch(() => null);
  } else if (newUser) {
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        name: "Easy Life Admin",
        role: "admin",
        communityId: null,
      },
    });
  }

  const oldExt = await prisma.memberProfileExt.findUnique({
    where: { userEmail: OLD_EMAIL },
  });
  const newExt = await prisma.memberProfileExt.findUnique({
    where: { userEmail: NEW_EMAIL },
  });
  if (oldExt && !newExt) {
    await prisma.memberProfileExt.create({
      data: { ...oldExt, userEmail: NEW_EMAIL },
    });
    await prisma.memberProfileExt.delete({ where: { userEmail: OLD_EMAIL } });
  } else if (oldExt && newExt) {
    await prisma.memberProfileExt.delete({ where: { userEmail: OLD_EMAIL } }).catch(() => null);
  }
}

async function backfillSeedCommunities(): Promise<void> {
  for (const c of seedCommunities) {
    const existing = await prisma.community.findUnique({ where: { id: c.id } });
    if (existing) {
      await prisma.community.update({
        where: { id: c.id },
        data: {
          name: c.name,
          location: c.location,
          logoUrl: c.logoUrl ?? communityLogoById[c.id] ?? existing.logoUrl,
          primaryColor: c.primaryColor ?? existing.primaryColor,
          appDisplayName: c.appDisplayName ?? existing.appDisplayName,
          residentCount: Math.max(existing.residentCount, c.residentCount),
          serviceCount: Math.max(existing.serviceCount, c.serviceCount),
          activityCount: Math.max(existing.activityCount, c.activityCount),
        },
      });
      continue;
    }

    await prisma.community.create({
      data: {
        id: c.id,
        name: c.name,
        location: c.location,
        residentCount: c.residentCount,
        serviceCount: c.serviceCount,
        activityCount: c.activityCount,
        coverColor: c.coverColor,
        logoUrl: c.logoUrl ?? communityLogoById[c.id] ?? null,
        primaryColor: c.primaryColor ?? null,
        appDisplayName: c.appDisplayName ?? null,
        inviteCode: newInviteCode(),
        members: {
          create: [
            ...c.management.map((m) => ({
              name: m.name,
              role: m.role,
              isManagement: true,
            })),
            ...c.residents.slice(0, 60).map((r) => ({
              name: r.name,
              role: r.role,
              isManagement: false,
            })),
          ],
        },
        providers: {
          create: c.providers.map((p) => ({
            name: p.name,
            category: p.category,
            type: p.type,
            rating: p.rating ?? null,
            imageUrl: p.imageUrl ?? null,
          })),
        },
      },
    });
  }
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      if (isDemoSeedAllowed()) {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          await prisma.user.createMany({
            data: seedUsers.map((u) => ({
              id: u.id,
              email: u.email,
              password: hashPassword(u.password),
              role: u.role,
              name: u.name,
              communityId: u.communityId ?? null,
            })),
          });
        } else {
          await backfillSeedUsers();
        }
        const communityCount = await prisma.community.count();
        if (communityCount === 0) {
          for (const c of seedCommunities) {
            await prisma.community.create({
              data: {
                id: c.id,
                name: c.name,
                location: c.location,
                residentCount: c.residentCount,
                serviceCount: c.serviceCount,
                activityCount: c.activityCount,
                coverColor: c.coverColor,
                logoUrl: c.logoUrl ?? communityLogoById[c.id] ?? null,
                primaryColor: c.primaryColor ?? null,
                appDisplayName: c.appDisplayName ?? null,
                inviteCode: newInviteCode(),
                members: {
                  create: [
                    ...c.management.map((m) => ({
                      name: m.name,
                      role: m.role,
                      isManagement: true,
                    })),
                    ...c.residents.slice(0, 60).map((r) => ({
                      name: r.name,
                      role: r.role,
                      isManagement: false,
                    })),
                  ],
                },
                providers: {
                  create: c.providers.map((p) => ({
                    name: p.name,
                    category: p.category,
                    type: p.type,
                    rating: p.rating ?? null,
                    imageUrl: p.imageUrl ?? null,
                  })),
                },
              },
            });
          }
        } else {
          await backfillSeedCommunities();
        }
      }
      await backfillInviteCodes();
      await backfillBrandImages();
      await backfillSuperAdminIdentity();
    })();
  }
  return seedPromise;
}

type CommunityRow = {
  id: string;
  name: string;
  location: string;
  residentCount: number;
  serviceCount: number;
  activityCount: number;
  coverColor: string;
  inviteCode: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  appDisplayName: string | null;
  customDomain: string | null;
  stagingMode: boolean;
  members: { id: string; name: string; role: string; isManagement: boolean }[];
  providers: {
    id: string;
    name: string;
    category: string;
    type: string;
    rating: number | null;
    imageUrl: string | null;
  }[];
};

function toCommunity(row: CommunityRow): Community {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    residentCount: row.residentCount,
    serviceCount: row.serviceCount,
    activityCount: row.activityCount,
    coverColor: row.coverColor,
    inviteCode: row.inviteCode ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    primaryColor: row.primaryColor ?? undefined,
    appDisplayName: row.appDisplayName ?? undefined,
    customDomain: row.customDomain ?? undefined,
    stagingMode: row.stagingMode,
    management: row.members
      .filter((m) => m.isManagement)
      .map((m) => ({ id: m.id, name: m.name, role: m.role, isManagement: true })),
    residents: row.members
      .filter((m) => !m.isManagement)
      .map((m) => ({ id: m.id, name: m.name, role: m.role, isManagement: false })),
    providers: row.providers.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      // Club lesson pros were historically typed "pro"; admin Activities tab expects "activity".
      type: (p.type === "service" ? "service" : "activity") as Provider["type"],
      rating: p.rating ?? undefined,
      imageUrl: p.imageUrl ?? undefined,
    })),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listCommunities(): Promise<Community[]> {
  await ensureSeeded();
  const rows = await prisma.community.findMany({
    include: { members: true, providers: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toCommunity);
}

export async function getCommunityById(
  id: string,
): Promise<Community | undefined> {
  await ensureSeeded();
  const row = await prisma.community.findUnique({
    where: { id },
    include: { members: true, providers: true },
  });
  return row ? toCommunity(row) : undefined;
}

export async function createCommunity(input: {
  name: string;
  city: string;
  state: string;
  adminName: string;
}): Promise<Community> {
  await ensureSeeded();
  let id = slugify(input.name) || `community-${Date.now()}`;
  if (await prisma.community.findUnique({ where: { id } })) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const row = await prisma.community.create({
    data: {
      id,
      name: input.name,
      location: `${input.city}, ${input.state}`,
      coverColor: "from-brand-400 to-brand-600",
      inviteCode: newInviteCode(),
      members: {
        create: [{ name: input.adminName, role: "Community Admin", isManagement: true }],
      },
    },
    include: { members: true, providers: true },
  });
  return toCommunity(row);
}

export async function addProviderToCommunity(
  communityId: string,
  input: {
    businessName: string;
    type: "service" | "activity";
    category: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    listingKind?: "club" | "local_pro";
    description?: string;
  },
): Promise<
  | {
      provider: Provider;
      otp?: string;
      emailSent?: boolean;
      emailError?: string;
    }
  | undefined
> {
  await ensureSeeded();
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });
  if (!community) return undefined;

  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  const created = await prisma.provider.create({
    data: {
      communityId,
      name: input.businessName,
      category: input.category,
      type: input.type,
      email,
      phone,
      listingKind: input.listingKind ?? "local_pro",
      description: input.description?.trim() || "",
    },
  });
  await prisma.community.update({
    where: { id: communityId },
    data:
      input.type === "service"
        ? { serviceCount: { increment: 1 } }
        : { activityCount: { increment: 1 } },
  });

  const provider: Provider = {
    id: created.id,
    name: created.name,
    category: created.category,
    type: created.type as Provider["type"],
    rating: created.rating ?? undefined,
    imageUrl: created.imageUrl ?? undefined,
  };

  let otp: string | undefined;
  let emailSent = false;
  let emailError: string | undefined;

  if (email) {
    otp = randomBytes(4).toString("hex");
    const existing = await prisma.user.findFirst({ where: { email } });
    const contactName =
      [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
      input.businessName;
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          password: hashPassword(otp),
          role: "provider",
          name: contactName,
          communityId,
          status: "active",
        },
      });
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashPassword(otp),
          role: "provider",
          name: contactName,
          communityId,
          status: "active",
        },
      });
    }

    const sent = await sendBusinessInvitationEmail({
      to: email,
      firstName: input.firstName?.trim() || contactName,
      communityName: community.name,
      otp,
    });
    emailSent = sent.ok;
    emailError = sent.error;
  }

  return { provider, otp, emailSent, emailError };
}

export async function deleteProvider(id: string): Promise<boolean> {
  await ensureSeeded();
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) return false;
  await prisma.$transaction([
    prisma.provider.delete({ where: { id } }),
    prisma.community.update({
      where: { id: provider.communityId },
      data:
        provider.type === "service"
          ? { serviceCount: { decrement: 1 } }
          : { activityCount: { decrement: 1 } },
    }),
  ]);
  return true;
}

export async function listAllProviders(): Promise<
  (Provider & { community: string })[]
> {
  await ensureSeeded();
  const rows = await prisma.provider.findMany({
    include: { community: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    type: p.type as Provider["type"],
    rating: p.rating ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    status: (p.status as Provider["status"]) ?? "active",
    community: p.community.name,
    communityId: p.communityId,
    email: p.email ?? undefined,
  }));
}

export async function findUserByEmail(
  email: string,
): Promise<AuthUser | undefined> {
  await ensureSeeded();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    // emails are stored as-seeded; fall back to case-insensitive scan
    const all = await prisma.user.findMany();
    const match = all.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return match
      ? {
          id: match.id,
          email: match.email,
          password: match.password,
          role: match.role as AuthUser["role"],
          name: match.name,
          communityId: match.communityId,
          status: (match.status as AuthUser["status"]) ?? "active",
          mfaEnabled: Boolean(
            (match as { mfaEnabled?: boolean }).mfaEnabled,
          ),
        }
      : undefined;
  }
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: user.role as AuthUser["role"],
    name: user.name,
    communityId: user.communityId,
    status: (user.status as AuthUser["status"]) ?? "active",
    mfaEnabled: Boolean((user as { mfaEnabled?: boolean }).mfaEnabled),
  };
}

export async function createUser(input: {
  email: string;
  password: string;
  role: AuthUser["role"];
  name: string;
  communityId?: string | null;
  status?: "active" | "pending" | "frozen";
}): Promise<AuthUser | { error: string }> {
  await ensureSeeded();
  const existing = await findUserByEmail(input.email);
  if (existing) return { error: "An account with this email already exists" };

  const communityId =
    input.communityId !== undefined
      ? input.communityId
      : defaultCommunityForRole(input.role);

  if (input.role !== "admin" && !communityId) {
    return { error: "A community is required for this account type" };
  }

  const status = input.status ?? "active";
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashPassword(input.password),
      role: input.role,
      name: input.name,
      communityId,
      status,
    },
  });
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: user.role as AuthUser["role"],
    name: user.name,
    communityId: user.communityId,
    status,
  };
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  communityId: string | null;
  communityName: string | null;
  status: "active" | "pending" | "frozen";
  createdAt: string;
};

export async function listAdminUsers(opts?: {
  communityId?: string | null;
}): Promise<AdminUserRow[]> {
  await ensureSeeded();
  const rows = await prisma.user.findMany({
    where: opts?.communityId ? { communityId: opts.communityId } : undefined,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const communities = await prisma.community.findMany({
    select: { id: true, name: true },
  });
  const nameById = new Map(communities.map((c) => [c.id, c.name]));
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as AuthUser["role"],
    communityId: u.communityId,
    communityName: u.communityId ? (nameById.get(u.communityId) ?? null) : null,
    status: (u.status as AdminUserRow["status"]) ?? "active",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function setUserStatus(
  id: string,
  status: "active" | "pending" | "frozen",
): Promise<AdminUserRow | null> {
  await ensureSeeded();
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await prisma.user.update({
    where: { id },
    data: { status },
  });
  const community = updated.communityId
    ? await prisma.community.findUnique({
        where: { id: updated.communityId },
        select: { name: true },
      })
    : null;
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role as AuthUser["role"],
    communityId: updated.communityId,
    communityName: community?.name ?? null,
    status: (updated.status as AdminUserRow["status"]) ?? "active",
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteUserAccount(id: string): Promise<boolean> {
  await ensureSeeded();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return false;

  // Remove provider listings tied to this email (if any).
  if (user.email) {
    const emailLower = user.email.toLowerCase();
    const providers = await prisma.provider.findMany({
      where: { email: { not: null } },
    });
    for (const p of providers) {
      if (p.email?.toLowerCase() === emailLower) {
        await deleteProvider(p.id);
      }
    }
    await prisma.providerSubscription.deleteMany({
      where: { userEmail: emailLower },
    });
    await prisma.pushSubscription.deleteMany({
      where: { userEmail: emailLower },
    });
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

export async function setProviderStatus(
  id: string,
  status: "active" | "frozen",
): Promise<(Provider & { community: string; email?: string }) | null> {
  await ensureSeeded();
  const existing = await prisma.provider.findUnique({
    where: { id },
    include: { community: { select: { name: true } } },
  });
  if (!existing) return null;

  const updated = await prisma.provider.update({
    where: { id },
    data: { status },
    include: { community: { select: { name: true } } },
  });

  // Freeze/unfreeze linked login when email is known.
  if (updated.email) {
    const emailLower = updated.email.toLowerCase();
    const users = await prisma.user.findMany();
    const match = users.find((u) => u.email.toLowerCase() === emailLower);
    if (match) {
      await prisma.user.update({
        where: { id: match.id },
        data: { status },
      });
    }
  }

  return {
    id: updated.id,
    name: updated.name,
    category: updated.category,
    type: updated.type as Provider["type"],
    rating: updated.rating ?? undefined,
    imageUrl: updated.imageUrl ?? undefined,
    status: (updated.status as Provider["status"]) ?? "active",
    community: updated.community.name,
    email: updated.email ?? undefined,
  };
}

export async function updateUserPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(password) },
  });
  return true;
}

export async function getAccountProfile(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, avatarUrl: true },
  });
  if (!row) return null;
  return {
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
  };
}

export async function updateUserAvatar(
  email: string,
  avatarUrl: string,
): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const row = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl },
    select: { avatarUrl: true },
  });
  return row.avatarUrl;
}

export async function registerClubAdmin(input: {
  email: string;
  password: string;
  name: string;
  communityName: string;
  city: string;
  state: string;
}): Promise<AuthUser | { error: string }> {
  const community = await createCommunity({
    name: input.communityName,
    city: input.city,
    state: input.state,
    adminName: input.name,
  });
  return createUser({
    email: input.email,
    password: input.password,
    name: input.name,
    role: "admin",
    communityId: community.id,
  });
}

export async function registerMember(input: {
  email: string;
  password: string;
  name: string;
  communityId: string;
  inviteCode?: string;
  unit?: string;
  role?: "member" | "provider";
  directoryVisible?: boolean;
}): Promise<AuthUser | { error: string }> {
  await ensureSeeded();
  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { id: true, inviteCode: true },
  });
  if (!community) return { error: "Community not found" };

  const requiresApproval = communityRequiresEnrollmentApproval(community.id);
  const invite = input.inviteCode?.trim() ?? "";
  // Oceanside: invite optional (self-enroll). Other clubs: invite required.
  if (!requiresApproval) {
    if (!invite) return { error: "Invite code is required" };
    if (!community.inviteCode) {
      return { error: "Community invite code is not configured" };
    }
    if (invite !== community.inviteCode) {
      return { error: "Invalid invite code for this community" };
    }
  } else if (invite && community.inviteCode && invite !== community.inviteCode) {
    return { error: "Invalid invite code for this community" };
  }

  const role = input.role ?? "member";
  if (requiresApproval && role === "member") {
    return createPendingResident({
      email: input.email,
      password: input.password,
      name: input.name,
      communityId: community.id,
      unit: input.unit ?? "",
      directoryVisible: input.directoryVisible,
    });
  }

  return createUser({
    email: input.email,
    password: input.password,
    name: input.name,
    role,
    communityId: community.id,
  });
}

export async function updateCommunityBranding(
  id: string,
  input: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    appDisplayName?: string | null;
    coverColor?: string;
    customDomain?: string | null;
    stagingMode?: boolean;
  },
): Promise<Community | undefined> {
  await ensureSeeded();
  try {
    const row = await prisma.community.update({
      where: { id },
      data: {
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        appDisplayName: input.appDisplayName,
        coverColor: input.coverColor,
        customDomain: input.customDomain,
        stagingMode: input.stagingMode,
      },
      include: { members: true, providers: true },
    });
    return toCommunity(row);
  } catch {
    return undefined;
  }
}

function tempPassword(): string {
  return `EL-${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 90 + 10)}`;
}

export async function onboardCommunityWithAdmin(input: {
  name: string;
  city: string;
  state: string;
  adminName: string;
  adminEmail: string;
}): Promise<
  | {
      community: Community;
      admin: AuthUser;
      tempPassword: string;
      inviteCode: string;
    }
  | { error: string }
> {
  const existing = await findUserByEmail(input.adminEmail);
  if (existing) return { error: "An account with this admin email already exists" };

  const community = await createCommunity({
    name: input.name,
    city: input.city,
    state: input.state,
    adminName: input.adminName,
  });

  const password = tempPassword();
  const admin = await createUser({
    email: input.adminEmail,
    password,
    name: input.adminName,
    role: "admin",
    communityId: community.id,
  });

  if ("error" in admin) return { error: admin.error };

  const row = await prisma.community.findUnique({
    where: { id: community.id },
    select: { inviteCode: true },
  });

  return {
    community,
    admin,
    tempPassword: password,
    inviteCode: row?.inviteCode ?? community.inviteCode ?? "",
  };
}

export async function getCommunityBranding(communityId: string) {
  await ensureSeeded();
  const row = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryColor: true,
      appDisplayName: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor ?? "#6366f1",
    appDisplayName: row.appDisplayName ?? row.name,
  };
}
