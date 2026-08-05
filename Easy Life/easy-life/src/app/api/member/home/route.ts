import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  listBookingsForMember,
  listBookingInvitesForMember,
  listCalendarAds,
  listCommunityEvents,
  listMemberCharges,
  listPaidFeaturedTiles,
  listServiceRequests,
  listTournaments,
  ensureDemoPaidFeatured,
} from "@/lib/server/records";
import { getCommunityBookings } from "@/lib/communities-data";
import { getMemberProfile } from "@/lib/server/member-api-store";
import { getAccountProfile } from "@/lib/server/db";
import { isActiveServiceBooking } from "@/lib/types";
import { prisma } from "@/lib/server/prisma";
import { bracketWinnersForTournament, buildRounds, validWinner } from "@/lib/tournament-bracket";
import { findNextMatchForPlayer, type MatchSlot } from "@/lib/tournament-display";
import { parseScoresJson } from "@/lib/tournament-scores";
import {
  ensureFourClubDemoContent,
  isFourClubDemoId,
} from "@/lib/server/four-club-demo-content";
import { countUnreadMemberInbox } from "@/lib/server/project-management";
import {
  communityHasTournaments,
  communityIsResidentialHoa,
} from "@/lib/community-features";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const communityId = session.communityId;
  const wantsTournaments = communityHasTournaments(communityId);
  const residential = communityIsResidentialHoa(communityId);

  await ensureRecordsSeeded();
  if (isFourClubDemoId(communityId)) {
    await ensureFourClubDemoContent("full", communityId, session.email);
  }

  const [
    charges,
    bookings,
    events,
    requests,
    ads,
    tournamentRows,
    profile,
    community,
    account,
  ] = await Promise.all([
    listMemberCharges({ communityId, memberEmail: session.email }),
    listBookingsForMember(session.email),
    listCommunityEvents(communityId),
    listServiceRequests({ communityId, email: session.email }),
    listCalendarAds(communityId),
    wantsTournaments ? listTournaments(communityId) : Promise.resolve([]),
    getMemberProfile(session.email),
    prisma.community.findUnique({
      where: { id: communityId },
      select: { name: true, logoUrl: true, appDisplayName: true },
    }),
    getAccountProfile(session.email),
  ]);

  const tournaments = tournamentRows
    .filter((t) => t.seedsJson != null)
    .slice(0, 10);
  const balance = charges
    .filter((c) => c.status !== "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const memberName = session.name ?? profile.name;
  const email = session.email.toLowerCase();

  const serviceBookings = getCommunityBookings(communityId)
    .filter((b) => {
      if (!isActiveServiceBooking(b.status)) return false;
      const resident = b.resident.toLowerCase();
      const name = memberName.toLowerCase();
      return resident === name || resident === "member";
    })
    .map((b) => ({
      id: b.id,
      service: b.service,
      date: b.date,
      time: b.time,
      status: b.status === "accepted" ? "accepted" : "pending",
    }));

  const myTournaments = wantsTournaments
    ? tournaments
        .map((t) => {
          const playerRecord = t.players.find(
            (p) => p.memberEmail?.toLowerCase() === email,
          );
          if (!playerRecord) return null;

          const seeds = JSON.parse(t.seedsJson!) as string[];
          const winners = JSON.parse(t.winnersJson) as Record<string, string>;
          const tournament = {
            id: t.id,
            title: t.title,
            sport: t.sport,
            scoringFormat: t.scoringFormat,
            seeds,
            winners,
            scores: parseScoresJson(t.scoresJson),
          };
          const derived = bracketWinnersForTournament(tournament);
          const rounds = buildRounds(t.id, seeds, derived);
          const champion = rounds.length
            ? validWinner(rounds[rounds.length - 1][0], derived)
            : null;
          const playerName =
            playerRecord.partnerName && t.eventType !== "Singles"
              ? `${playerRecord.name} / ${playerRecord.partnerName}`
              : playerRecord.name;
          const schedule = JSON.parse(t.scheduleJson) as Record<
            string,
            MatchSlot | string
          >;
          const nextMatch = findNextMatchForPlayer(
            rounds,
            derived,
            playerName,
            schedule,
            t.sport,
          );
          return {
            id: t.id,
            title: t.title,
            sport: t.sport,
            date: t.date,
            status: champion ? "completed" : "in_progress",
            nextMatch: nextMatch
              ? {
                  opponent: nextMatch.opponent,
                  courtNumber: nextMatch.courtNumber,
                  courtLabel: nextMatch.courtLabel,
                  time: nextMatch.time,
                  date: nextMatch.date || t.date,
                }
              : null,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t != null)
    : [];

  if (!residential) {
    await ensureDemoPaidFeatured(communityId);
  }
  const featuredTiles = residential
    ? []
    : await listPaidFeaturedTiles(communityId);

  const [unreadInbox, pendingEventInvites, bookingInvites] = await Promise.all([
    countUnreadMemberInbox(session.email),
    prisma.eventInvite.count({
      where: { memberEmail: email, status: "pending" },
    }),
    listBookingInvitesForMember(email),
  ]);
  const notificationCount =
    unreadInbox + pendingEventInvites + bookingInvites.length;

  return NextResponse.json({
    balance,
    profile: {
      name: memberName,
      email: session.email,
      avatarUrl: account?.avatarUrl ?? null,
      residencyStatus: profile.residencyStatus,
      paysHoa: profile.paysHoa,
      membershipTier: profile.membershipTier,
    },
    branding: community
      ? {
          id: communityId,
          name: community.appDisplayName || community.name,
          logoUrl: community.logoUrl,
        }
      : null,
    bookings: bookings.map((b) => ({
      id: b.id,
      amenity: b.amenity,
      date: b.date,
      time: `${b.startTime} – ${b.endTime}`,
      status: b.status,
    })),
    serviceBookings,
    events: events.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      category: e.category,
    })),
    requests: requests.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      date: r.createdAt.toISOString().slice(0, 10),
    })),
    ads: ads.map((a) => ({
      id: a.id,
      sponsor: a.sponsor,
      text: a.title,
      linkUrl: a.linkUrl,
      color: "from-[var(--mvp-blue)] to-[#0051d4]",
    })),
    tournaments: myTournaments,
    featuredTiles,
    notificationCount,
  });
}
