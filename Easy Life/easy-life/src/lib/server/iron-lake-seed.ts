import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import { ensureMembershipTiersSeeded } from "@/lib/server/membership";
import { ensureClubStaffSeeded } from "@/lib/server/residency";
import { ensureGrabGoSeeded } from "@/lib/server/grab-go";
import { defaultDailyHours, defaultDailyHoursWithClosed, formatHoursSummary } from "@/lib/hours";
import { brandAssets, imageForProviderCategory } from "@/lib/brand-assets";
import {
  IRON_LAKE_CLUB_STAFF,
  IRON_LAKE_COMMUNITY_ID,
  IRON_LAKE_DEMO_USERS,
  IRON_LAKE_LEGACY_ACTIVITY_PROVIDERS,
  IRON_LAKE_LESSON_PROS,
  IRON_LAKE_TIER_DEFINITIONS,
  IRON_LAKE_VENDORS,
  IRON_CREST_LAWN_BUSINESS_NAME,
  IRON_CREST_LAWN_PROVIDER_EMAIL,
} from "@/lib/iron-lake-demo";
import { IRON_LAKE_GUEST_FEES, IRON_LAKE_CLUB_CONTACT } from "@/lib/iron-lake-fees";
import { isDemoSeedAllowed } from "@/lib/server/demo-mode";
import { COURT_RAIN_MESSAGE, GOLF_RAIN_MESSAGE, easternDateOffset } from "@/lib/weather";
import {
  IRON_LAKE_GOLF_CLUBS_ITEM_ID,
  rentalEndDate,
  todayIsoDate,
} from "@/lib/rental-flex";
import { ironLakeGolfClubRentals } from "@/lib/member-data";
import { ensureSeedProviderOfferings } from "@/lib/server/project-management";

async function ensureIronLakeClubStaff() {
  await ensureClubStaffSeeded(IRON_LAKE_COMMUNITY_ID);
  for (const staff of IRON_LAKE_CLUB_STAFF) {
    const existing = await prisma.clubStaff.findFirst({
      where: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        OR: [{ email: staff.email }, { name: staff.name, department: staff.department }],
      },
    });
    if (existing) {
      await prisma.clubStaff.update({
        where: { id: existing.id },
        data: {
          name: staff.name,
          title: staff.title,
          department: staff.department,
          email: staff.email,
          phone: staff.phone,
          category: staff.category,
          sortOrder: staff.sortOrder,
          active: true,
        },
      });
      continue;
    }
    await prisma.clubStaff.create({
      data: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        ...staff,
      },
    });
  }
}

async function ensureIronLakeVendors() {
  for (const name of IRON_LAKE_LEGACY_ACTIVITY_PROVIDERS) {
    await prisma.provider.deleteMany({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name },
    });
  }

  for (const vendor of IRON_LAKE_VENDORS) {
    const existing = await prisma.provider.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name: vendor.name },
    });
    const imageUrl = imageForProviderCategory(vendor.category, vendor.type, vendor.name);
    const payload = {
      category: vendor.category,
      type: vendor.type,
      rating: vendor.rating,
      description: vendor.description,
      phone: vendor.phone,
      email: vendor.email,
      imageUrl,
      listingKind: vendor.listingKind,
    };
    if (existing) {
      await prisma.provider.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.provider.create({
        data: {
          communityId: IRON_LAKE_COMMUNITY_ID,
          name: vendor.name,
          ...payload,
        },
      });
    }
  }

  // Retire former golf-instructor provider login if still present.
  await prisma.user.deleteMany({
    where: { email: "quarryview.golf@theclubatironlake.com" },
  });
}

/** Club instructors for admin Activities and Private Lessons (not member Vendors). */
async function ensureIronLakeLessonPros() {
  // Promote any leftover club instructors still typed "pro" so Activities count is not 0.
  await prisma.provider.updateMany({
    where: {
      communityId: IRON_LAKE_COMMUNITY_ID,
      listingKind: "club",
      type: "pro",
    },
    data: { type: "activity" },
  });

  for (const pro of IRON_LAKE_LESSON_PROS) {
    const existing = await prisma.provider.findFirst({
      where: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        OR: [{ email: pro.email }, { name: pro.name }],
      },
    });
    const imageUrl = imageForProviderCategory(pro.category, pro.type, pro.name);
    const payload = {
      name: pro.name,
      category: pro.category,
      type: pro.type,
      rating: pro.rating,
      description: pro.description,
      phone: pro.phone,
      email: pro.email,
      imageUrl,
      listingKind: pro.listingKind,
    };
    if (existing) {
      await prisma.provider.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.provider.create({
        data: {
          communityId: IRON_LAKE_COMMUNITY_ID,
          ...payload,
        },
      });
    }
  }
}

type SeedChatLine = {
  authorEmail: string;
  authorName: string;
  body: string;
  /** Relative age so the inbox still feels recent after reseed. */
  hoursAgo: number;
};

type SeedChatThread = {
  id: string;
  kind: "dm" | "group";
  title: string | null;
  createdBy: string;
  participants: Array<{ email: string; name: string }>;
  messages: SeedChatLine[];
};

/**
 * Member Messages inbox for demo members (Caroline and peers).
 * Fixed thread ids keep the seed idempotent across deploys.
 * Safe to call from production inbox reads — IronCrest demo only.
 */
export async function ensureIronLakeDemoChats() {
  // Fast path: once the flagship thread exists with participants, skip the
  // multi-query repair loop (it was blowing Vercel serverless timeouts).
  const marker = await prisma.chatThread.findUnique({
    where: { id: "il-chat-caroline-golf-pro" },
    select: { id: true },
  });
  if (marker) {
    const participantCount = await prisma.chatParticipant.count({
      where: { threadId: "il-chat-caroline-golf-pro" },
    });
    if (participantCount >= 2) return;
  }

  const caroline = {
    email: "member.golf@theclubatironlake.com",
    name: "Caroline Whitmore",
  };
  const jordan = { email: "golf.pro@theclubatironlake.com", name: "Jordan Blake" };
  const alex = { email: "tennis.pro@theclubatironlake.com", name: "Alex Rivera" };
  const sam = { email: "pickleball.pro@theclubatironlake.com", name: "Sam Ortega" };
  const elena = { email: "member.social@theclubatironlake.com", name: "Elena Vargas" };
  const marcus = { email: "member.sports@theclubatironlake.com", name: "Marcus Hale" };
  const david = { email: "member.national@theclubatironlake.com", name: "David Chen" };
  const sophia = {
    email: "member.equestrian@theclubatironlake.com",
    name: "Sophia Langford",
  };
  const frontDesk = {
    email: "membership@theclubatironlake.com",
    name: "Chris Nolan",
  };
  const lawn = {
    email: IRON_CREST_LAWN_PROVIDER_EMAIL,
    name: IRON_CREST_LAWN_BUSINESS_NAME,
  };
  const pm = { email: "pm@ironcrest.com", name: "Natalie Brooks" };
  const board = { email: "board@ironcrest.com", name: "Robert Keene" };
  const clubAdmin = {
    email: "admin@theclubatironlake.com",
    name: "Iron Lake Club Admin",
  };

  const threads: SeedChatThread[] = [
    {
      id: "il-chat-caroline-golf-pro",
      kind: "dm",
      title: null,
      createdBy: caroline.email,
      participants: [caroline, jordan],
      messages: [
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Hi Jordan — any openings for a short-game lesson Thursday morning?",
          hoursAgo: 54,
        },
        {
          authorEmail: jordan.email,
          authorName: jordan.name,
          body: "Thursday 9:30 works on the practice green. Want me to block 45 minutes?",
          hoursAgo: 52,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Perfect — please book it. I’ll bring my 56° and putter.",
          hoursAgo: 50,
        },
        {
          authorEmail: jordan.email,
          authorName: jordan.name,
          body: "Confirmed. See you at the range pavilion at 9:30 — cart’s pulled if you want to roll straight out after.",
          hoursAgo: 4,
        },
      ],
    },
    {
      id: "il-chat-caroline-tennis-pro",
      kind: "dm",
      title: null,
      createdBy: caroline.email,
      participants: [caroline, alex],
      messages: [
        {
          authorEmail: alex.email,
          authorName: alex.name,
          body: "Caroline — Court 2 is open Saturday at 8am after irrigation dry-down. Still interested in that serve clinic?",
          hoursAgo: 40,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Yes! Can we do a 60-minute private instead of the group clinic?",
          hoursAgo: 38,
        },
        {
          authorEmail: alex.email,
          authorName: alex.name,
          body: "Absolutely. I’ve held Court 2 for you 8:00–9:00. Bring two cans of balls and we’ll work toss consistency.",
          hoursAgo: 36,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Locked in — thanks Alex.",
          hoursAgo: 18,
        },
      ],
    },
    {
      id: "il-chat-caroline-neighbor",
      kind: "dm",
      title: null,
      createdBy: elena.email,
      participants: [caroline, elena],
      messages: [
        {
          authorEmail: elena.email,
          authorName: elena.name,
          body: "Morning! Are you and Alex free for a porch wine at Lot 18 Friday? Marcus said he might swing by after pickleball.",
          hoursAgo: 30,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Love that — we can do 6:30. Want me to bring that cheese board from Clubhouse Dining?",
          hoursAgo: 28,
        },
        {
          authorEmail: elena.email,
          authorName: elena.name,
          body: "Yes please. I’ll chill a couple bottles. See you Friday!",
          hoursAgo: 12,
        },
      ],
    },
    {
      id: "il-chat-caroline-front-desk",
      kind: "dm",
      title: null,
      createdBy: caroline.email,
      participants: [caroline, frontDesk],
      messages: [
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Hi Chris — expecting a UPS delivery to Lot 42 this afternoon. Can front desk hold it if I’m on the course?",
          hoursAgo: 26,
        },
        {
          authorEmail: frontDesk.email,
          authorName: frontDesk.name,
          body: "Of course. We’ll log it under Whitmore / Lot 42 and text you when it arrives. Gate code guest list is current through Sunday.",
          hoursAgo: 24,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Appreciate it — package should be from Titleist Pro Shop online.",
          hoursAgo: 8,
        },
      ],
    },
    {
      id: "il-chat-caroline-pm",
      kind: "dm",
      title: null,
      createdBy: pm.email,
      participants: [caroline, pm],
      messages: [
        {
          authorEmail: pm.email,
          authorName: pm.name,
          body: "Caroline — ARC approved your courtyard hardscape revision. Contractor can start after Aug 1 once you post the deposit.",
          hoursAgo: 72,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Wonderful news. I’ll upload the insurance cert today. Any irrigation cutover notes for Iron Crest Lawn?",
          hoursAgo: 68,
        },
        {
          authorEmail: pm.email,
          authorName: pm.name,
          body: "Yes — they’ll pause common-area watering on your east side for two days. I’ll CC Iron Crest Lawn once deposit clears.",
          hoursAgo: 6,
        },
      ],
    },
    {
      id: "il-chat-caroline-board",
      kind: "dm",
      title: null,
      createdBy: board.email,
      participants: [caroline, board],
      messages: [
        {
          authorEmail: board.email,
          authorName: board.name,
          body: "Quick FYI: August board packet drops Thursday. Golf tee-sheet capacity and racquet pavilion resurfacing are on the agenda — comments welcome ahead of the 8/5 meeting.",
          hoursAgo: 20,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Thanks Robert. I’ll send notes on Saturday shotgun starts — evenings have been overcrowded on Lot 42 carts returning.",
          hoursAgo: 10,
        },
      ],
    },
    // Club admin Help Desk (/help-desk) — admin must be a participant or the inbox stays empty.
    {
      id: "il-chat-admin-caroline-gate",
      kind: "dm",
      title: null,
      createdBy: caroline.email,
      participants: [clubAdmin, caroline],
      messages: [
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Hi — our guest for Saturday dinner doesn’t have a transponder. Can Front Desk issue a day pass and pre-clear plate FL-7KRP42?",
          hoursAgo: 22,
        },
        {
          authorEmail: clubAdmin.email,
          authorName: clubAdmin.name,
          body: "Yes. I’ve added FL-7KRP42 to the guest list through Sunday 11pm. Entry gate will auto-prompt Front Desk; host Whitmore / Lot 42.",
          hoursAgo: 20,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Perfect — they’ll arrive around 5:45 for Clubhouse Dining.",
          hoursAgo: 5,
        },
      ],
    },
    {
      id: "il-chat-admin-marcus-courts",
      kind: "dm",
      title: null,
      createdBy: marcus.email,
      participants: [clubAdmin, marcus],
      messages: [
        {
          authorEmail: marcus.email,
          authorName: marcus.name,
          body: "Court 3 lights stayed on after our 7pm pickleball. Can maintenance kill the timer? Lot 7.",
          hoursAgo: 14,
        },
        {
          authorEmail: clubAdmin.email,
          authorName: clubAdmin.name,
          body: "Logged a work order — lights should cut at 8:00. If they’re still on after 8:15, reply here and we’ll send night ops.",
          hoursAgo: 12,
        },
        {
          authorEmail: marcus.email,
          authorName: marcus.name,
          body: "They cut at 8:02. Thanks!",
          hoursAgo: 3,
        },
      ],
    },
    {
      id: "il-chat-admin-elena-dining",
      kind: "dm",
      title: null,
      createdBy: elena.email,
      participants: [clubAdmin, elena],
      messages: [
        {
          authorEmail: elena.email,
          authorName: elena.name,
          body: "Can you hold a lakeside table for 4 this Friday at 7? Social dining — Vargas / Lot 18.",
          hoursAgo: 40,
        },
        {
          authorEmail: clubAdmin.email,
          authorName: clubAdmin.name,
          body: "Held Table 12 (lakeside) Friday 7:00–8:30. Confirmation is on your Activities upcoming list.",
          hoursAgo: 38,
        },
      ],
    },
    {
      id: "il-chat-admin-pm-ops",
      kind: "dm",
      title: null,
      createdBy: pm.email,
      participants: [clubAdmin, pm],
      messages: [
        {
          authorEmail: pm.email,
          authorName: pm.name,
          body: "Member gate LPR + transponder readers go live Monday. Please keep Front Desk on the dual-read feed — entry and exit events should land in check-ins.",
          hoursAgo: 28,
        },
        {
          authorEmail: clubAdmin.email,
          authorName: clubAdmin.name,
          body: "Understood. Staff briefed — unknown plates still ring the desk; known transponders auto-populate the member name and lot.",
          hoursAgo: 26,
        },
        {
          authorEmail: pm.email,
          authorName: pm.name,
          body: "Great. I’ll send the Iron Crest Lawn vendor plate list separately for the service lane.",
          hoursAgo: 9,
        },
      ],
    },
    {
      id: "il-chat-neighbors-group",
      kind: "group",
      title: "IronCrest Neighbors — Lot 7 / 18 / 42",
      createdBy: marcus.email,
      participants: [caroline, elena, marcus],
      messages: [
        {
          authorEmail: marcus.email,
          authorName: marcus.name,
          body: "Anyone free for pickleball Sunday 4pm? Courts 3–4 are open after juniors wrap.",
          hoursAgo: 16,
        },
        {
          authorEmail: elena.email,
          authorName: elena.name,
          body: "I’m in. Caroline?",
          hoursAgo: 15,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Count me in — I’ll grab paddles from the pro shop.",
          hoursAgo: 3,
        },
      ],
    },
    {
      id: "il-chat-caroline-lawn",
      kind: "dm",
      title: null,
      createdBy: caroline.email,
      participants: [caroline, lawn],
      messages: [
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Can you trim the hedges along Lot 42 before Saturday’s dinner guests?",
          hoursAgo: 20,
        },
        {
          authorEmail: lawn.email,
          authorName: lawn.name,
          body: "Yes — Friday morning works. We’ll edge the walk and haul debris same day.",
          hoursAgo: 18,
        },
        {
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: "Perfect. Gate pin is on the guest list under Whitmore.",
          hoursAgo: 7,
        },
      ],
    },
    {
      id: "il-chat-marcus-pickle",
      kind: "dm",
      title: null,
      createdBy: marcus.email,
      participants: [marcus, sam],
      messages: [
        {
          authorEmail: marcus.email,
          authorName: marcus.name,
          body: "Sam — any openings for a private pickleball lesson this week?",
          hoursAgo: 28,
        },
        {
          authorEmail: sam.email,
          authorName: sam.name,
          body: "Thursday 10:00 on Court 2 works. Bring both paddles — we’ll work third-shot drops.",
          hoursAgo: 26,
        },
        {
          authorEmail: marcus.email,
          authorName: marcus.name,
          body: "Booked. See you Thursday.",
          hoursAgo: 11,
        },
      ],
    },
    {
      id: "il-chat-elena-dining",
      kind: "dm",
      title: null,
      createdBy: elena.email,
      participants: [elena, frontDesk],
      messages: [
        {
          authorEmail: elena.email,
          authorName: elena.name,
          body: "Hi Chris — can Clubhouse Restaurant hold a lakeside table for 4 Friday at 7?",
          hoursAgo: 34,
        },
        {
          authorEmail: frontDesk.email,
          authorName: frontDesk.name,
          body: "Held Table 12 for Vargas / Lot 18. Confirmation is on your Activities list.",
          hoursAgo: 32,
        },
      ],
    },
    {
      id: "il-chat-david-golf",
      kind: "dm",
      title: null,
      createdBy: david.email,
      participants: [david, jordan],
      messages: [
        {
          authorEmail: david.email,
          authorName: david.name,
          body: "Jordan — visiting this weekend as National Golf. Any twilight tips on the quarry holes?",
          hoursAgo: 22,
        },
        {
          authorEmail: jordan.email,
          authorName: jordan.name,
          body: "Play 12–15 carefully — left is dead. Range opens 6:30 Saturday; I’ll pull a cart if you want a playing lesson.",
          hoursAgo: 19,
        },
        {
          authorEmail: david.email,
          authorName: david.name,
          body: "I’ll take the 2pm playing lesson Saturday. Thanks.",
          hoursAgo: 8,
        },
      ],
    },
    {
      id: "il-chat-sophia-spa",
      kind: "dm",
      title: null,
      createdBy: sophia.email,
      participants: [sophia, frontDesk],
      messages: [
        {
          authorEmail: sophia.email,
          authorName: sophia.name,
          body: "Can you book a 60-minute massage at Spa & Wellness Tuesday afternoon?",
          hoursAgo: 40,
        },
        {
          authorEmail: frontDesk.email,
          authorName: frontDesk.name,
          body: "Done — Tuesday 2:00 with Priya’s team. Locker key at Front Desk.",
          hoursAgo: 38,
        },
        {
          authorEmail: sophia.email,
          authorName: sophia.name,
          body: "Thank you!",
          hoursAgo: 14,
        },
      ],
    },
  ];

  for (const thread of threads) {
    const existing = await prisma.chatThread.findUnique({ where: { id: thread.id } });
    if (!existing) {
      const lastHoursAgo = Math.min(...thread.messages.map((m) => m.hoursAgo));
      const updatedAt = new Date(Date.now() - lastHoursAgo * 60 * 60 * 1000);

      await prisma.chatThread.create({
        data: {
          id: thread.id,
          communityId: IRON_LAKE_COMMUNITY_ID,
          kind: thread.kind,
          title: thread.title,
          createdBy: thread.createdBy.toLowerCase(),
          updatedAt,
        },
      });

      await prisma.chatParticipant.createMany({
        data: thread.participants.map((p) => ({
          threadId: thread.id,
          userEmail: p.email.toLowerCase(),
          userName: p.name,
        })),
      });

      for (const msg of thread.messages) {
        await prisma.chatMessage.create({
          data: {
            id: `${thread.id}-m${msg.hoursAgo}`,
            threadId: thread.id,
            authorEmail: msg.authorEmail.toLowerCase(),
            authorName: msg.authorName,
            body: msg.body,
            createdAt: new Date(Date.now() - msg.hoursAgo * 60 * 60 * 1000),
          },
        });
      }
      continue;
    }

    // Repair missing participants so every demo member still sees their inbox.
    for (const p of thread.participants) {
      const has = await prisma.chatParticipant.findFirst({
        where: { threadId: thread.id, userEmail: p.email.toLowerCase() },
      });
      if (!has) {
        await prisma.chatParticipant.create({
          data: {
            threadId: thread.id,
            userEmail: p.email.toLowerCase(),
            userName: p.name,
          },
        });
      }
    }
  }
}

