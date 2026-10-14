import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/server/cron-auth";
import { processDueReminders } from "@/lib/server/records";
import { processDependentMembershipAging } from "@/lib/server/dependent-membership";
import { processRejoinReminders } from "@/lib/server/membership-rejoin";
import { processAutopayDueToday } from "@/lib/server/autopay";
import { purgeExpiredAiChats } from "@/lib/server/ai-chat-retention";
import { processCredentialLapses } from "@/lib/server/credential-lapse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [processed, dependents, rejoins, autopay, aiChatRetention, credentialLapses] =
    await Promise.all([
      processDueReminders(),
      processDependentMembershipAging(),
      processRejoinReminders(),
      processAutopayDueToday(),
      purgeExpiredAiChats(),
      processCredentialLapses(),
    ]);
  return NextResponse.json({
    ok: true,
    processed,
    dependents,
    rejoins,
    autopay,
    aiChatRetention,
    credentialLapses,
    ...(auth.secured ? {} : { note: "CRON_SECRET not set — add later to lock down this endpoint" }),
  });
}
