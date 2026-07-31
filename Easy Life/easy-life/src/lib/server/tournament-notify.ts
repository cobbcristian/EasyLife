import { validWinner } from "@/lib/tournament-bracket";
import {
  formatTennisCourtSmsBody,
  tennisCourtNumber,
  type MatchSlot,
} from "@/lib/tournament-display";
import { isTennisSport } from "@/lib/tournament-ratings";
import { prisma } from "@/lib/server/prisma";
import { sendPushToUser } from "@/lib/server/push";
import { memberPhone, sendSms } from "@/lib/server/sms";
import { buildAllMatches } from "@/lib/server/tournament-scheduling";

function parseSchedule(raw: string): Record<string, MatchSlot | string> {
  try {
    return JSON.parse(raw) as Record<string, MatchSlot | string>;
  } catch {
    return {};
  }
}

function displayName(
  player: { name: string; partnerName: string | null },
  eventType: string,
): string {
  if (eventType !== "Singles" && player.partnerName) {
    return `${player.name} / ${player.partnerName}`;
  }
  return player.name;
}

async function wasCourtNoticeSent(referenceId: string): Promise<boolean> {
  const existing = await prisma.scheduledNotification.findFirst({
    where: { referenceType: "tournament_court_sms", referenceId, sent: true },
  });
  return Boolean(existing);
}

async function markCourtNoticeSent(input: {
  communityId: string;
  userEmail: string;
  userName: string;
  subject: string;
  body: string;
  referenceId: string;
  channel: "sms" | "push" | "skipped";
}) {
  await prisma.scheduledNotification.create({
    data: {
      communityId: input.communityId,
      userEmail: input.userEmail,
      userName: input.userName,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      sendAt: new Date(),
      sent: true,
      referenceType: "tournament_court_sms",
      referenceId: input.referenceId,
    },
  });
}

async function notifyCourtContact(input: {
  communityId: string;
  email: string;
  displayName: string;
  subject: string;
  smsBody: string;
  pushBody: string;
  referenceId: string;
}): Promise<boolean> {
  if (await wasCourtNoticeSent(input.referenceId)) return false;

  let channel: "sms" | "push" | "skipped" = "skipped";
  const phone = await memberPhone(input.email);
  if (phone) {
    const result = await sendSms({ to: phone, body: input.smsBody });
    if (result.ok) channel = "sms";
  }

  const pushSent = await sendPushToUser(input.email, {
    title: input.subject,
    body: input.pushBody,
    url: "/member/tournaments",
  });
  if (channel === "skipped" && pushSent > 0) {
    channel = "push";
  }

  await markCourtNoticeSent({
    communityId: input.communityId,
    userEmail: input.email,
    userName: input.displayName,
    subject: input.subject,
    body: channel === "sms" ? input.smsBody : input.pushBody,
    referenceId: input.referenceId,
    channel,
  });

  return channel !== "skipped";
}

/** Text tennis players (and doubles partners) their court number when matches are scheduled. */
export async function notifyTournamentCourtAssignments(tournamentId: string): Promise<number> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!tournament?.seedsJson || !isTennisSport(tournament.sport)) return 0;

  const seeds = JSON.parse(tournament.seedsJson) as string[];
  const winners = JSON.parse(tournament.winnersJson) as Record<string, string>;
  const schedule = parseSchedule(tournament.scheduleJson);
  const matches = buildAllMatches(tournamentId, seeds, winners);
  const nameToPlayer = new Map(
    tournament.players.map((player) => [displayName(player, tournament.eventType), player]),
  );

  let sent = 0;

  for (const match of matches) {
    if (validWinner(match, winners)) continue;
    if (!match.p1 || !match.p2 || match.p1.startsWith("BYE") || match.p2.startsWith("BYE")) {
      continue;
    }

    const slotVal = schedule[match.id];
    if (!slotVal || typeof slotVal === "string") continue;

    const courtNumber = tennisCourtNumber(slotVal);
    if (courtNumber == null || !slotVal.time) continue;

    for (const playerName of [match.p1, match.p2]) {
      const player = nameToPlayer.get(playerName);
      if (!player) continue;

      const opponent = playerName === match.p1 ? match.p2 : match.p1;
      const subject = `${tournament.title}: Court ${courtNumber}`;
      const pushBody = `Your match is on Court ${courtNumber} at ${slotVal.time} vs ${opponent}.`;
      const recipients: Array<{ email: string; label: string }> = [];
      if (player.memberEmail) {
        recipients.push({ email: player.memberEmail, label: player.name });
      }
      if (
        tournament.eventType !== "Singles" &&
        player.partnerEmail &&
        player.partnerEmail.toLowerCase() !== player.memberEmail?.toLowerCase()
      ) {
        recipients.push({
          email: player.partnerEmail,
          label: player.partnerName ?? "Partner",
        });
      }

      for (const recipient of recipients) {
        const email = recipient.email.toLowerCase();
        const referenceId = `${match.id}:court${courtNumber}:${slotVal.time}:${email}`;
        const smsBody = formatTennisCourtSmsBody({
          tournamentTitle: tournament.title,
          playerName: recipient.label,
          opponent,
          courtNumber,
          time: slotVal.time,
          date: slotVal.date ?? tournament.date,
        });
        const didSend = await notifyCourtContact({
          communityId: tournament.communityId,
          email,
          displayName: recipient.label,
          subject,
          smsBody,
          pushBody,
          referenceId,
        });
        if (didSend) sent++;
      }
    }
  }

  return sent;
}