type SeedPrivateLine = {
  id: string;
  channel: "board" | "pm";
  author: string;
  body: string;
  /** Relative age so the board still feels recent after reseed. */
  hoursAgo: number;
};

/**
 * Board / PM private message boards (PrivateMessage, channels board + pm).
 * Fixed ids keep the seed idempotent across deploys.
 */
async function ensureIronLakePrivateMessages() {
  const lines: SeedPrivateLine[] = [
    {
      id: "il-priv-board-budget",
      channel: "board",
      author: "Robert Keene",
      body:
        "Board packet for the Aug 5 meeting is attached in Documents. Please review the draft 2027 dues schedule and capital reserve draw before Thursday — Budget Workshop notes are in the packet appendix.",
      hoursAgo: 72,
    },
    {
      id: "il-priv-board-irrigation",
      channel: "board",
      author: "Natalie Brooks",
      body:
        "Heads up: green-clay tennis irrigation dry-down runs daily 12:00–1:30 PM through Labor Day. Courts 1–7 stay closed during that window; I’ve posted the hours note on the amenity page and alerted Front Desk.",
      hoursAgo: 48,
    },
    {
      id: "il-priv-board-rain",
      channel: "board",
      author: "Natalie Brooks",
      body:
        "Weather desk: rain advisory is active for tomorrow. Tennis, pickleball, Championship Golf, and the driving range stay closed until surfaces dry — Front Desk will clear the advisory in the app when playable.",
      hoursAgo: 10,
    },
    {
      id: "il-priv-board-membership",
      channel: "board",
      author: "Diane Walsh",
      body:
        "Membership Committee: we’re at 48 resident members with three National Golf applications pending. Recommend we hold the waitlist policy discussion at the Aug 5 meeting before approving any guest-member conversions.",
      hoursAgo: 36,
    },
    {
      id: "il-priv-board-bids",
      channel: "board",
      author: "Natalie Brooks",
      body:
        "Vendor bids uploaded for board review: Quarry Security Systems — Gate & access control upgrade ($48,500, under review) and Stone Creek Mechanical — Clubhouse HVAC replacement ($126,000, received). Pool deck resealing with Quarry Pool is already accepted.",
      hoursAgo: 20,
    },
    {
      id: "il-priv-board-reply",
      channel: "board",
      author: "Robert Keene",
      body:
        "Thanks Natalie — I’ll flag HVAC for a deep dive at the meeting. Diane, please bring the National Golf waitlist memo. Irrigation dry-down notice looks good; no board action needed.",
      hoursAgo: 6,
    },
    {
      id: "il-priv-pm-invoices",
      channel: "pm",
      author: "Natalie Brooks",
      body:
        "July landscape invoice from Iron Crest Lawn & Landscape ($12,500) and the Stone Creek emergency HVAC call ($940) are in Approvals for board sign-off. Pool chemical service already cleared.",
      hoursAgo: 30,
    },
    {
      id: "il-priv-pm-reply",
      channel: "pm",
      author: "Robert Keene",
      body:
        "Approved the Iron Crest Lawn invoice on my end. Hold the HVAC emergency line until we compare it against the full clubhouse replacement bid — don’t want to double-pay diagnostics.",
      hoursAgo: 14,
    },
    {
      id: "il-priv-pm-arc",
      channel: "pm",
      author: "Natalie Brooks",
      body:
        "ARC packet for Aug 12 is ready — three homesite elevations plus the Whitmore courtyard hardscape. I’ll bring printed sets to the Quarry Room.",
      hoursAgo: 4,
    },
  ];

  for (const line of lines) {
    const existing = await prisma.privateMessage.findUnique({ where: { id: line.id } });
    if (existing) continue;
    await prisma.privateMessage.create({
      data: {
        id: line.id,
        communityId: IRON_LAKE_COMMUNITY_ID,
        channel: line.channel,
        author: line.author,
        body: line.body,
        createdAt: new Date(Date.now() - line.hoursAgo * 60 * 60 * 1000),
      },
    });
  }
}

/**
 * Idempotent Iron Crest lawn provider portal fixtures:
 * offerings, inbox messages, promotions, and payment/refund history.
 */
