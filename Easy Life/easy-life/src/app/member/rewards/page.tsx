import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, getRewardAccount } from "@/lib/server/records";
import { redirect } from "next/navigation";
import { RewardsClient } from "./rewards-client";

export default async function MemberRewardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const account = await getRewardAccount(session.email);
  return (
    <RewardsClient
      userName={session.name}
      initial={{
        points: account.points,
        tier: account.tier,
        nextTier: account.nextTier,
        toNext: account.toNext,
        perks: account.perks.map((p) => ({ ...p })),
        history: account.history.map((h) => ({
          id: h.id,
          label: h.label,
          points: h.points,
          date: h.createdAt.toISOString().slice(0, 10),
        })),
      }}
    />
  );
}
