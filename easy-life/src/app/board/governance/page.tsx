import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  getVotedSurveyIds,
  listBids,
  listSurveys,
} from "@/lib/server/records";
import { GovernanceClient } from "./governance-client";

export const dynamic = "force-dynamic";

export default async function BoardGovernancePage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[board/governance] ensureRecordsSeeded failed", err);
  }

  let rows: Awaited<ReturnType<typeof listSurveys>> = [];
  let bids: Awaited<ReturnType<typeof listBids>> = [];
  let votedIds: string[] = [];
  try {
    [rows, bids] = await Promise.all([
      listSurveys(session?.communityId),
      listBids(session?.communityId),
    ]);
    votedIds = session ? await getVotedSurveyIds(session.email) : [];
  } catch (err) {
    console.error("[board/governance] data load failed", err);
  }

  const surveys = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    closes: s.closes,
    options: (s.options ?? []).map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
  }));

  return (
    <GovernanceClient
      surveys={surveys}
      votedIds={votedIds}
      bids={bids.map((b) => ({
        id: b.id,
        project: b.project,
        vendor: b.vendor,
        amount: b.amount,
        status: b.status,
        date: b.createdAt.toISOString(),
      }))}
    />
  );
}