async function ensureIronCrestLawnProviderPortal() {
  const cid = IRON_LAKE_COMMUNITY_ID;
  const lawnEmail = IRON_CREST_LAWN_PROVIDER_EMAIL;

  // Collapse duplicate lawn provider rows (Oak Canopy rename left twins).
  const lawnRows = await prisma.provider.findMany({
    where: {
      communityId: cid,
      OR: [
        { email: lawnEmail },
        { name: { in: ["Oak Canopy Estate Care", IRON_CREST_LAWN_BUSINESS_NAME] } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  const keep = lawnRows[0];
  if (keep) {
    await prisma.provider.update({
      where: { id: keep.id },
      data: {
        name: IRON_CREST_LAWN_BUSINESS_NAME,
        category: "Lawn Maintenance",
        email: lawnEmail,
        imageUrl: brandAssets.serviceLandscaping,
        listingKind: "local_pro",
        rating: 4.7,
      },
    });
    if (lawnRows.length > 1) {
      await prisma.provider.deleteMany({
        where: { id: { in: lawnRows.slice(1).map((r) => r.id) } },
      });
    }
  } else {
    await prisma.provider.updateMany({
      where: {
        communityId: cid,
        name: { in: ["Oak Canopy Estate Care", IRON_CREST_LAWN_BUSINESS_NAME] },
      },
      data: {
        name: IRON_CREST_LAWN_BUSINESS_NAME,
        category: "Lawn Maintenance",
        email: lawnEmail,
        imageUrl: brandAssets.serviceLandscaping,
      },
    });
  }

  await ensureSeedProviderOfferings(lawnEmail);

  const messageSeeds = [
    {
      senderName: "Caroline Whitmore",
      senderEmail: "member.golf@theclubatironlake.com",
      recipient: lawnEmail,
      subject: "Hedge trimming before the weekend",
      message:
        "Hi — can your crew trim the podocarpus along our front walk before Saturday? Lot 42.",
    },
    {
      senderName: "Marcus Hale",
      senderEmail: "member.sports@theclubatironlake.com",
      recipient: lawnEmail,
      subject: "Brush removal quote",
      message:
        "We have a brush pile along the back fence after the storm. Can you quote forestry mulching for Lot 7?",
    },
    {
      senderName: IRON_CREST_LAWN_BUSINESS_NAME,
      senderEmail: lawnEmail,
      recipient: "member.sports@theclubatironlake.com",
      subject: "Re: Brush removal quote",
      message:
        "Marcus — we can mulch that back line Thursday morning. Estimate $450 for the full pass. Reply to confirm.",
    },
    {
      senderName: "Natalie Brooks",
      senderEmail: "pm@ironcrest.com",
      recipient: lawnEmail,
      subject: "July common-area mowing schedule",
      message:
        "Natalie from IronCrest PM — please confirm your crew for east common-area mowing July 14–16.",
    },
    {
      senderName: "Elena Vargas",
      senderEmail: "member.social@theclubatironlake.com",
      recipient: lawnEmail,
      subject: "Debris pick up",
      message: "Could you haul off a pile of limbs by our driveway after edging this week? Lot 18.",
    },
  ] as const;

  for (const msg of messageSeeds) {
    const exists = await prisma.contactMessage.findFirst({
      where: {
        recipient: msg.recipient,
        subject: msg.subject,
        message: msg.message,
      },
    });
    if (exists) continue;
    await prisma.contactMessage.create({
      data: { communityId: cid, ...msg },
    });
  }

  const promoSeeds = [
    {
      title: "15% off first hedge trim",
      type: "coupon",
      detail: "Code: IRONHEDGE15",
      status: "active",
      redemptions: 11,
    },
    {
      title: "Forestry mulching bundle — summer",
      type: "coupon",
      detail: "Code: MULCH25",
      status: "active",
      redemptions: 6,
    },
    {
      title: "Featured listing — IronCrest",
      type: "ppc",
      detail: "$0.95 / click · $175 budget",
      status: "active",
      redemptions: 84,
    },
  ] as const;

  for (const promo of promoSeeds) {
    const exists = await prisma.promotion.findFirst({
      where: { providerEmail: lawnEmail, title: promo.title },
    });
    if (exists) continue;
    await prisma.promotion.create({
      data: { providerEmail: lawnEmail, ...promo },
    });
  }

  const refundSeeds = [
    {
      bookingId: "il-sb1",
      bookingType: "service",
      title: "Weekly Lawn Care + Irrigation Check",
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      amountCents: 9500,
      reason: "Member requested credit — irrigation zone skipped during visit.",
      status: "refunded",
      paymentLabel: "VISA ··· 4821",
      dateLabel: "2026-07-08",
      timeLabel: "8:00 AM",
      locationLine1: "Lot 42, IronCrest",
      locationLine2: "Ocala, FL 34475",
      rateLabel: "$95",
    },
    {
      bookingId: "il-sb6",
      bookingType: "service",
      title: "Hedge Trimming",
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      amountCents: 14000,
      reason: "Payment captured — job completed.",
      status: "approved",
      paymentLabel: "AMEX ··· 9104",
      dateLabel: "2026-08-05",
      timeLabel: "8:30 AM",
      locationLine1: "Lot 42, IronCrest",
      locationLine2: "Ocala, FL 34475",
      rateLabel: "$140",
    },
    {
      bookingId: "il-sb9",
      bookingType: "service",
      title: "Lawn Mowing",
      memberEmail: "member.sports@theclubatironlake.com",
      memberName: "Marcus Hale",
      amountCents: 6500,
      reason: "Pending member review — edging missed along driveway.",
      status: "pending",
      paymentLabel: "VISA ··· 7281",
      dateLabel: "2026-08-22",
      timeLabel: "7:30 AM",
      locationLine1: "Lot 7, IronCrest",
      locationLine2: "Ocala, FL 34475",
      rateLabel: "$65",
    },
  ] as const;

  for (const refund of refundSeeds) {
    const exists = await prisma.refundRequest.findFirst({
      where: { providerEmail: lawnEmail, bookingId: refund.bookingId },
    });
    if (exists) continue;
    await prisma.refundRequest.create({
      data: {
        communityId: cid,
        providerEmail: lawnEmail,
        ...refund,
      },
    });
  }
}

const IRON_CREST_DINING_EMAIL = "dining@theclubatironlake.com";
const IRON_CREST_DINING_NAME = "Clubhouse Dining";

/**
 * Clubhouse Dining provider portal — menu-led F&B (not lawn/cleaning stubs).
 */
async function ensureIronCrestDiningProviderPortal() {
  const cid = IRON_LAKE_COMMUNITY_ID;
  const diningEmail = IRON_CREST_DINING_EMAIL;

  await prisma.user.upsert({
    where: { email: diningEmail },
    create: {
      id: "u-il-dining",
      email: diningEmail,
      password: hashPassword("password"),
      role: "provider",
      name: IRON_CREST_DINING_NAME,
      communityId: cid,
    },
    update: {
      name: IRON_CREST_DINING_NAME,
      role: "provider",
      communityId: cid,
      password: hashPassword("password"),
    },
  });

  await ensureSeedProviderOfferings(diningEmail);

  const menuSeeds = [
    { name: "Quarry Burger", price: 18, category: "Entrees" },
    { name: "Iron Lake Caesar", price: 14, category: "Salads" },
    { name: "Catch of the Day", price: 28, category: "Entrees" },
    { name: "Clubhouse Iced Tea", price: 4, category: "Beverages" },
    { name: "Quarry View Flatbread", price: 16, category: "Entrees" },
    { name: "Key Lime Tart", price: 9, category: "Desserts" },
    { name: "Member Mimosa", price: 12, category: "Beverages" },
    { name: "House Soup", price: 8, category: "Starters" },
  ] as const;

  for (const row of menuSeeds) {
    const exists = await prisma.menuItem.findFirst({
      where: { providerEmail: diningEmail, name: row.name },
    });
    if (exists) {
      await prisma.menuItem.update({
        where: { id: exists.id },
        data: { price: row.price, category: row.category, available: true },
      });
      continue;
    }
    await prisma.menuItem.create({
      data: {
        providerEmail: diningEmail,
        name: row.name,
        price: row.price,
        category: row.category,
        available: true,
      },
    });
  }

  const messageSeeds = [
    {
      senderName: "Caroline Whitmore",
      senderEmail: "member.golf@theclubatironlake.com",
      recipient: diningEmail,
      subject: "Table for two — Saturday 6:30",
      message:
        "Hi — can you hold a terrace table for two Saturday at 6:30? We’ll order the Catch of the Day.",
    },
    {
      senderName: IRON_CREST_DINING_NAME,
      senderEmail: diningEmail,
      recipient: "member.golf@theclubatironlake.com",
      subject: "Re: Table for two — Saturday 6:30",
      message:
        "Confirmed — Table 6 on the terrace. We’ve noted Catch of the Day for both covers.",
    },
    {
      senderName: "Elena Vargas",
      senderEmail: "member.social@theclubatironlake.com",
      recipient: diningEmail,
      subject: "Birthday dessert",
      message: "Can kitchen add a key lime tart with a candle for Lot 18 Friday lunch?",
    },
    {
      senderName: "Natalie Brooks",
      senderEmail: "pm@ironcrest.com",
      recipient: diningEmail,
      subject: "Board dinner headcount",
      message: "Quarry Room private dining Aug 5 — final headcount is 12. Confirm set menu.",
    },
    {
      senderName: "Marcus Hale",
      senderEmail: "member.sports@theclubatironlake.com",
      recipient: diningEmail,
      subject: "Wine pairing availability",
      message: "Any openings for the wine pairing dinner next Saturday for two?",
    },
  ] as const;

  for (const msg of messageSeeds) {
    const exists = await prisma.contactMessage.findFirst({
      where: {
        recipient: msg.recipient,
        subject: msg.subject,
        message: msg.message,
      },
    });
    if (exists) continue;
    await prisma.contactMessage.create({
      data: { communityId: cid, ...msg },
    });
  }

  const promoSeeds = [
    {
      title: "Weeknight terrace special",
      type: "coupon",
      detail: "Code: TERRACE15 · 15% off Tuesday–Thursday dinners",
      status: "active",
      redemptions: 22,
    },
    {
      title: "Member brunch boost",
      type: "coupon",
      detail: "Code: BRUNCH10 · complimentary mimosa with brunch entrée",
      status: "active",
      redemptions: 14,
    },
    {
      title: "Featured — Clubhouse Dining",
      type: "ppc",
      detail: "$0.80 / click · $120 budget",
      status: "active",
      redemptions: 61,
    },
  ] as const;

  for (const promo of promoSeeds) {
    const exists = await prisma.promotion.findFirst({
      where: { providerEmail: diningEmail, title: promo.title },
    });
    if (exists) continue;
    await prisma.promotion.create({
      data: { providerEmail: diningEmail, ...promo },
    });
  }

  const refundSeeds = [
    {
      bookingId: "il-din-6",
      bookingType: "service",
      title: "Member Mixer — Appetizers",
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      amountCents: 38000,
      reason: "Payment captured — reception completed.",
      status: "approved",
      paymentLabel: "VISA ··· 4821",
      dateLabel: easternDateOffset(-8),
      timeLabel: "5:30 PM",
      locationLine1: "Clubhouse terrace",
      locationLine2: "Iron Lake Clubhouse",
      rateLabel: "$380",
    },
    {
      bookingId: "il-din-1",
      bookingType: "service",
      title: "Clubhouse Dinner for Two",
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      amountCents: 8500,
      reason: "Pending — deposit held for Saturday terrace table.",
      status: "pending",
      paymentLabel: "AMEX ··· 9104",
      dateLabel: easternDateOffset(2),
      timeLabel: "6:30 PM",
      locationLine1: "Table 6 · Terrace",
      locationLine2: "Iron Lake Clubhouse",
      rateLabel: "$85",
    },
    {
      bookingId: "il-din-3",
      bookingType: "service",
      title: "Wine Pairing Dinner",
      memberEmail: "member.sports@theclubatironlake.com",
      memberName: "Marcus Hale",
      amountCents: 14500,
      reason: "Member asked to move seating — kitchen credit pending.",
      status: "pending",
      paymentLabel: "VISA ··· 7281",
      dateLabel: easternDateOffset(6),
      timeLabel: "7:00 PM",
      locationLine1: "Clubhouse Restaurant",
      locationLine2: "Iron Lake Clubhouse",
      rateLabel: "$145",
    },
  ] as const;

  for (const refund of refundSeeds) {
    const exists = await prisma.refundRequest.findFirst({
      where: { providerEmail: diningEmail, bookingId: refund.bookingId },
    });
    if (exists) continue;
    await prisma.refundRequest.create({
      data: {
        communityId: cid,
        providerEmail: diningEmail,
        ...refund,
      },
    });
  }
}

/**
 * Idempotent IronCrest / Club at Iron Lake demo fixtures:
 * amenities, membership tiers, role users, vendors, sample bookings.
 */
export async function ensureIronLakeDemoSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  const community = await prisma.community.findUnique({
    where: { id: IRON_LAKE_COMMUNITY_ID },
  });
  if (!community) return;

  await ensureMembershipTiersSeeded(IRON_LAKE_COMMUNITY_ID);
  await ensureIronLakeClubStaff();
  await ensureIronLakeLessonPros();
  await ensureGrabGoSeeded(IRON_LAKE_COMMUNITY_ID);

  // Free the shared provider user id / email before upserting the lawn vendor login.
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "quarryview.golf@theclubatironlake.com" },
        { id: "u-il-provider", email: { not: "lawn@ironcrest.services" } },
      ],
    },
  });

  // Align legacy seed names with the Membership Plan (May 2026) facility list.
  const amenityRenames: Array<{ from: string; to: string; unitCount?: number }> = [
    { from: "Clay Tennis Courts", to: "Tennis Courts", unitCount: 7 },
    { from: "Driving Range & Practice", to: "Driving Range & Putting Green" },
    { from: "Resort Pool", to: "Swimming Pool" },
    { from: "Quarry Room Dining", to: "Clubhouse Dining" },
  ];
  for (const rename of amenityRenames) {
    const row = await prisma.amenity.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name: rename.from },
    });
    if (!row) continue;
    const collision = await prisma.amenity.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name: rename.to },
    });
    if (collision) {
      await prisma.amenity.delete({ where: { id: row.id } });
    } else {
      await prisma.amenity.update({
        where: { id: row.id },
        data: {
          name: rename.to,
          ...(rename.unitCount != null ? { unitCount: rename.unitCount } : {}),
        },
      });
    }
    await prisma.booking.updateMany({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, amenity: rename.from },
      data: { amenity: rename.to },
    });
  }

  for (const u of IRON_LAKE_DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        email: u.email,
        password: hashPassword(u.password),
        role: u.role,
        name: u.name,
        communityId: IRON_LAKE_COMMUNITY_ID,
      },
      update: {
        name: u.name,
        role: u.role,
        communityId: IRON_LAKE_COMMUNITY_ID,
        password: hashPassword(u.password),
      },
    });

    if ("tier" in u && u.tier) {
      await prisma.memberProfileExt.upsert({
        where: { userEmail: u.email },
        create: {
          userEmail: u.email,
          membershipTier: u.tier,
          residencyStatus: u.unit === "Guest Member" ? "non_resident" : "resident",
          paysHoa: u.unit !== "Guest Member",
          unit: u.unit,
          householdAddress: `${u.unit}, IronCrest, Ocala, FL 34475`,
        },
        update: {
          membershipTier: u.tier,
          unit: u.unit,
          householdAddress: `${u.unit}, IronCrest, Ocala, FL 34475`,
        },
      });
    }
  }

  await ensureIronLakeVendors();

  const publishedHours = defaultDailyHours(
    IRON_LAKE_CLUB_CONTACT.publishedHoursOpen,
    IRON_LAKE_CLUB_CONTACT.publishedHoursClose,
  );
  const hoursNote = `Published club hours: ${IRON_LAKE_CLUB_CONTACT.publishedHoursLabel}.`;
  /** Green-clay tennis: above-ground irrigation + dry-down mid-day. */
  const tennisIrrigationClosed = [
    {
      start: "12:00",
      end: "13:30",
      reason: "Above-ground irrigation and green-clay dry-down",
    },
  ];
  const tennisHours = defaultDailyHoursWithClosed(
    IRON_LAKE_CLUB_CONTACT.publishedHoursOpen,
    IRON_LAKE_CLUB_CONTACT.publishedHoursClose,
    tennisIrrigationClosed,
  );
  const tennisHoursNote =
    `${hoursNote} Green clay surface with above-ground irrigation — courts closed ` +
    `12:00–1:30 PM daily for watering and dry-down.`;

  async function upsertAmenity(data: {
    name: string;
    description: string;
    fee: number;
    kind: string;
    unitCount: number;
    hoursJson: ReturnType<typeof defaultDailyHours>;
    holes?: number;
    surface?: string;
  }) {
    const existing = await prisma.amenity.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name: data.name },
    });
    const payload = {
      description: data.description,
      fee: data.fee,
      kind: data.kind,
      unitCount: data.unitCount,
      holes: data.holes ?? null,
      surface: data.surface ?? null,
      hoursJson: JSON.stringify(data.hoursJson),
      schedule: formatHoursSummary(data.hoursJson),
    };
    if (existing) {
      await prisma.amenity.update({ where: { id: existing.id }, data: payload });
      return existing.id;
    }
    const created = await prisma.amenity.create({
      data: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        name: data.name,
        ...payload,
      },
    });
    return created.id;
  }

  await upsertAmenity({
    name: "Championship Golf Course",
    description:
      "18-hole championship golf course carved through quarry terrain, with spring-fed lakes and elevation. Practice facilities include a range and putting green. Cart fee $" +
      IRON_LAKE_GUEST_FEES.cartPerRound +
      "/player/round. " +
      hoursNote,
    fee: 0,
    kind: "golf_course",
    unitCount: 4,
    hoursJson: publishedHours,
    holes: 18,
  });

  await upsertAmenity({
    name: "Driving Range & Putting Green",
    description: "Golf practice facilities — range and putting green. " + hoursNote,
    fee: 0,
    kind: "driving_range",
    unitCount: 16,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Tennis Courts",
    description:
      "7 lighted green-clay tennis courts with above-ground irrigation. " +
      "Guest court fee $" +
      IRON_LAKE_GUEST_FEES.courtAccompanied +
      " accompanied / $" +
      IRON_LAKE_GUEST_FEES.courtUnaccompanied +
      " unaccompanied. Tennis ball machine available to rent ($" +
      IRON_LAKE_GUEST_FEES.tennisBallMachinePerHour +
      "/hour). " +
      tennisHoursNote,
    fee: 0,
    kind: "court",
    unitCount: 7,
    hoursJson: tennisHours,
    surface: "green_clay",
  });

  await upsertAmenity({
    name: "Pickleball Courts",
    description: "4 pickleball courts. " + hoursNote,
    fee: 0,
    kind: "pickleball",
    unitCount: 4,
    hoursJson: publishedHours,
    surface: "hard",
  });

  await upsertAmenity({
    name: "Iron Lake Clubhouse",
    description:
      "37,000 sq ft clubhouse with one onsite restaurant, full-service golf shop, and men’s and women’s locker rooms — overlooking the quarry lakes. " +
      hoursNote,
    fee: 0,
    kind: "clubhouse",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Spa & Wellness",
    description: "Spa within the swim and fitness complex. " + hoursNote,
    fee: 95,
    kind: "spa",
    unitCount: 4,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Fitness Center",
    description:
      "Open gym within the swim and fitness complex — free weights, cardio, and stretch floor. Walk-in access; book Zumba, Cycling, or Strength Circuit for classes. " +
      hoursNote,
    fee: 0,
    kind: "gym",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  // Bookable group fitness classes (members reserve a class, not the whole gym/pool).
  const fitnessClasses: Array<{ name: string; description: string }> = [
    {
      name: "Zumba",
      description: "High-energy dance fitness in Studio A. Drop-in welcome; bring water. ",
    },
    {
      name: "Indoor Cycling",
      description: "Instructor-led spin class in the cycling studio. Clip-in optional. ",
    },
    {
      name: "Pilates Mat",
      description: "Core-focused mat Pilates with club instructor. Mats provided. ",
    },
    {
      name: "Strength Circuit",
      description: "Small-group strength circuit on the fitness floor. ",
    },
    {
      name: "Water Aerobics",
      description:
        "Low-impact aqua fitness in the swim complex. No lap-lane reservation — join the class. ",
    },
  ];
  for (const cls of fitnessClasses) {
    await upsertAmenity({
      name: cls.name,
      description: cls.description + hoursNote,
      fee: 0,
      kind: "fitness_class",
      unitCount: 1,
      hoursJson: publishedHours,
    });
  }

  await upsertAmenity({
    name: "Swimming Pool",
    description:
      "Open swim and lap lanes within the swim and fitness complex — walk-in access for members. Book Water Aerobics for instructor-led classes. " +
      hoursNote,
    fee: 0,
    kind: "pool",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Clubhouse Restaurant",
    description:
      "The club’s one onsite restaurant, located in the clubhouse. " + hoursNote,
    fee: 0,
    kind: "restaurant",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Golf Pro Shop",
    description: "Full-service golf shop in the clubhouse. " + hoursNote,
    fee: 0,
    kind: "store",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "Locker Rooms",
    description:
      "Men’s and women’s locker rooms in the clubhouse. Day locker access complimentary; personal lockers available annually. " +
      hoursNote,
    fee: 0,
    kind: "facility",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "EV Charging Stations",
    description:
      "Two on-site electric vehicle charging stations for members and guests. Reserve a station while on property. " +
      hoursNote,
    fee: 0,
    kind: "facility",
    unitCount: 2,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "5th Floor Sky Suite",
    description: "Tower lodging — $550 per night. " + hoursNote,
    fee: 550,
    kind: "lodging",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "3rd Floor Executive King Bedroom",
    description: "Tower lodging — $375 per night. " + hoursNote,
    fee: 375,
    kind: "lodging",
    unitCount: 4,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "3rd Floor Dual Executive King Reservation",
    description: "Two Executive King bedrooms reserved together — $575 per night. " + hoursNote,
    fee: 575,
    kind: "lodging",
    unitCount: 2,
    hoursJson: publishedHours,
  });

  await upsertAmenity({
    name: "4th Floor Event Space",
    description:
      "Event space — $150 per hour, or bespoke charge for special events greater than 3 hours. " +
      hoursNote,
    fee: 150,
    kind: "event_space",
    unitCount: 1,
    hoursJson: publishedHours,
  });

  // Prefer a single clubhouse restaurant; retire older dining labels.
  for (const legacyName of ["Clubhouse Dining", "Quarry Room Dining"]) {
    const legacy = await prisma.amenity.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name: legacyName },
    });
    if (!legacy) continue;
    await prisma.booking.updateMany({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, amenity: legacyName },
      data: { amenity: "Clubhouse Restaurant" },
    });
    await prisma.amenity.delete({ where: { id: legacy.id } });
  }

  const extraRestaurants = await prisma.amenity.findMany({
    where: {
      communityId: IRON_LAKE_COMMUNITY_ID,
      kind: "restaurant",
      NOT: { name: "Clubhouse Restaurant" },
    },
  });
  for (const extra of extraRestaurants) {
    await prisma.booking.updateMany({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, amenity: extra.name },
      data: { amenity: "Clubhouse Restaurant" },
    });
    await prisma.amenity.delete({ where: { id: extra.id } });
  }

  // Remove superseded single Sky Suite label from early seed, if present.
  const legacySky = await prisma.amenity.findFirst({
    where: { communityId: IRON_LAKE_COMMUNITY_ID, name: "Sky Suite (Tower Lodging)" },
  });
  if (legacySky) {
    await prisma.amenity.delete({ where: { id: legacySky.id } });
  }

  const announcementCount = await prisma.announcement.count({
    where: { communityId: IRON_LAKE_COMMUNITY_ID },
  });
  if (announcementCount === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          communityId: IRON_LAKE_COMMUNITY_ID,
          title: "Welcome to The Club at Iron Lake",
          body: "Quarry-carved golf, racquets, spa, and dining are live for demo. Explore tee times, court bookings, and membership tiers.",
          author: "Iron Lake Club Admin",
          priority: "important",
        },
        {
          communityId: IRON_LAKE_COMMUNITY_ID,
          title: "IronCrest homesites — 200+ builder-ready lots",
          body: "Equestrian estates and custom homesites across 1,274 acres. Mandatory Club membership (minimum Social & Dining) applies to Membership Properties.",
          author: "IronCrest",
          priority: "normal",
        },
      ],
    });
  }

  await ensureIronLakeDemoBookings();
  await ensureIronLakeDemoFavorites();
  await ensureIronLakeDemoServiceRequests();

  await ensureIronLakeDemoCharges();
  await ensureIronLakeGolfClubRentalsSeeded();
  await seedIronLakeDemoCatalog();
}

