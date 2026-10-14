import { prisma } from "@/lib/server/prisma";
import { sendEmail } from "@/lib/server/notify";
import { sendPushToUser } from "@/lib/server/push";
import {
  credentialKindLabel,
  lapseStage,
  utcDay,
  type LapseStage,
} from "@/lib/credential-lapse";

function noticeCopy(input: {
  stage: LapseStage;
  kind: string;
  providerName: string;
  expiresOn: string;
  audience: "provider" | "staff";
}): { title: string; body: string } {
  const label = credentialKindLabel(input.kind);
  const title =
    input.stage === "lapsed" ? `${label} has lapsed` : `${label} expires soon`;
  if (input.audience === "provider") {
    const body =
      input.stage === "lapsed"
        ? `Your ${label.toLowerCase()} on file expired on ${input.expiresOn}. Upload a current copy so the community can keep you active.`
        : `Your ${label.toLowerCase()} on file expires on ${input.expiresOn}. Upload a current copy before it lapses.`;
    return { title, body };
  }
  const body =
    input.stage === "lapsed"
      ? `${input.providerName}'s ${label.toLowerCase()} expired on ${input.expiresOn}.`
      : `${input.providerName}'s ${label.toLowerCase()} expires on ${input.expiresOn}.`;
  return { title, body };
}

export async function processCredentialLapses(now = new Date()): Promise<number> {
  const today = utcDay(now);
  const rows = await prisma.providerCredential.findMany({
    where: {
      kind: { in: ["license", "insurance"] },
      expiresOn: { not: null },
    },
    include: { provider: { select: { name: true } } },
    take: 500,
  });

  const staffByCommunity = new Map<string, string[]>();
  let notified = 0;

  for (const row of rows) {
    const expiresOn = row.expiresOn ?? "";
    const stage = lapseStage(expiresOn, today);
    if (!stage || stage === row.lapseNotice) continue;

    const providerName = row.provider.name || row.providerEmail;
    let staff = staffByCommunity.get(row.communityId);
    if (!staff) {
      const users = await prisma.user.findMany({
        where: {
          communityId: row.communityId,
          role: { in: ["pm", "admin", "board"] },
          status: "active",
        },
        select: { email: true },
        take: 50,
      });
      staff = users.map((user) => user.email.trim().toLowerCase()).filter(Boolean);
      staffByCommunity.set(row.communityId, staff);
    }

    const targets: { email: string; href: string; audience: "provider" | "staff" }[] = [];
    const providerEmail = row.providerEmail.trim().toLowerCase();
    if (providerEmail) {
      targets.push({
        email: providerEmail,
        href: "/provider/account",
        audience: "provider",
      });
    }
    for (const email of staff) {
      if (email === providerEmail) continue;
      targets.push({
        email,
        href: "/pm/provider-credentials",
        audience: "staff",
      });
    }

    if (targets.length > 0) {
      await prisma.memberInboxItem.createMany({
        data: targets.map((target) => {
          const copy = noticeCopy({
            stage,
            kind: row.kind,
            providerName,
            expiresOn,
            audience: target.audience,
          });
          return {
            userEmail: target.email,
            title: copy.title,
            body: copy.body,
            href: target.href,
          };
        }),
      });
      for (const target of targets) {
        const copy = noticeCopy({
          stage,
          kind: row.kind,
          providerName,
          expiresOn,
          audience: target.audience,
        });
        await sendEmail({ to: target.email, subject: copy.title, body: copy.body }).catch(
          () => undefined,
        );
        await sendPushToUser(target.email, {
          title: copy.title,
          body: copy.body,
          url: target.href,
        }).catch(() => 0);
      }
    }

    await prisma.providerCredential.update({
      where: { id: row.id },
      data: { lapseNotice: stage },
    });
    notified += 1;
  }

  return notified;
}
