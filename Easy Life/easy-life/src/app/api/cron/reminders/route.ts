import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/server/cron-auth";
import { processDueReminders } from "@/lib/server/records";
import { processDependentMembershipAging } from "@/lib/server/dependent-membership";
import { processRejoinReminders } from "@/lib/server/membership-rejoin";
import { processAutopayDueToday } from "@/lib/server/autopay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [processed, dependents, rejoins, autopay] = await Promise.all([
    processDueReminders(),
    processDependentMembershipAging(),
    processRejoinReminders(),
    processAutopayDueToday(),
  ]);
  return NextResponse.json({
    ok: true,
    processed,
    dependents,
    rejoins,
    autopay,
    ...(auth.secured ? {} : { note: "CRON_SECRET not set — add later to lock down this endpoint" }),
  });
}