/** Member Service Requests fixtures — idempotent; safe to call from production page loads. */
export async function ensureIronLakeDemoServiceRequests() {
  if (!process.env.DATABASE_URL) return;

  const rows = [
    {
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      unit: "Lot 42",
      title: "Gate fob not reading at IronCrest entrance",
      category: "Access",
      description:
        "New fob issued at closing does not open the north gate after 7pm. Side gate PIN works.",
      status: "open",
      daysAgo: 2,
    },
    {
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "Caroline Whitmore",
      unit: "Lot 42",
      title: "Irrigation overspray on driveway",
      category: "Landscaping",
      description:
        "Common-area heads near Lot 42 soak the driveway every morning around 5:30am.",
      status: "in_progress",
      daysAgo: 5,
    },
    {
      memberEmail: "member.sports@theclubatironlake.com",
      memberName: "Marcus Hale",
      unit: "Lot 7",
      title: "Tennis court light flickering — Court 3",
      category: "Maintenance",
      description: "Evening sessions disrupted after 7:30pm on Court 3.",
      status: "in_progress",
      daysAgo: 1,
    },
    {
      memberEmail: "member.social@theclubatironlake.com",
      memberName: "Elena Vargas",
      unit: "Lot 18",
      title: "Pool towel cabinet empty",
      category: "Amenities",
      description: "Women’s locker room towel stock was empty twice this week after noon.",
      status: "open",
      daysAgo: 3,
    },
    {
      memberEmail: "member.national@theclubatironlake.com",
      memberName: "David Chen",
      unit: "Guest Member",
      title: "Guest parking pass for Saturday",
      category: "Access",
      description: "Need a day pass for plate FL-DC918 for Saturday National Golf visit.",
      status: "open",
      daysAgo: 0,
    },
    {
      memberEmail: "member.equestrian@theclubatironlake.com",
      memberName: "Sophia Langford",
      unit: "Equestrian Estate 3",
      title: "Spa locker key replacement",
      category: "Amenities",
      description: "Lost spa day locker key #14 — please deactivate and issue a replacement.",
      status: "resolved",
      daysAgo: 8,
    },
  ] as const;

  for (const row of rows) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        communityId: IRON_LAKE_COMMUNITY_ID,
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
        communityId: IRON_LAKE_COMMUNITY_ID,
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

/** Upcoming amenity bookings for every demo member so Activities is never empty. */
async function ensureIronLakeDemoBookings() {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const day = (offset: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return iso(d);
  };

  const amenityByName = async (name: string) =>
    prisma.amenity.findFirst({
      where: { communityId: IRON_LAKE_COMMUNITY_ID, name },
      select: { id: true, name: true },
    });

  const [golf, tennis, pickle, spa, dining, zumba, cycling, pilates, strength, waterAerobics] =
    await Promise.all([
      amenityByName("Championship Golf Course"),
      amenityByName("Tennis Courts"),
      amenityByName("Pickleball Courts"),
      amenityByName("Spa & Wellness"),
      amenityByName("Clubhouse Restaurant"),
      amenityByName("Zumba"),
      amenityByName("Indoor Cycling"),
      amenityByName("Pilates Mat"),
      amenityByName("Strength Circuit"),
      amenityByName("Water Aerobics"),
    ]);

  type DemoBooking = {
    email: string;
    name: string;
    amenity: string;
    amenityId: string | null;
    unitNumber: number;
    date: string;
    startTime: string;
    endTime: string;
  };

  const plans: DemoBooking[] = [];

  const push = (
    email: string,
    name: string,
    a: { id: string; name: string } | null,
    unitNumber: number,
    date: string,
    startTime: string,
    endTime: string,
  ) => {
    if (!a) return;
    plans.push({
      email,
      name,
      amenity: a.name,
      amenityId: a.id,
      unitNumber,
      date,
      startTime,
      endTime,
    });
  };

  // Caroline — Full Golf
  push("member.golf@theclubatironlake.com", "Caroline Whitmore", golf, 1, day(2), "08:00", "12:00");
  push("member.golf@theclubatironlake.com", "Caroline Whitmore", tennis, 2, day(3), "09:00", "10:30");
  push("member.golf@theclubatironlake.com", "Caroline Whitmore", dining, 1, day(4), "18:00", "19:30");
  push("member.golf@theclubatironlake.com", "Caroline Whitmore", pilates, 1, day(5), "08:00", "09:00");

  // David — National
  push("member.national@theclubatironlake.com", "David Chen", golf, 2, day(2), "13:00", "17:00");
  push("member.national@theclubatironlake.com", "David Chen", spa, 1, day(5), "10:00", "11:00");
  push("member.national@theclubatironlake.com", "David Chen", strength, 1, day(3), "07:00", "08:00");

  // Elena — Social dining + classes (not open-gym / open-pool blocks)
  push("member.social@theclubatironlake.com", "Elena Vargas", dining, 1, day(2), "12:00", "13:30");
  push("member.social@theclubatironlake.com", "Elena Vargas", zumba, 1, day(3), "07:00", "08:00");
  push(
    "member.social@theclubatironlake.com",
    "Elena Vargas",
    waterAerobics,
    1,
    day(4),
    "11:00",
    "12:00",
  );
  push("member.social@theclubatironlake.com", "Elena Vargas", cycling, 1, day(6), "09:00", "10:00");

  // Marcus — Sports
  push("member.sports@theclubatironlake.com", "Marcus Hale", tennis, 3, day(2), "17:00", "18:30");
  push("member.sports@theclubatironlake.com", "Marcus Hale", pickle, 1, day(3), "10:00", "11:00");
  push("member.sports@theclubatironlake.com", "Marcus Hale", golf, 3, day(6), "08:00", "12:00");
  push("member.sports@theclubatironlake.com", "Marcus Hale", cycling, 1, day(4), "06:30", "07:30");
  push(
    "member.sports@theclubatironlake.com",
    "Marcus Hale",
    waterAerobics,
    1,
    day(5),
    "10:00",
    "11:00",
  );

  // Sophia — Equestrian
  push("member.equestrian@theclubatironlake.com", "Sophia Langford", spa, 2, day(2), "14:00", "15:00");
  push("member.equestrian@theclubatironlake.com", "Sophia Langford", golf, 1, day(5), "09:00", "13:00");
  push("member.equestrian@theclubatironlake.com", "Sophia Langford", pilates, 1, day(3), "10:00", "11:00");

  // Retire old “reserve the whole Fitness Center / Swimming Pool” demo bookings.
  await prisma.booking.updateMany({
    where: {
      communityId: IRON_LAKE_COMMUNITY_ID,
      amenity: { in: ["Fitness Center", "Swimming Pool"] },
      status: { not: "cancelled" },
    },
    data: { status: "cancelled" },
  });

  for (const plan of plans) {
    const existing = await prisma.booking.findFirst({
      where: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        memberEmail: plan.email,
        amenity: plan.amenity,
        date: plan.date,
        startTime: plan.startTime,
        status: { not: "cancelled" },
      },
    });
    if (existing) {
      await prisma.booking.update({
        where: { id: existing.id },
        data: {
          amenityId: plan.amenityId,
          unitNumber: plan.unitNumber,
          endTime: plan.endTime,
          status: "confirmed",
          memberName: plan.name,
        },
      });
      continue;
    }
    await prisma.booking.create({
      data: {
        communityId: IRON_LAKE_COMMUNITY_ID,
        memberEmail: plan.email,
        memberName: plan.name,
        amenity: plan.amenity,
        amenityId: plan.amenityId,
        unitNumber: plan.unitNumber,
        date: plan.date,
        startTime: plan.startTime,
        endTime: plan.endTime,
        status: "confirmed",
      },
    });
  }
}

/** Shortcuts on /member/favorites for every demo member — never empty for IronCrest logins. */
async function ensureIronLakeDemoFavorites() {
  type DemoFavorite = { email: string; label: string; href: string };

  const shared = (email: string): DemoFavorite[] => [
    { email, label: "Clubhouse dining", href: "/member/dining" },
    { email, label: "Community calendar", href: "/member/calendar" },
    { email, label: "Pay membership dues", href: "/member/payments" },
  ];

  const plans: DemoFavorite[] = [
    // Caroline — Full Golf
    ...shared("member.golf@theclubatironlake.com"),
    {
      email: "member.golf@theclubatironlake.com",
      label: "Book championship golf",
      href: "/member/bookings",
    },
    {
      email: "member.golf@theclubatironlake.com",
      label: "Book tennis court",
      href: "/member/bookings",
    },
    {
      email: "member.golf@theclubatironlake.com",
      label: "Golf club rentals",
      href: "/member/rentals",
    },
    {
      email: "member.golf@theclubatironlake.com",
      label: "Private lessons",
      href: "/member/lessons",
    },

    // David — National Golf
    ...shared("member.national@theclubatironlake.com"),
    {
      email: "member.national@theclubatironlake.com",
      label: "Book championship golf",
      href: "/member/bookings",
    },
    {
      email: "member.national@theclubatironlake.com",
      label: "Spa & wellness",
      href: "/member/bookings",
    },
    {
      email: "member.national@theclubatironlake.com",
      label: "Grab & Go",
      href: "/member/grab-go",
    },

    // Elena — Social & Dining
    ...shared("member.social@theclubatironlake.com"),
    {
      email: "member.social@theclubatironlake.com",
      label: "Zumba class",
      href: "/member/bookings",
    },
    {
      email: "member.social@theclubatironlake.com",
      label: "Swimming pool",
      href: "/member/bookings",
    },
    {
      email: "member.social@theclubatironlake.com",
      label: "Grab & Go",
      href: "/member/grab-go",
    },

    // Marcus — Sports
    ...shared("member.sports@theclubatironlake.com"),
    {
      email: "member.sports@theclubatironlake.com",
      label: "Book tennis court",
      href: "/member/bookings",
    },
    {
      email: "member.sports@theclubatironlake.com",
      label: "Pickleball courts",
      href: "/member/bookings",
    },
    {
      email: "member.sports@theclubatironlake.com",
      label: "Tournaments",
      href: "/member/tournaments",
    },
    {
      email: "member.sports@theclubatironlake.com",
      label: "Private lessons",
      href: "/member/lessons",
    },

    // Sophia — Equestrian Golf
    ...shared("member.equestrian@theclubatironlake.com"),
    {
      email: "member.equestrian@theclubatironlake.com",
      label: "Book championship golf",
      href: "/member/bookings",
    },
    {
      email: "member.equestrian@theclubatironlake.com",
      label: "Spa & wellness",
      href: "/member/bookings",
    },
    {
      email: "member.equestrian@theclubatironlake.com",
      label: "IronCrest real estate",
      href: "/member/real-estate",
    },
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

const DEMO_SEED_REF = "demo_seed";

/**
 * Idempotent demo bookings against IronCrest golf-club flex inventory.
 * Leaves each flex with remaining capacity so the rentals UI stays bookable.
 */
async function ensureIronLakeGolfClubRentalsSeeded() {
  const cid = IRON_LAKE_COMMUNITY_ID;
  const catalog = ironLakeGolfClubRentals[0];
  if (!catalog) return;

  const startDate = todayIsoDate();
  const demoRows: Array<{
    id: string;
    memberEmail: string;
    memberName: string;
    flex: string;
    days: number;
  }> = [
    {
      id: "il-rental-golf-ladies-1",
      memberEmail: "member.social@theclubatironlake.com",
      memberName: "Elena Vargas",
      flex: "Ladies",
      days: 2,
    },
    {
      id: "il-rental-golf-senior-1",
      memberEmail: "member.golf@theclubatironlake.com",
      memberName: "David Chen",
      flex: "Senior",
      days: 1,
    },
    {
      id: "il-rental-golf-regular-1",
      memberEmail: "member.national@theclubatironlake.com",
      memberName: "Priya Nair",
      flex: "Regular",
      days: 2,
    },
    {
      id: "il-rental-golf-regular-2",
      memberEmail: "member.sports@theclubatironlake.com",
      memberName: "Marcus Hale",
      flex: "Regular",
      days: 1,
    },
    {
      id: "il-rental-golf-stiff-1",
      memberEmail: "member.equestrian@theclubatironlake.com",
      memberName: "Jordan Blake",
      flex: "Stiff",
      days: 3,
    },
  ];

  for (const row of demoRows) {
    const endDate = rentalEndDate(startDate, row.days);
    const total = catalog.pricePerDay * row.days;
    await prisma.rental.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        communityId: cid,
        memberEmail: row.memberEmail,
        memberName: row.memberName,
        item: `${catalog.name} — ${row.flex} flex`,
        itemId: IRON_LAKE_GOLF_CLUBS_ITEM_ID,
        flex: row.flex,
        startDate,
        endDate,
        days: row.days,
        total,
        status: "reserved",
      },
      update: {
        communityId: cid,
        memberEmail: row.memberEmail,
        memberName: row.memberName,
        item: `${catalog.name} — ${row.flex} flex`,
        itemId: IRON_LAKE_GOLF_CLUBS_ITEM_ID,
        flex: row.flex,
        startDate,
        endDate,
        days: row.days,
        total,
        status: "reserved",
      },
    });
  }
}

