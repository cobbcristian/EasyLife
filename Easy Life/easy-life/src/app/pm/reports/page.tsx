import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, getFinancialReport } from "@/lib/server/records";
import { ReportsClient } from "@/app/(dashboard)/reports/reports-client";

export const dynamic = "force-dynamic";

export default async function PmReportsPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/reports] ensureRecordsSeeded failed", err);
  }
  if (!session) return null;

  try {
    await ensureFourClubDemoContent("full", session.communityId, session.email);
  } catch (err) {
    console.error("[pm/reports] four-club seed failed", err);
  }

  const communityId = await resolveScopedCommunityId(session);
  const { revenue, commission, payouts, ledger } = await getFinancialReport(communityId);

  return (
    <ReportsClient
      revenue={revenue}
      commission={commission}
      payouts={payouts}
      ledger={ledger}
    />
  );
}
