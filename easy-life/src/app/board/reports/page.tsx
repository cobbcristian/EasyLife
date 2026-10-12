import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, getFinancialReport } from "@/lib/server/records";
import { ReportsClient } from "@/app/(dashboard)/reports/reports-client";

export const dynamic = "force-dynamic";

export default async function BoardReportsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

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