/** Idempotent member charges, dining, and F&B spend for Payments / statement demo. */
async function ensureIronLakeDemoCharges() {
  const cid = IRON_LAKE_COMMUNITY_ID;

  async function ensureCharge(input: {
    key: string;
    memberEmail: string;
    memberName: string;
    category: string;
    description: string;
    amount: number;
    status: "due" | "paid" | "overdue";
    dueDate: string;
  }) {
    const existing = await prisma.memberCharge.findFirst({
      where: {
        communityId: cid,
        referenceType: DEMO_SEED_REF,
        referenceId: input.key,
      },
    });
    if (existing) return existing;
    return prisma.memberCharge.create({
      data: {
        communityId: cid,
        memberEmail: input.memberEmail.toLowerCase(),
        memberName: input.memberName,
        category: input.category,
        description: input.description,
        amount: input.amount,
        status: input.status,
        dueDate: input.dueDate,
        referenceType: DEMO_SEED_REF,
        referenceId: input.key,
      },
    });
  }

  async function ensureDining(input: {
    key: string;
    memberEmail: string;
    memberName: string;
    items: string;
    total: number;
    status?: string;
  }) {
    const email = input.memberEmail.toLowerCase();
    const existing = await prisma.diningOrder.findFirst({
      where: {
        communityId: cid,
        memberEmail: email,
        items: input.items,
        total: input.total,
        restaurant: "Clubhouse Restaurant",
      },
    });
    if (existing) return existing;
    // Also skip if a prior demo run used a marker suffix on the same key.
    const marked = await prisma.diningOrder.findFirst({
      where: {
        communityId: cid,
        memberEmail: email,
        items: { contains: `[demo:${input.key}]` },
      },
    });
    if (marked) return marked;
    return prisma.diningOrder.create({
      data: {
        communityId: cid,
        memberEmail: email,
        memberName: input.memberName,
        items: input.items,
        total: input.total,
        fulfillment: "eat_in",
        restaurant: "Clubhouse Restaurant",
        status: input.status ?? "Completed",
        tableLabel: "Table 6",
      },
    });
  }

  async function bumpFbSpend(memberEmail: string, spent: number, required: number) {
    const email = memberEmail.toLowerCase();
    const periodStart = "2026-01-01";
    const periodEnd = "2026-12-31";
    const existing = await prisma.memberFbPeriod.findUnique({
      where: {
        communityId_memberEmail_periodStart: {
          communityId: cid,
          memberEmail: email,
          periodStart,
        },
      },
    });
    const nextSpent = existing ? Math.max(existing.spentAmount, spent) : spent;
    await prisma.memberFbPeriod.upsert({
      where: {
        communityId_memberEmail_periodStart: {
          communityId: cid,
          memberEmail: email,
          periodStart,
        },
      },
      create: {
        communityId: cid,
        memberEmail: email,
        periodStart,
        periodEnd,
        periodKind: "annual",
        requiredAmount: required,
        spentAmount: nextSpent,
        status: nextSpent >= required ? "met" : "open",
      },
      update: {
        spentAmount: nextSpent,
        requiredAmount: required,
        periodEnd,
        periodKind: "annual",
        status: nextSpent >= required ? "met" : "open",
      },
    });
  }

  // --- Caroline Whitmore (Full Golf) — primary Payments walkthrough ---
  const caroline = {
    email: "member.golf@theclubatironlake.com",
    name: "Caroline Whitmore",
  };
  await ensureCharge({
    key: "il-caroline-dues-june-2026",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "membership",
    description: "June 2026 Full Golf dues",
    amount: IRON_LAKE_TIER_DEFINITIONS.full_golf.monthlyDues,
    status: "paid",
    dueDate: "2026-06-01",
  });
  await ensureCharge({
    key: "il-caroline-dues-july-2026",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "membership",
    description: "July 2026 Full Golf dues",
    amount: IRON_LAKE_TIER_DEFINITIONS.full_golf.monthlyDues,
    status: "due",
    dueDate: "2026-07-01",
  });
  await ensureCharge({
    key: "il-caroline-cart-jul12",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "golf",
    description: "Cart fee — Championship Golf (Jul 12)",
    amount: IRON_LAKE_GUEST_FEES.cartPerRound,
    status: "paid",
    dueDate: "2026-07-12",
  });
  await ensureCharge({
    key: "il-caroline-guest-golf",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "golf",
    description: "Accompanied Guest Fee — golf (Jul 12)",
    amount: IRON_LAKE_GUEST_FEES.golfAccompanied,
    status: "due",
    dueDate: "2026-07-12",
  });
  await ensureCharge({
    key: "il-caroline-golf-lesson",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "lesson",
    description: "Private golf lesson — Jordan Blake",
    amount: 95,
    status: "paid",
    dueDate: "2026-07-08",
  });
  await ensureCharge({
    key: "il-caroline-forecaddie",
    memberEmail: caroline.email,
    memberName: caroline.name,
    category: "golf",
    description: "Forecaddie service — 18 holes",
    amount: IRON_LAKE_GUEST_FEES.forecaddiePerRound,
    status: "due",
    dueDate: "2026-07-22",
  });
  await ensureDining({
    key: "il-caroline-dining-jul10",
    memberEmail: caroline.email,
    memberName: caroline.name,
    items: "Quarry Burger, Iron Lake Caesar, Clubhouse Iced Tea",
    total: 36,
  });
  await ensureDining({
    key: "il-caroline-dining-jul15",
    memberEmail: caroline.email,
    memberName: caroline.name,
    items: "Catch of the Day, Clubhouse Iced Tea",
    total: 32,
  });
  await bumpFbSpend(caroline.email, 680, IRON_LAKE_TIER_DEFINITIONS.full_golf.fbMinimumAmount);

  // Lesson booking (statement category) linked to paid lesson charge when possible
  const golfPro = await prisma.provider.findFirst({
    where: {
      communityId: cid,
      email: "golf.pro@theclubatironlake.com",
    },
  });
  const lessonCharge = await prisma.memberCharge.findFirst({
    where: {
      communityId: cid,
      referenceType: DEMO_SEED_REF,
      referenceId: "il-caroline-golf-lesson",
    },
  });
  if (golfPro) {
    const existingLesson = await prisma.lessonBooking.findFirst({
      where: {
        communityId: cid,
        memberEmail: caroline.email.toLowerCase(),
        date: "2026-07-08",
        offeringName: "Private Golf Lesson",
      },
    });
    if (!existingLesson) {
      await prisma.lessonBooking.create({
        data: {
          communityId: cid,
          providerId: golfPro.id,
          providerName: golfPro.name,
          proEmail: golfPro.email,
          offeringName: "Private Golf Lesson",
          sport: "golf",
          memberEmail: caroline.email.toLowerCase(),
          memberName: caroline.name,
          date: "2026-07-08",
          startTime: "10:00",
          endTime: "11:00",
          status: "confirmed",
          fee: 95,
          chargeId: lessonCharge?.id ?? null,
        },
      });
    }
  }

  const picklePro = await prisma.provider.findFirst({
    where: {
      communityId: cid,
      email: "pickleball.pro@theclubatironlake.com",
    },
  });
  if (picklePro) {
    const marcusEmail = "member.sports@theclubatironlake.com";
    const upcomingPickleDate = (() => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + 4);
      return d.toISOString().slice(0, 10);
    })();
    const existingPickle = await prisma.lessonBooking.findFirst({
      where: {
        communityId: cid,
        memberEmail: marcusEmail,
        sport: "pickleball",
        status: { not: "cancelled" },
      },
    });
    if (!existingPickle) {
      await prisma.lessonBooking.create({
        data: {
          communityId: cid,
          providerId: picklePro.id,
          providerName: picklePro.name,
          proEmail: picklePro.email,
          offeringName: "Private Pickleball Lesson",
          sport: "pickleball",
          memberEmail: marcusEmail,
          memberName: "Marcus Hale",
          date: upcomingPickleDate,
          startTime: "10:00",
          endTime: "11:00",
          status: "confirmed",
          fee: 85,
        },
      });
    }
  }

  // Demo Visa on file so Payment methods is not empty after load
  const carolineMethods = await prisma.storedPaymentMethod.count({
    where: { userEmail: caroline.email.toLowerCase() },
  });
  if (carolineMethods === 0) {
    await prisma.memberProfileExt.upsert({
      where: { userEmail: caroline.email.toLowerCase() },
      create: {
        userEmail: caroline.email.toLowerCase(),
        paymentPreference: "store",
        membershipTier: "full_golf",
      },
      update: { paymentPreference: "store" },
    });
    await prisma.storedPaymentMethod.create({
      data: {
        userEmail: caroline.email.toLowerCase(),
        label: "Visa •••• 4242",
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2028,
        isDefault: true,
      },
    });
  }

  // --- Marcus Hale (Social plus Sports) ---
  const marcus = {
    email: "member.sports@theclubatironlake.com",
    name: "Marcus Hale",
  };
  await ensureCharge({
    key: "il-marcus-dues-july-2026",
    memberEmail: marcus.email,
    memberName: marcus.name,
    category: "membership",
    description: "July 2026 Social plus Sports dues",
    amount: IRON_LAKE_TIER_DEFINITIONS.social_plus_sports.monthlyDues,
    status: "due",
    dueDate: "2026-07-01",
  });
  await ensureCharge({
    key: "il-marcus-court-guest",
    memberEmail: marcus.email,
    memberName: marcus.name,
    category: "racquets",
    description: "Accompanied Guest Court Fee",
    amount: IRON_LAKE_GUEST_FEES.courtAccompanied,
    status: "paid",
    dueDate: "2026-07-14",
  });
  // Non-member USTA visiting player — pay-by-link invoice (not a club member).
  const ustaGuestExisting = await prisma.memberCharge.findFirst({
    where: {
      communityId: cid,
      referenceType: "court_guest_fee",
      referenceId: "usta-demo-jordan",
    },
  });
  if (!ustaGuestExisting) {
    await prisma.memberCharge.create({
      data: {
        communityId: cid,
        memberEmail: "jordan.lee.usta@gmail.com",
        memberName: "Jordan Lee",
        category: "racquets",
        description:
          "Unaccompanied Guest Court Fee · Host / team contact: Caroline Whitmore · Match date: 2026-07-22 · USTA team match — non-member",
        amount: IRON_LAKE_GUEST_FEES.courtUnaccompanied,
        status: "due",
        dueDate: "2026-07-22",
        referenceType: "court_guest_fee",
        referenceId: "usta-demo-jordan",
        payToken: "demo-usta-jordan-lee-court-fee",
      },
    });
  }
  await ensureCharge({
    key: "il-marcus-ball-machine",
    memberEmail: marcus.email,
    memberName: marcus.name,
    category: "racquets",
    description: "Tennis ball machine rental — 1 hour",
    amount: IRON_LAKE_GUEST_FEES.tennisBallMachinePerHour,
    status: "due",
    dueDate: "2026-07-21",
  });
  await ensureDining({
    key: "il-marcus-dining-jul09",
    memberEmail: marcus.email,
    memberName: marcus.name,
    items: "Iron Lake Caesar, Clubhouse Iced Tea",
    total: 18,
  });
  await bumpFbSpend(
    marcus.email,
    420,
    IRON_LAKE_TIER_DEFINITIONS.social_plus_sports.fbMinimumAmount,
  );

  // --- Elena Vargas (Social & Dining) ---
  const elena = {
    email: "member.social@theclubatironlake.com",
    name: "Elena Vargas",
  };
  await ensureCharge({
    key: "il-elena-dues-july-2026",
    memberEmail: elena.email,
    memberName: elena.name,
    category: "membership",
    description: "July 2026 Social & Dining dues",
    amount: IRON_LAKE_TIER_DEFINITIONS.social_dining.monthlyDues,
    status: "due",
    dueDate: "2026-07-01",
  });
  await ensureDining({
    key: "il-elena-dining-jul11",
    memberEmail: elena.email,
    memberName: elena.name,
    items: "Catch of the Day, Quarry Burger, Clubhouse Iced Tea ×2",
    total: 54,
  });
  await bumpFbSpend(elena.email, 910, IRON_LAKE_TIER_DEFINITIONS.social_dining.fbMinimumAmount);

  // --- David Chen (National Golf, non-resident — dues only, no HOA) ---
  const david = {
    email: "member.national@theclubatironlake.com",
    name: "David Chen",
  };
  await ensureCharge({
    key: "il-david-dues-july-2026",
    memberEmail: david.email,
    memberName: david.name,
    category: "membership",
    description: "July 2026 National Golf dues",
    amount: IRON_LAKE_TIER_DEFINITIONS.national_golf.monthlyDues,
    status: "due",
    dueDate: "2026-07-01",
  });
  await ensureCharge({
    key: "il-david-cart-jul05",
    memberEmail: david.email,
    memberName: david.name,
    category: "golf",
    description: "Cart fee — Championship Golf (Jul 5)",
    amount: IRON_LAKE_GUEST_FEES.cartPerRound,
    status: "paid",
    dueDate: "2026-07-05",
  });
  await bumpFbSpend(david.email, 240, IRON_LAKE_TIER_DEFINITIONS.national_golf.fbMinimumAmount);
}

