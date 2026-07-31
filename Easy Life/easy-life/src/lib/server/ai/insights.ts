import { prisma } from "@/lib/server/prisma";
import {
  type InsightBundle,
  type InsightScore,
  scoreLevel,
} from "@/lib/server/ai/types";
import { normalizeMembershipTier } from "@/lib/membership-tiers";
import { evaluateDependentEligibility } from "@/lib/dependent-membership";
import { evaluateRejoinEligibility } from "@/lib/membership-rejoin";
import { isMembershipDeactivated } from "@/lib/membership-status";
import { ensureDependentPolicy } from "@/lib/server/dependent-membership";
import { ensureRejoinPolicy } from "@/lib/server/membership-rejoin";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function insight(
  id: string,
  title: string,
  score: number,
  reason: string,
  href?: string,
): InsightScore {
  return { id, title, score, level: scoreLevel(score), reason, href };
}

export async function buildMemberInsights(input: {
  communityId?: string;
  userEmail: string;
}): Promise<InsightBundle> {
  const communityId = input.communityId?.trim() || "__missing_community__";
  const email = input.userEmail.toLowerCase();
  const since = daysAgo(60);

  const [
    bookings,
    diningOrders,
    charges,
    profile,
    fbPeriods,
    players,
    amenities,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { memberEmail: email, createdAt: { gte: since } },
      select: { status: true, amenity: true, date: true, startTime: true, createdAt: true },
    }),
    prisma.diningOrder.findMany({
      where: { memberEmail: email, createdAt: { gte: since } },
      select: { total: true, items: true, createdAt: true, arriveTime: true },
    }),
    prisma.memberCharge.findMany({
      where: { memberEmail: email, createdAt: { gte: since } },
      select: { status: true, category: true, amount: true },
    }),
    prisma.memberProfileExt.findUnique({ where: { userEmail: email } }),
    prisma.memberFbPeriod.findMany({
      where: { memberEmail: email },
      orderBy: { periodStart: "desc" },
      take: 1,
    }),
    prisma.tournamentPlayer.findMany({
      where: { tournament: { communityId } },
      select: {
        name: true,
        memberEmail: true,
        partnerName: true,
        partnerEmail: true,
        ustaRating: true,
        utrRating: true,
      },
      take: 80,
    }),
    prisma.amenity.findMany({
      where: { communityId },
      select: { name: true, kind: true },
      take: 40,
    }),
  ]);

  const activeBookings = bookings.filter(
    (b) => !["cancelled", "canceled", "no_show"].includes((b.status ?? "").toLowerCase()),
  );
  const cancelled = bookings.filter((b) =>
    ["cancelled", "canceled", "no_show"].includes((b.status ?? "").toLowerCase()),
  );

  // Churn: low engagement → high risk
  const engagement =
    activeBookings.length * 12 + diningOrders.length * 10 + charges.filter((c) => c.status === "paid").length * 5;
  const churnScore = Math.max(5, Math.min(95, 90 - engagement));
  const churnRisk = insight(
    "churn",
    "Churn risk",
    churnScore,
    engagement < 20
      ? "Low recent bookings and dining — outreach recommended."
      : engagement < 50
        ? "Moderate club activity over the last 60 days."
        : "Healthy recent engagement.",
    "/member/bookings",
  );

  // Tier fit
  const tier = normalizeMembershipTier(profile?.membershipTier);
  const courtish = activeBookings.filter((b) =>
    /court|tennis|pickle/i.test(b.amenity ?? ""),
  ).length;
  const golfish = activeBookings.filter((b) => /golf|tee|range/i.test(b.amenity ?? "")).length;
  let suggested = tier;
  let tierReason = `Current tier: ${tier}.`;
  if (golfish >= 3 && tier !== "golf" && tier !== "national") {
    suggested = "golf";
    tierReason = "Frequent golf bookings — Golf or National may fit better.";
  } else if (courtish >= 3 && !["tennis", "national", "social_tennis"].includes(tier)) {
    suggested = "tennis";
    tierReason = "Frequent court bookings — Tennis or Social+Tennis may fit better.";
  } else if (diningOrders.length >= 4 && tier === "social") {
    tierReason = "Strong F&B use — current Social tier still fits; watch minimums.";
  }
  const tierFit = insight(
    "tier",
    suggested !== tier ? `Consider ${suggested}` : "Tier fit",
    suggested !== tier ? 72 : 35,
    tierReason,
    "/member/membership",
  );

  // F&B
  const fb = fbPeriods[0];
  const remaining =
    fb && fb.requiredAmount > 0
      ? Math.max(0, fb.requiredAmount - fb.spentAmount)
      : 0;
  const fbSuggestions: string[] =
    remaining > 0
      ? [
          `$${remaining.toFixed(0)} left on F&B minimum`,
          "Order eat-in at The Terrace",
          "Poolside Grab & Go snacks count toward F&B",
        ]
      : ["F&B minimum on track", "Try a weekend eat-in reservation"];

  // No-show proxy
  const noShowRate =
    bookings.length === 0 ? 0 : cancelled.length / bookings.length;
  const noShowScore = Math.round(noShowRate * 100);
  const noShowRisk = insight(
    "noshow",
    "No-show risk",
    noShowScore,
    noShowRate > 0.25
      ? "Elevated cancel/no-show rate — send earlier reminders."
      : "Cancellation rate looks normal.",
    "/member/bookings",
  );

  // Demand heat from community bookings
  const communityBookings = await prisma.booking.findMany({
    where: { communityId, createdAt: { gte: daysAgo(30) } },
    select: { startTime: true, amenity: true },
    take: 500,
  });
  const hourCounts = new Map<string, number>();
  for (const b of communityBookings) {
    const hour = Number((b.startTime ?? "12:00").slice(0, 2)) || 12;
    const key = `${b.amenity ?? "Amenity"}@${hour}`;
    hourCounts.set(key, (hourCounts.get(key) ?? 0) + 1);
  }
  const demandHeat = [...hourCounts.entries()]
    .map(([key, count]) => {
      const [label, hourStr] = key.split("@");
      return { label: label ?? "Amenity", hour: Number(hourStr), count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Partner matches
  const mePlayer = players.find((p) => p.memberEmail?.toLowerCase() === email);
  const myUtr = mePlayer?.utrRating ?? null;
  const partnerMatches = players
    .filter((p) => p.memberEmail?.toLowerCase() !== email)
    .map((p) => {
      let reason = "Available doubles partner candidate";
      let score = 40;
      if (myUtr != null && p.utrRating != null) {
        const delta = Math.abs(myUtr - p.utrRating);
        score = Math.max(10, 90 - delta * 25);
        reason = `UTR close (${p.utrRating} vs yours ${myUtr})`;
      } else if (mePlayer?.ustaRating && p.ustaRating === mePlayer.ustaRating) {
        score = 70;
        reason = `Same USTA ${p.ustaRating}`;
      }
      return { name: p.name, email: p.memberEmail, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ name, email: e, reason }) => ({ name, email: e, reason }));

  // Household / rejoin
  const householdAlerts: InsightScore[] = [];
  if (profile?.householdRole === "dependent" || profile?.sponsorEmail) {
    const policy = await ensureDependentPolicy(communityId);
    const sponsor = profile.sponsorEmail
      ? await prisma.memberProfileExt.findUnique({
          where: { userEmail: profile.sponsorEmail },
        })
      : null;
    const ev = evaluateDependentEligibility({
      dateOfBirth: profile.dateOfBirth,
      householdAddress: profile.householdAddress ?? profile.unit,
      sponsorAddress: sponsor?.householdAddress ?? sponsor?.unit,
      ageOutYears: policy.ageOutYears,
      requireSameAddress: policy.requireSameAddress,
      warnDaysBefore: policy.warnDaysBefore,
    });
    if (ev.suggestedStatus !== "active") {
      householdAlerts.push(
        insight(
          "dependent",
          "Dependent membership",
          ev.pastDue ? 90 : 65,
          ev.daysUntilAgeOut != null
            ? `${ev.daysUntilAgeOut} days until age-out`
            : "Address or age policy attention needed",
          "/member/household",
        ),
      );
    }
  }
  if (isMembershipDeactivated(profile?.membershipStatus)) {
    householdAlerts.push(
      insight(
        "deactivated",
        "Membership deactivated",
        95,
        "Membership was not renewed — account cannot use the portal until Membership reactivates it.",
        "/member/membership",
      ),
    );
  } else if (profile?.membershipStatus === "resigned") {
    const policy = await ensureRejoinPolicy(communityId);
    const ev = evaluateRejoinEligibility({
      policyEnabled: policy.enabled,
      waitDays: policy.waitDays,
      resignedAt: profile.resignedAt,
      rejoinEligibleOn: profile.rejoinEligibleOn,
    });
    householdAlerts.push(
      insight(
        "rejoin",
        "Rejoin wait",
        ev.waiting ? 70 : 20,
        ev.daysRemaining != null
          ? `${ev.daysRemaining} days left in wait period`
          : "Eligible to rejoin",
        "/member/membership",
      ),
    );
  }

  const forYou: InsightScore[] = [];
  if (churnRisk.score >= 55) forYou.push(churnRisk);
  if (tierFit.score >= 55) forYou.push(tierFit);
  if (remaining > 0) {
    forYou.push(
      insight("fb", "F&B minimum", 60, fbSuggestions[0]!, "/member/dining"),
    );
  }
  if (demandHeat[0]) {
    forYou.push(
      insight(
        "slot",
        "Busy times",
        50,
        `${demandHeat[0].label} peaks around ${demandHeat[0].hour}:00 — book nearby slots early.`,
        "/member/bookings",
      ),
    );
  }
  forYou.push(...householdAlerts);
  if (amenities.some((a) => a.kind === "restaurant")) {
    forYou.push(
      insight(
        "dining",
        "Order ahead",
        45,
        "Eat-in holds a table and times the kitchen for your arrival.",
        "/member/dining",
      ),
    );
  }

  const bundle: InsightBundle = {
    forYou: forYou.slice(0, 6),
    churnRisk,
    tierFit,
    fbSuggestions,
    noShowRisk,
    demandHeat,
    partnerMatches,
    householdAlerts,
    generatedAt: new Date().toISOString(),
    provider: "heuristic",
  };

  await prisma.aiInsightSnapshot.upsert({
    where: {
      communityId_userEmail: { communityId, userEmail: email },
    },
    create: {
      communityId,
      userEmail: email,
      payloadJson: JSON.stringify(bundle),
    },
    update: { payloadJson: JSON.stringify(bundle) },
  });

  return bundle;
}