async function seedIronLakeDemoCatalog() {
  const cid = IRON_LAKE_COMMUNITY_ID;
  const demoPdf =
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  // Directory rows for demo members
  for (const u of IRON_LAKE_DEMO_USERS) {
    if (u.role !== "member" && u.role !== "board" && u.role !== "pm") continue;
    const roleLabel =
      u.role === "board"
        ? "Board Advisor"
        : u.role === "pm"
          ? "Property Manager"
          : "tier" in u
            ? String(u.tier).replace(/_/g, " ")
            : "Member";
    const existing = await prisma.communityMember.findFirst({
      where: { communityId: cid, name: u.name },
    });
    if (!existing) {
      await prisma.communityMember.create({
        data: {
          communityId: cid,
          name: u.name,
          role: roleLabel,
          isManagement: u.role === "board" || u.role === "pm",
        },
      });
    }
    if ("unit" in u && u.unit) {
      await prisma.memberProfileExt.upsert({
        where: { userEmail: u.email },
        create: {
          userEmail: u.email,
          membershipTier: "tier" in u ? u.tier : "social_dining",
          unit: u.unit,
          directoryVisible: true,
          householdRole: "owner",
          phone: "(352) 400-4653",
        },
        update: { directoryVisible: true },
      });
    }
  }

  if ((await prisma.communityDocument.count({ where: { communityId: cid } })) === 0) {
    await prisma.communityDocument.createMany({
      data: [
        { communityId: cid, title: "Membership Plan (May 2026)", category: "legal", url: demoPdf, audience: "member", uploadedBy: "Membership" },
        { communityId: cid, title: "Club Rules & Regulations", category: "policy", url: demoPdf, audience: "member", uploadedBy: "Club Admin" },
        { communityId: cid, title: "IronCrest HOA Covenants", category: "legal", url: demoPdf, audience: "member", uploadedBy: "Board" },
        { communityId: cid, title: "Guest & Cart Fee Schedule", category: "policy", url: demoPdf, audience: "member", uploadedBy: "Golf Shop" },
      ],
    });
  }

  // Board-only packets (minutes / financials) — add if missing even when member docs exist.
  const boardTitles = [
    "June 2026 Board Minutes",
    "2026 Operating Budget packet",
    "Reserve Study — Draft",
    "ARC Policy Reminder",
  ] as const;
  const existingBoard = await prisma.communityDocument.findMany({
    where: { communityId: cid, audience: "board" },
    select: { title: true },
  });
  const haveBoard = new Set(existingBoard.map((d) => d.title));
  const missingBoard = [
    {
      title: boardTitles[0],
      category: "minutes",
      uploadedBy: "Board Secretary",
    },
    {
      title: boardTitles[1],
      category: "financial",
      uploadedBy: "Treasurer",
    },
    {
      title: boardTitles[2],
      category: "financial",
      uploadedBy: "Natalie Brooks",
    },
    {
      title: boardTitles[3],
      category: "policy",
      uploadedBy: "Robert Keene",
    },
  ].filter((d) => !haveBoard.has(d.title));
  if (missingBoard.length > 0) {
    await prisma.communityDocument.createMany({
      data: missingBoard.map((d) => ({
        communityId: cid,
        title: d.title,
        category: d.category,
        url: demoPdf,
        audience: "board",
        uploadedBy: d.uploadedBy,
        sizeLabel: "PDF",
      })),
    });
  }

  if ((await prisma.menuItem.count({ where: { providerEmail: "dining@theclubatironlake.com" } })) === 0) {
    await prisma.menuItem.createMany({
      data: [
        { providerEmail: "dining@theclubatironlake.com", name: "Quarry Burger", price: 18, category: "Entrees", available: true },
        { providerEmail: "dining@theclubatironlake.com", name: "Iron Lake Caesar", price: 14, category: "Salads", available: true },
        { providerEmail: "dining@theclubatironlake.com", name: "Catch of the Day", price: 28, category: "Entrees", available: true },
        { providerEmail: "dining@theclubatironlake.com", name: "Clubhouse Iced Tea", price: 4, category: "Beverages", available: true },
      ],
    });
  }

  if ((await prisma.apparelProduct.count({ where: { communityId: cid } })) === 0) {
    await prisma.apparelProduct.createMany({
      data: [
        {
          communityId: cid,
          vendorName: "Iron Lake Golf Shop",
          name: "Club Polo — Stone",
          description: "Embroidered Iron Lake crest.",
          price: 48,
          category: "Polo",
          sizesJson: '["S","M","L","XL"]',
          imageUrl: brandAssets.apparelClubPolo,
        },
        {
          communityId: cid,
          vendorName: "Iron Lake Golf Shop",
          name: "Performance Cap",
          description: "Structured cap with crest.",
          price: 28,
          category: "Accessories",
          sizesJson: '["One Size"]',
          imageUrl: brandAssets.apparelPerformanceCap,
        },
        {
          communityId: cid,
          vendorName: "Iron Lake Golf Shop",
          name: "Member Quarter-Zip",
          description: "Lightweight layer for cool mornings.",
          price: 68,
          category: "Outerwear",
          sizesJson: '["S","M","L","XL","XXL"]',
          imageUrl: brandAssets.apparelQuarterZip,
        },
      ],
    });
  }

  // Keep crest product photos on existing apparel rows.
  const apparelCovers: Array<{ name: string; imageUrl: string }> = [
    { name: "Club Polo — Stone", imageUrl: brandAssets.apparelClubPolo },
    { name: "Performance Cap", imageUrl: brandAssets.apparelPerformanceCap },
    { name: "Member Quarter-Zip", imageUrl: brandAssets.apparelQuarterZip },
  ];
  for (const row of apparelCovers) {
    await prisma.apparelProduct.updateMany({
      where: { communityId: cid, name: row.name },
      data: { imageUrl: row.imageUrl },
    });
  }

  const ironLakeMarketplaceListings = [
    {
      title: "Titleist Pro V1 dozen",
      description: "Unopened dozen — member price.",
      price: 45,
      category: "Golf",
      seller: "Caroline Whitmore",
      unit: "Lot 42",
      imageUrl: brandAssets.marketplaceGolfBalls,
    },
    {
      title: "Kids' tennis racquet",
      description: "Lightly used, ages 8–12.",
      price: 35,
      category: "Tennis",
      seller: "Marcus Hale",
      unit: "Lot 7",
      imageUrl: brandAssets.marketplaceKidsRacquet,
    },
    {
      title: "Patio dining set",
      description: "6 chairs + table, pickup at Lot 18.",
      price: 220,
      category: "Home",
      seller: "Elena Vargas",
      unit: "Lot 18",
      imageUrl: brandAssets.marketplacePatioSet,
    },
  ] as const;

  if ((await prisma.listing.count({ where: { communityId: cid } })) === 0) {
    await prisma.listing.createMany({
      data: ironLakeMarketplaceListings.map((row) => ({ communityId: cid, ...row })),
    });
  }

  // Idempotent cover fix — listings created before product photos still need correct imageUrl.
  for (const row of ironLakeMarketplaceListings) {
    await prisma.listing.updateMany({
      where: { communityId: cid, title: row.title },
      data: { imageUrl: row.imageUrl },
    });
  }

  if ((await prisma.blogPost.count({ where: { communityId: cid } })) === 0) {
    await prisma.blogPost.createMany({
      data: [
        {
          communityId: cid,
          title: "Welcome weekend at Iron Lake",
          excerpt: "Tee times, tasting menus, and racquet mixer highlights.",
          body: "Members filled the quarry course and Clubhouse Restaurant for our first welcome weekend of the season.",
          author: "Iron Lake Club Admin",
          category: "Club Life",
        },
        {
          communityId: cid,
          title: "IronCrest homesite release",
          excerpt: "Builder-ready lots now touring by appointment.",
          body: "More than 200 homesites are available across equestrian and golf-facing locations.",
          author: "IronCrest",
          category: "Community",
        },
      ],
    });
  }

  // Member newsletters — add by title so re-deploys stay idempotent.
  const desiredNewsletters: Array<{ title: string; summary: string; body: string }> = [
    {
      title: "Iron Lake Summer Season Update — July 2026",
      summary:
        "Extended twilight tee times, poolside evenings, and July member-guest calendar at The Club at Iron Lake.",
      body: [
        "Members,",
        "",
        "Summer is in full swing at IronCrest and The Club at Iron Lake. Twilight tee times now run through 6:30pm on weekdays, and the quarry course remains cart-path-only after heavy afternoon storms.",
        "",
        "Highlights this month:",
        "• Family pool evenings every Thursday through August 14",
        "• Member-Guest dinner on the Clubhouse terrace — July 25",
        "• Spa summer escape packages for Full Golf and Social Plus Sports members",
        "",
        "Book tee times, courts, and dining from the member app. Questions: Membership@TheClubatIronLake.com or (352) 400-4653.",
        "",
        "— Iron Lake Club Admin",
      ].join("\n"),
    },
    {
      title: "Golf & Racquets Roundup",
      summary:
        "Course conditioning notes, Member-Guest Invitational registration, and green-clay tennis schedule updates.",
      body: [
        "Golf & Racquets members,",
        "",
        "Championship Golf: Greens are rolling at tournament speed ahead of the August Member-Guest Invitational. Practice range balls are available from the Golf Shop starting at 7:00am. Guest fees follow the published schedule.",
        "",
        "Racquets: Green-clay courts irrigate mid-day (roughly 12:00–1:30pm). Hard courts stay bookable through that window. The Iron Lake Tennis Ladder Kickoff is July 26 — sign up under Tournaments.",
        "",
        "Pro Shop tip: Club polo restock and performance caps are on the floor this week.",
        "",
        "— Golf Shop & Tennis Pro",
      ].join("\n"),
    },
    {
      title: "Clubhouse Dining — Midsummer Menu",
      summary:
        "New terrace specials, Grab & Go refresh, and weekend brunch hours at the Clubhouse Restaurant.",
      body: [
        "Dining members,",
        "",
        "The Clubhouse Restaurant midsummer menu is live. Look for Catch of the Day, Iron Lake Caesar, and rotating quarry-view terrace specials. Weekend brunch saturdays and sundays 10:00am–2:00pm.",
        "",
        "Grab & Go in the Golf Shop carries chilled salads and club sandwiches for before-or-after rounds. Reservations and Grab & Go orders are available in the member app under Dining.",
        "",
        "Please note published club hours and dress guidelines when dining on the terrace.",
        "",
        "— Clubhouse Dining",
        "dining@theclubatironlake.com",
      ].join("\n"),
    },
  ];
  const existingNewsletters = await prisma.newsletter.findMany({
    where: { communityId: cid },
    select: { title: true },
  });
  const haveNewsletterTitles = new Set(existingNewsletters.map((n) => n.title));
  const missingNewsletters = desiredNewsletters.filter(
    (row) => !haveNewsletterTitles.has(row.title),
  );
  if (missingNewsletters.length > 0) {
    await prisma.newsletter.createMany({
      data: missingNewsletters.map((row) => ({
        communityId: cid,
        title: row.title,
        summary: row.summary,
        body: row.body,
      })),
    });
  }

  const galleryRows = [
    {
      title: "18th green at dusk",
      category: "Golf",
      url: brandAssets.gallery18thGreenDusk,
      uploadedBy: "Golf Shop",
    },
    {
      title: "Clubhouse terrace",
      category: "Clubhouse",
      url: brandAssets.galleryClubhouseTerrace,
      uploadedBy: "Membership",
    },
    {
      title: "Racquet courts",
      category: "Tennis",
      url: brandAssets.featuredTennis,
      uploadedBy: "Tennis Pro",
    },
  ] as const;

  for (const row of galleryRows) {
    const existing = await prisma.galleryImage.findFirst({
      where: { communityId: cid, title: row.title },
    });
    if (existing) {
      if (existing.url !== row.url) {
        await prisma.galleryImage.update({
          where: { id: existing.id },
          data: { url: row.url, category: row.category, uploadedBy: row.uploadedBy },
        });
      }
      continue;
    }
    await prisma.galleryImage.create({
      data: {
        communityId: cid,
        title: row.title,
        category: row.category,
        url: row.url,
        uploadedBy: row.uploadedBy,
      },
    });
  }

  if ((await prisma.tournament.count({ where: { communityId: cid } })) === 0) {
    await prisma.tournament.create({
      data: {
        communityId: cid,
        title: "Member-Guest Invitational",
        sport: "Golf",
        date: "2026-08-16",
        startTime: "08:00",
        format: "Best ball",
        scoringFormat: "Stroke play",
        eventType: "Pairs",
        entryFee: 150,
        participants: 32,
        winnersJson: "{}",
        scheduleJson: '{"rounds":[{"name":"Morning wave","tee":"08:00"}]}',
        scoresJson: "{}",
      },
    });
    await prisma.tournament.create({
      data: {
        communityId: cid,
        title: "Iron Lake Tennis Ladder Kickoff",
        sport: "Tennis",
        courtSurface: "hard",
        date: "2026-07-26",
        startTime: "09:00",
        format: "Round robin",
        eventType: "Singles",
        entryFee: 25,
        participants: 16,
        winnersJson: "{}",
        scheduleJson: "{}",
        scoresJson: "{}",
      },
    });
  }

  if ((await prisma.communityGroup.count({ where: { communityId: cid } })) === 0) {
    const golf = await prisma.communityGroup.create({
      data: {
        communityId: cid,
        name: "Iron Lake Golfers",
        description: "Tee times, pairings, and course notes.",
        color: "from-emerald-500 to-stone-700",
        members: 4,
      },
    });
    const social = await prisma.communityGroup.create({
      data: {
        communityId: cid,
        name: "IronCrest Neighbors",
        description: "Homesite updates and social calendar.",
        color: "from-amber-600 to-stone-800",
        members: 3,
      },
    });
    const memberEmails = IRON_LAKE_DEMO_USERS.filter((u) => u.role === "member").map((u) => u.email);
    for (const email of memberEmails.slice(0, 4)) {
      await prisma.groupMembership.create({ data: { groupId: golf.id, userEmail: email } });
    }
    for (const email of memberEmails.slice(0, 3)) {
      await prisma.groupMembership.create({ data: { groupId: social.id, userEmail: email } });
    }
  }

  if ((await prisma.realEstateListing.count({ where: { communityId: cid } })) === 0) {
    await prisma.realEstateListing.createMany({
      data: [
        {
          communityId: cid,
          memberEmail: "member.golf@theclubatironlake.com",
          title: "Lot 42 — Golf-facing custom homesite",
          description: "Builder-ready IronCrest homesite with quarry views.",
          type: "sale",
          price: 485000,
          beds: 0,
          baths: 0,
          sqft: 0,
          unit: "Lot 42",
          color: "from-stone-600 to-amber-800",
        },
        {
          communityId: cid,
          memberEmail: "member.social@theclubatironlake.com",
          title: "Seasonal lease near clubhouse",
          description: "Furnished short-term lease, walk to dining and spa.",
          type: "rent",
          price: 6500,
          beds: 3,
          baths: 2.5,
          sqft: 2400,
          unit: "Lot 18",
          color: "from-amber-700 to-stone-700",
        },
      ],
    });
  }

  const golfEmail = "member.golf@theclubatironlake.com";
  if ((await prisma.memberProperty.count({ where: { userEmail: golfEmail } })) === 0) {
    await prisma.memberProperty.create({
      data: {
        userEmail: golfEmail,
        address: "Lot 42, IronCrest, Ocala, FL 34475",
        type: "Primary residence",
        owner: true,
      },
    });
  }

  const boardEventCount = await prisma.communityEvent.count({
    where: { communityId: cid, category: "board" },
  });
  if (boardEventCount === 0) {
    await prisma.communityEvent.createMany({
      data: [
        {
          communityId: cid,
          title: "Monthly Board Meeting",
          description:
            "Regular IronCrest board session — financials, amenity updates, and open member comments.",
          date: "2026-08-05",
          time: "6:00 PM",
          endTime: "7:30 PM",
          location: "Iron Lake Clubhouse — Board Room",
          category: "board",
          createdBy: "Robert Keene",
        },
        {
          communityId: cid,
          title: "Architecture Review Committee",
          description: "Homesite elevation and landscape reviews for new IronCrest builds.",
          date: "2026-08-12",
          time: "4:00 PM",
          endTime: "5:30 PM",
          location: "Quarry Room",
          category: "board",
          createdBy: "Natalie Brooks",
        },
        {
          communityId: cid,
          title: "Budget Workshop — 2027 Dues",
          description: "Draft operating budget and capital reserve discussion ahead of membership notice.",
          date: "2026-09-09",
          time: "5:30 PM",
          endTime: "7:00 PM",
          location: "Iron Lake Clubhouse — Board Room",
          category: "board",
          createdBy: "Robert Keene",
        },
      ],
    });
  }

  // Member calendar Upcoming — golf & pickleball (never yoga placeholders).
  const memberCalendarEvents = [
    {
      title: "Twilight Tee Times — Member Guest",
      description:
        "Extended twilight shotgun starts on the Championship Golf Course. Pairings at the Golf Shop.",
      date: easternDateOffset(3),
      time: "5:00 PM",
      endTime: "7:30 PM",
      location: "Championship Golf Course",
      category: "golf",
      isPromoted: true,
      createdBy: "Golf Shop",
    },
    {
      title: "Pickleball Mixer — Courts 1–4",
      description:
        "Round-robin mixer on the pickleball courts. Bring a paddle; balls provided.",
      date: easternDateOffset(5),
      time: "4:00 PM",
      endTime: "6:00 PM",
      location: "Pickleball Courts",
      category: "pickleball",
      isPromoted: true,
      createdBy: "Sam Ortega",
    },
    {
      title: "Junior Pickleball Clinic",
      description: "Ages 8–14 with Jamie Park on Courts 3–4. RSVP required.",
      date: easternDateOffset(8),
      time: "10:00 AM",
      endTime: "11:30 AM",
      location: "Pickleball Courts",
      category: "pickleball",
      isPromoted: false,
      createdBy: "Jamie Park",
    },
  ] as const;

  for (const ev of memberCalendarEvents) {
    const existing = await prisma.communityEvent.findFirst({
      where: { communityId: cid, title: ev.title },
    });
    if (existing) {
      await prisma.communityEvent.update({
        where: { id: existing.id },
        data: {
          description: ev.description,
          date: ev.date,
          time: ev.time,
          endTime: ev.endTime,
          location: ev.location,
          category: ev.category,
          isPromoted: ev.isPromoted,
        },
      });
      continue;
    }
    await prisma.communityEvent.create({
      data: {
        communityId: cid,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        time: ev.time,
        endTime: ev.endTime,
        location: ev.location,
        category: ev.category,
        isPromoted: ev.isPromoted,
        createdBy: ev.createdBy,
      },
    });
  }

  // Drop any leftover yoga placeholder events from older seeds.
  await prisma.communityEvent.deleteMany({
    where: {
      communityId: cid,
      OR: [
        { title: { contains: "Yoga" } },
        { title: { contains: "yoga" } },
        { category: { contains: "yoga" } },
      ],
    },
  });

  if ((await prisma.survey.count({ where: { communityId: cid } })) === 0) {
    await prisma.survey.create({
      data: {
        communityId: cid,
        title: "2027 clubhouse restaurant hours",
        description: "Should Clubhouse Restaurant extend Friday seating until 10pm?",
        status: "open",
        closes: "2026-08-20",
        options: {
          create: [
            { label: "Yes — extend Friday hours", votes: 12 },
            { label: "No — keep current hours", votes: 5 },
            { label: "Need more member feedback", votes: 3 },
          ],
        },
      },
    });
    await prisma.survey.create({
      data: {
        communityId: cid,
        title: "Capital reserve — racquet pavilion resurfacing",
        description: "Approve drawing from reserves for Tennis Courts resurfacing in Q4.",
        status: "open",
        closes: "2026-09-01",
        options: {
          create: [
            { label: "Approve reserve draw", votes: 8 },
            { label: "Defer to 2027 budget", votes: 6 },
            { label: "Seek member assessment instead", votes: 2 },
          ],
        },
      },
    });
  }

  if ((await prisma.bid.count({ where: { communityId: cid } })) === 0) {
    await prisma.bid.createMany({
      data: [
        {
          communityId: cid,
          project: "Gate & access control upgrade",
          vendor: "Quarry Security Systems",
          amount: 48500,
          status: "under_review",
        },
        {
          communityId: cid,
          project: "Clubhouse HVAC replacement",
          vendor: "Stone Creek Mechanical",
          amount: 126000,
          status: "received",
        },
        {
          communityId: cid,
          project: "Pool deck resealing",
          vendor: "Quarry Pool & Aquatic",
          amount: 18200,
          status: "accepted",
        },
      ],
    });
  }

  if ((await prisma.checkin.count({ where: { communityId: cid } })) === 0) {
    await prisma.checkin.createMany({
      data: [
        {
          communityId: cid,
          name: IRON_CREST_LAWN_BUSINESS_NAME,
          type: "vendor",
          host: "Side gate · PIN ****9104 · FL-ICL204",
          unit: "Common",
          status: "checked_in",
        },
        {
          communityId: cid,
          name: "Alex Whitmore",
          type: "guest",
          host: "Main · DL + plate FL-7KRP42 · Caroline Whitmore",
          unit: "Lot 42",
          status: "expected",
        },
        {
          communityId: cid,
          name: "Jordan Hale",
          type: "guest",
          host: "Side gate · PIN ****7730 · Marcus Hale",
          unit: "Lot 7",
          status: "checked_in",
        },
        {
          communityId: cid,
          name: "Elena Vargas",
          type: "guest",
          host: "Side gate · PIN ****4821 · plate FL-4EV918",
          unit: "Lot 18",
          status: "checked_in",
        },
        {
          communityId: cid,
          name: "UPS Delivery",
          type: "vendor",
          host: "Main · plate FL-UPS019",
          unit: "Lobby",
          status: "checked_out",
        },
      ],
    });
  } else {
    // Keep side-gate demo rows visible even when older check-ins already exist.
    const sideGateDemo = await prisma.checkin.findFirst({
      where: {
        communityId: cid,
        name: "Elena Vargas",
        host: { contains: "Side gate" },
      },
    });
    if (!sideGateDemo) {
      await prisma.checkin.create({
        data: {
          communityId: cid,
          name: "Elena Vargas",
          type: "guest",
          host: "Side gate · PIN ****4821 · plate FL-4EV918",
          unit: "Lot 18",
          status: "checked_in",
        },
      });
    }
  }

  if ((await prisma.registrationChecklist.count({ where: { communityId: cid } })) === 0) {
    await prisma.registrationChecklist.createMany({
      data: [
        {
          communityId: cid,
          resident: "Caroline Whitmore",
          unit: "Lot 42",
          vehicle: true,
          pet: true,
          fingerprint: true,
        },
        {
          communityId: cid,
          resident: "Marcus Hale",
          unit: "Lot 7",
          vehicle: true,
          pet: false,
          fingerprint: false,
        },
        {
          communityId: cid,
          resident: "Elena Vargas",
          unit: "Lot 18",
          vehicle: true,
          pet: true,
          fingerprint: false,
        },
        {
          communityId: cid,
          resident: "Sophia Langford",
          unit: "Equestrian Estate 3",
          vehicle: true,
          pet: true,
          fingerprint: true,
        },
      ],
    });
  }

  if ((await prisma.maintenanceTask.count({ where: { communityId: cid } })) === 0) {
    await prisma.maintenanceTask.createMany({
      data: [
        {
          communityId: cid,
          title: "Replace north gate reader",
          area: "Access control",
          assignedTo: "Quarry Security",
          status: "in_progress",
          due: "2026-07-25",
        },
        {
          communityId: cid,
          title: "Court 3 light ballast",
          area: "Tennis",
          assignedTo: "Facilities",
          status: "open",
          due: "2026-07-28",
        },
        {
          communityId: cid,
          title: "Clubhouse HVAC filter change",
          area: "Clubhouse",
          assignedTo: "Stone Creek Mechanical",
          status: "done",
          due: "2026-07-15",
        },
      ],
    });
  }

  if ((await prisma.invoice.count({ where: { communityId: cid } })) === 0) {
    await prisma.invoice.createMany({
      data: [
        {
          communityId: cid,
          vendor: IRON_CREST_LAWN_BUSINESS_NAME,
          description: "July landscape contract — IronCrest common areas",
          amount: 12500,
          status: "pending",
          submittedBy: "Natalie Brooks",
        },
        {
          communityId: cid,
          vendor: "Quarry Pool & Aquatic",
          description: "Monthly pool chemical service",
          amount: 1850,
          status: "approved",
          submittedBy: "Natalie Brooks",
        },
        {
          communityId: cid,
          vendor: "Stone Creek Mechanical",
          description: "Emergency HVAC call — clubhouse",
          amount: 940,
          status: "pending",
          submittedBy: "Front Desk",
        },
      ],
    });
  }

  await ensureIronLakeDemoChats();
  await ensureIronLakePrivateMessages();
  await ensureIronCrestLawnProviderPortal();
  await ensureIronCrestDiningProviderPortal();

  // Always keep a full IronCrest demo budget set (add missing categories).
  const desiredBudget: Array<{
    category: string;
    budgeted: number;
    spent: number;
  }> = [
    { category: "Golf course operations", budgeted: 920000, spent: 410000 },
    { category: "Clubhouse & dining", budgeted: 640000, spent: 298000 },
    { category: "Reserves — capital", budgeted: 350000, spent: 125000 },
    { category: "Racquet & fitness", budgeted: 185000, spent: 78000 },
    { category: "Spa & wellness", budgeted: 142000, spent: 61000 },
    { category: "Security & gate access", budgeted: 98000, spent: 44000 },
    { category: "Landscaping & grounds", budgeted: 210000, spent: 96000 },
    { category: "HOA administration", budgeted: 175000, spent: 82000 },
    { category: "Insurance & legal", budgeted: 128000, spent: 128000 },
    { category: "Events & member programs", budgeted: 86000, spent: 39000 },
  ];
  const existingBudget = await prisma.budgetLine.findMany({
    where: { communityId: cid, year: 2026 },
    select: { category: true },
  });
  const have = new Set(existingBudget.map((r) => r.category));
  const missing = desiredBudget.filter((row) => !have.has(row.category));
  if (missing.length > 0) {
    await prisma.budgetLine.createMany({
      data: missing.map((row) => ({
        communityId: cid,
        category: row.category,
        budgeted: row.budgeted,
        spent: row.spent,
        year: 2026,
      })),
    });
  }

  await ensureIronLakeDemoEngagement();

  await prisma.community.update({
    where: { id: cid },
    data: {
      appDisplayName: "IronCrest",
      name: "The Club at Iron Lake",
      logoUrl: "/brand/community-ironcrest.svg",
      primaryColor: "#1c1917",
      // Demo rain day = tomorrow so today stays dry (irrigation still demoable).
      weatherJson: JSON.stringify({
        rainAdvisories: [
          {
            date: easternDateOffset(1),
            active: true,
            message: `${COURT_RAIN_MESSAGE} / ${GOLF_RAIN_MESSAGE}`,
          },
        ],
      }),
    },
  });
}

/**
 * Fill empty demo surfaces that look broken in a walkthrough: groups, tournaments,
 * help tickets, pets/vehicles, reviews, gallery extras, shared calendar, dining login.
 * Idempotent — safe on every deploy / seed run.
 */
export async function ensureIronLakeDemoEngagement() {
  const cid = IRON_LAKE_COMMUNITY_ID;
  const caroline = {
    email: "member.golf@theclubatironlake.com",
    name: "Caroline Whitmore",
    userId: "u-il-member-golf",
  };

  // Remove leftover Golden Ocala local-pro stubs from the IronCrest tenant.
  await prisma.provider.deleteMany({
    where: {
      communityId: cid,
      listingKind: "local_pro",
      name: {
        in: [
          "GreenScape Gardens",
          "ColorCraft Painting",
          "AquaClear Pool Service",
          "Oak Canopy Estate Care",
        ],
      },
    },
  });

  // Refresh HVAC / painting vendor covers (older rows may still store painting.png).
  for (const vendor of IRON_LAKE_VENDORS) {
    await prisma.provider.updateMany({
      where: { communityId: cid, email: vendor.email },
      data: {
        imageUrl: imageForProviderCategory(vendor.category, vendor.type, vendor.name),
        rating: vendor.rating,
      },
    });
  }

  // Dining provider portal (menu, bookings messages, promotions).
  await ensureIronCrestDiningProviderPortal();

  // Keep pool/gym as walk-in; book Water Aerobics / Zumba / etc. instead.
  await prisma.amenity.updateMany({
    where: { communityId: cid, name: "Swimming Pool" },
    data: { kind: "pool" },
  });
  await prisma.amenity.updateMany({
    where: { communityId: cid, name: "Fitness Center" },
    data: { kind: "gym" },
  });
  const waterExists = await prisma.amenity.findFirst({
    where: { communityId: cid, name: "Water Aerobics" },
  });
  if (!waterExists) {
    await prisma.amenity.create({
      data: {
        communityId: cid,
        name: "Water Aerobics",
        description:
          "Low-impact aqua fitness in the swim complex. No lap-lane reservation — join the class.",
        fee: 0,
        kind: "fitness_class",
        schedule: "Daily class blocks",
        unitCount: 1,
      },
    });
  }
  await prisma.booking.updateMany({
    where: {
      communityId: cid,
      amenity: { in: ["Fitness Center", "Swimming Pool"] },
      status: { not: "cancelled" },
    },
    data: { status: "cancelled" },
  });

  // --- Groups: posts + chat so clubs don't look dead ---
  const groups = await prisma.communityGroup.findMany({ where: { communityId: cid } });
  for (const group of groups) {
    const postCount = await prisma.groupPost.count({ where: { groupId: group.id } });
    if (postCount === 0) {
      const isGolf = /golf/i.test(group.name);
      const post = await prisma.groupPost.create({
        data: {
          groupId: group.id,
          communityId: cid,
          authorEmail: caroline.email,
          authorName: caroline.name,
          body: isGolf
            ? "Twilight tee times are open this week — who’s joining for a Saturday nine after 5?"
            : "Neighbors potluck on the clubhouse terrace Friday — bring a dish and a guest.",
        },
      });
      await prisma.groupPostComment.create({
        data: {
          postId: post.id,
          authorEmail: "member.sports@theclubatironlake.com",
          authorName: "Marcus Hale",
          body: isGolf
            ? "Count me in — I’ll grab a cart from the shop."
            : "We’ll bring ceviche. See you there!",
        },
      });
      await prisma.groupPostLike.create({
        data: {
          postId: post.id,
          memberEmail: "member.social@theclubatironlake.com",
        },
      });
      await prisma.groupPost.create({
        data: {
          groupId: group.id,
          communityId: cid,
          authorEmail: isGolf
            ? "member.national@theclubatironlake.com"
            : "member.equestrian@theclubatironlake.com",
          authorName: isGolf ? "David Chen" : "Sophia Langford",
          body: isGolf
            ? "Range balls are free before 8am this weekend. Short-game focus recommended."
            : "Reminder: architecture review is Tuesday — elevations due Monday noon.",
        },
      });
    }

    const msgCount = await prisma.groupMessage.count({ where: { groupId: group.id } });
    if (msgCount === 0) {
      await prisma.groupMessage.createMany({
        data: [
          {
            communityId: cid,
            groupId: group.id,
            author: caroline.name,
            body: "Anyone free for pickle after 4 tomorrow?",
            createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
          },
          {
            communityId: cid,
            groupId: group.id,
            author: "Marcus Hale",
            body: "I’m in — courts 1–2 are open.",
            createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
          },
          {
            communityId: cid,
            groupId: group.id,
            author: "Elena Vargas",
            body: "I’ll bring paddles from the pro shop.",
            createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
          },
        ],
      });
    }
  }

  // --- Tournaments: seed bracket + register Caroline so home shows a match ---
  const tennisSeeds = [
    "Caroline Whitmore",
    "Marcus Hale",
    "Elena Vargas",
    "Alex Rivera",
    "David Chen",
    "Sophia Langford",
    "Sam Ortega",
    "Riley Quinn",
  ];
  let tennis = await prisma.tournament.findFirst({
    where: { communityId: cid, sport: "Tennis" },
  });
  if (!tennis) {
    tennis = await prisma.tournament.create({
      data: {
        communityId: cid,
        title: "Iron Lake Tennis Ladder Kickoff",
        sport: "Tennis",
        courtSurface: "hard",
        date: easternDateOffset(6),
        startTime: "09:00",
        format: "Single elimination",
        eventType: "Singles",
        entryFee: 25,
        participants: 8,
        seedsJson: JSON.stringify(tennisSeeds),
        winnersJson: "{}",
        scheduleJson: "{}",
        scoresJson: "{}",
      },
    });
  } else if (!tennis.seedsJson) {
    tennis = await prisma.tournament.update({
      where: { id: tennis.id },
      data: {
        seedsJson: JSON.stringify(tennisSeeds),
        participants: 8,
        date: easternDateOffset(6),
        startTime: "09:00",
      },
    });
  } else {
    // Keep bracket names aligned with demo members (and Caroline as seed #1).
    tennis = await prisma.tournament.update({
      where: { id: tennis.id },
      data: {
        seedsJson: JSON.stringify(tennisSeeds),
        participants: 8,
        date: easternDateOffset(6),
        startTime: "09:00",
      },
    });
  }

  const schedule: Record<
    string,
    { time: string; date: string; unitNumber: number; courtLabel: string }
  > = {
    [`${tennis.id}-r0-m0`]: {
      unitNumber: 2,
      courtLabel: "Court 2",
      time: "09:00",
      date: easternDateOffset(6),
    },
    [`${tennis.id}-r0-m1`]: {
      unitNumber: 3,
      courtLabel: "Court 3",
      time: "09:00",
      date: easternDateOffset(6),
    },
    [`${tennis.id}-r0-m2`]: {
      unitNumber: 4,
      courtLabel: "Court 4",
      time: "10:30",
      date: easternDateOffset(6),
    },
    [`${tennis.id}-r0-m3`]: {
      unitNumber: 5,
      courtLabel: "Court 5",
      time: "10:30",
      date: easternDateOffset(6),
    },
  };
  await prisma.tournament.update({
    where: { id: tennis.id },
    data: {
      scheduleJson: JSON.stringify(schedule),
      // Fresh bracket for walkthrough — Caroline’s next match is R1 on Court 2.
      winnersJson: "{}",
      scoresJson: "{}",
    },
  });

  const existingPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: tennis.id },
  });
  if (existingPlayers.length === 0) {
    const emailByName: Record<string, string> = {
      "Caroline Whitmore": caroline.email,
      "Marcus Hale": "member.sports@theclubatironlake.com",
      "Elena Vargas": "member.social@theclubatironlake.com",
      "David Chen": "member.national@theclubatironlake.com",
      "Sophia Langford": "member.equestrian@theclubatironlake.com",
      "Alex Rivera": "tennis.pro@theclubatironlake.com",
      "Sam Ortega": "pickleball.pro@theclubatironlake.com",
      "Riley Quinn": "tennis.associate@theclubatironlake.com",
    };
    await prisma.tournamentPlayer.createMany({
      data: tennisSeeds.map((name) => ({
        tournamentId: tennis!.id,
        name,
        memberEmail: emailByName[name] ?? null,
        paid: true,
        ustaRating: "4.0",
      })),
    });
  } else {
    // Ensure Caroline is linked by email for home feed.
    const carolinePlayer = existingPlayers.find(
      (p) => p.name === caroline.name || p.memberEmail?.toLowerCase() === caroline.email,
    );
    if (carolinePlayer && !carolinePlayer.memberEmail) {
      await prisma.tournamentPlayer.update({
        where: { id: carolinePlayer.id },
        data: { memberEmail: caroline.email },
      });
    } else if (!carolinePlayer) {
      await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tennis.id,
          name: caroline.name,
          memberEmail: caroline.email,
          paid: true,
          ustaRating: "4.0",
        },
      });
    }
  }

  let golfInvite = await prisma.tournament.findFirst({
    where: { communityId: cid, sport: "Golf" },
  });
  if (golfInvite) {
    const gPlayers = await prisma.tournamentPlayer.count({
      where: { tournamentId: golfInvite.id },
    });
    if (gPlayers === 0) {
      await prisma.tournamentPlayer.createMany({
        data: [
          {
            tournamentId: golfInvite.id,
            name: caroline.name,
            memberEmail: caroline.email,
            partnerName: "Guest — Whitmore",
            paid: true,
            handicap: 12.4,
          },
          {
            tournamentId: golfInvite.id,
            name: "David Chen",
            memberEmail: "member.national@theclubatironlake.com",
            partnerName: "Guest — Chen",
            paid: true,
            handicap: 8.2,
          },
          {
            tournamentId: golfInvite.id,
            name: "Marcus Hale",
            memberEmail: "member.sports@theclubatironlake.com",
            partnerName: "Guest — Hale",
            paid: false,
            handicap: 14.1,
          },
        ],
      });
    }
    await prisma.tournament.update({
      where: { id: golfInvite.id },
      data: {
        date: easternDateOffset(28),
        participants: Math.max(golfInvite.participants, 3),
      },
    });
  }

  // --- Help desk tickets ---
  if ((await prisma.helpTicket.count({ where: { communityId: cid } })) === 0) {
    await prisma.helpTicket.createMany({
      data: [
        {
          communityId: cid,
          userName: caroline.name,
          email: caroline.email,
          subject: "Guest gate fob for Saturday dinner",
          priority: "Medium",
          message:
            "Two dinner guests arriving ~5:45 for Clubhouse Dining. Can Front Desk stage temporary fobs under Whitmore / Lot 42?",
          status: "open",
        },
        {
          communityId: cid,
          userName: "Marcus Hale",
          email: "member.sports@theclubatironlake.com",
          subject: "Irrigation overspray on driveway — Lot 7",
          priority: "High",
          message: "Zone 3 is soaking the driveway every morning. Can facilities adjust the head?",
          status: "in_progress",
        },
        {
          communityId: cid,
          userName: "Elena Vargas",
          email: "member.social@theclubatironlake.com",
          subject: "Women’s locker room combination reset",
          priority: "Low",
          message: "Need a locker reset before spa Tuesday — membership card is on file.",
          status: "resolved",
        },
      ],
    });
  }

  // --- Pets / vehicles for Caroline ---
  if ((await prisma.pet.count({ where: { userId: caroline.userId } })) === 0) {
    await prisma.pet.create({
      data: {
        userId: caroline.userId,
        name: "Maggie",
        type: "Dog",
        breed: "Golden Retriever",
      },
    });
  }
  if ((await prisma.vehicle.count({ where: { userId: caroline.userId } })) === 0) {
    await prisma.vehicle.create({
      data: {
        userId: caroline.userId,
        make: "Porsche",
        model: "Macan",
        color: "Carrara White",
        plate: "IL-42CW",
        year: 2024,
        ownerName: caroline.name,
        verificationStatus: "verified",
        verifiedAt: new Date(),
      },
    });
  }

  // Properties for other demo members
  const propertySeeds = [
    {
      email: "member.social@theclubatironlake.com",
      address: "Lot 18, IronCrest, Ocala, FL 34475",
      type: "Primary residence",
    },
    {
      email: "member.sports@theclubatironlake.com",
      address: "Lot 7, IronCrest, Ocala, FL 34475",
      type: "Primary residence",
    },
    {
      email: "member.equestrian@theclubatironlake.com",
      address: "Equestrian Estate 3, IronCrest, Ocala, FL 34475",
      type: "Primary residence",
    },
  ];
  for (const row of propertySeeds) {
    const has = await prisma.memberProperty.count({
      where: { userEmail: row.email.toLowerCase() },
    });
    if (has === 0) {
      await prisma.memberProperty.create({
        data: {
          userEmail: row.email.toLowerCase(),
          address: row.address,
          type: row.type,
          owner: true,
        },
      });
    }
  }

  // --- Local pro reviews ---
  const lawn = await prisma.provider.findFirst({
    where: { communityId: cid, email: IRON_CREST_LAWN_PROVIDER_EMAIL },
  });
  if (lawn && (await prisma.providerReview.count({ where: { providerId: lawn.id } })) === 0) {
    await prisma.providerReview.createMany({
      data: [
        {
          providerId: lawn.id,
          communityId: cid,
          memberEmail: caroline.email,
          memberName: caroline.name,
          rating: 5,
          comment: "Crew is always on time and the hedges look sharp.",
        },
        {
          providerId: lawn.id,
          communityId: cid,
          memberEmail: "member.sports@theclubatironlake.com",
          memberName: "Marcus Hale",
          rating: 5,
          comment: "Mulching the back fence line was quick and clean.",
        },
      ],
    });
    await prisma.provider.update({ where: { id: lawn.id }, data: { rating: 4.9 } });
  }
  for (const email of ["pool@ironcrest.services", "cleaning@ironcrest.services", "hvac@ironcrest.services"]) {
    const p = await prisma.provider.findFirst({ where: { communityId: cid, email } });
    if (!p) continue;
    if ((await prisma.providerReview.count({ where: { providerId: p.id } })) > 0) continue;
    await prisma.providerReview.create({
      data: {
        providerId: p.id,
        communityId: cid,
        memberEmail: caroline.email,
        memberName: caroline.name,
        rating: 5,
        comment: "Reliable and easy to schedule through the app.",
      },
    });
  }

  // --- Extra gallery + marketplace filler ---
  if ((await prisma.galleryImage.count({ where: { communityId: cid } })) < 5) {
    const extras = [
      {
        title: "Championship fairway morning",
        category: "Golf",
        url: brandAssets.serviceGolf,
        uploadedBy: "Golf Shop",
      },
      {
        title: "Green clay courts after irrigation",
        category: "Racquet",
        url: brandAssets.amenityTennisClay,
        uploadedBy: "Tennis Shop",
      },
      {
        title: "Pickleball courts — sunset mixer",
        category: "Racquet",
        url: brandAssets.amenityPickleball,
        uploadedBy: "Racquet Sports",
      },
    ];
    for (const row of extras) {
      const exists = await prisma.galleryImage.findFirst({
        where: { communityId: cid, title: row.title },
      });
      if (!exists) {
        await prisma.galleryImage.create({ data: { communityId: cid, ...row } });
      }
    }
  }

  if ((await prisma.listing.count({ where: { communityId: cid } })) < 5) {
    const listings = [
      {
        title: "Peloton Bike+ — barely used",
        description: "Moving and can’t take it. Includes mat and weights.",
        price: 1200,
        category: "Fitness",
        seller: "Elena Vargas",
        unit: "Lot 18",
        imageUrl: brandAssets.marketplacePeloton,
      },
      {
        title: "Iron Lake windbreaker — M",
        description: "Club crest windbreaker, worn twice.",
        price: 40,
        category: "Apparel",
        seller: caroline.name,
        unit: "Lot 42",
        imageUrl: brandAssets.marketplaceKidsRacquet,
      },
    ];
    for (const row of listings) {
      const exists = await prisma.listing.findFirst({
        where: { communityId: cid, title: row.title },
      });
      if (!exists) {
        await prisma.listing.create({
          data: { communityId: cid, ...row },
        });
      }
    }
  }

  // --- Shared calendar with lawn for Caroline ---
  if (lawn) {
    const cal = await prisma.sharedCalendar.findFirst({
      where: { providerId: lawn.id, memberEmail: caroline.email },
    });
    if (!cal) {
      const created = await prisma.sharedCalendar.create({
        data: {
          communityId: cid,
          providerId: lawn.id,
          memberEmail: caroline.email,
          memberName: caroline.name,
          providerName: IRON_CREST_LAWN_BUSINESS_NAME,
          status: "active",
          feeCents: 0,
        },
      });
      await prisma.sharedCalendarEvent.createMany({
        data: [
          {
            calendarId: created.id,
            title: "Weekly mow — Lot 42",
            note: "Mow, edge, blow. Skip zone 3 irrigation check this pass.",
            startsAt: `${easternDateOffset(2)}T08:00:00`,
            endsAt: `${easternDateOffset(2)}T09:00:00`,
            createdBy: lawn.email ?? IRON_CREST_LAWN_PROVIDER_EMAIL,
          },
          {
            calendarId: created.id,
            title: "Hedge trim — front walk",
            note: "Podocarpus along entry.",
            startsAt: `${easternDateOffset(8)}T08:30:00`,
            endsAt: `${easternDateOffset(8)}T10:00:00`,
            createdBy: lawn.email ?? IRON_CREST_LAWN_PROVIDER_EMAIL,
          },
        ],
      });
    }
  }

  // --- Grab & Go visit history ---
  const machine = await prisma.grabGoMachine.findFirst({ where: { communityId: cid } });
  if (
    machine &&
    (await prisma.grabGoSession.count({
      where: { memberEmail: caroline.email.toLowerCase() },
    })) === 0
  ) {
    const product = await prisma.grabGoProduct.findFirst({
      where: { machineId: machine.id },
    });
    await prisma.grabGoSession.create({
      data: {
        machineId: machine.id,
        communityId: cid,
        memberEmail: caroline.email.toLowerCase(),
        memberName: caroline.name,
        unlockMethod: "app_qr",
        status: "closed",
        total: product?.price ?? 6.5,
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        itemsJson: product
          ? JSON.stringify([
              {
                sku: product.sku,
                name: product.name,
                qty: 1,
                price: product.price,
                confidence: 0.98,
              },
            ])
          : "[]",
      },
    });
  }

  // Move Caroline's golf lesson to an upcoming date if still stuck in the past.
  const upcomingLesson = easternDateOffset(4);
  await prisma.lessonBooking.updateMany({
    where: {
      communityId: cid,
      memberEmail: caroline.email.toLowerCase(),
      offeringName: "Private Golf Lesson",
      date: { lt: new Date().toISOString().slice(0, 10) },
    },
    data: { date: upcomingLesson, status: "confirmed" },
  });
}
