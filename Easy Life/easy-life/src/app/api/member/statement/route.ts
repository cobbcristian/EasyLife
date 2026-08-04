import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { buildMemberStatement } from "@/lib/server/statements";
import {
  getMemberTierSlug,
  getOrCreateFbPeriod,
  getTierConfig,
} from "@/lib/server/membership";
import { getMemberResidency } from "@/lib/server/residency";
import {
  communityHasClubDining,
  communityHasFbMinimum,
  communityHoaPaymentPortal,
  communitySupportsInAppHoaCheckout,
} from "@/lib/community-features";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();

  const communityId = session.communityId;
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start") ?? undefined;
  const endDate = url.searchParams.get("end") ?? undefined;
  const hasFbMinimum = communityHasFbMinimum(communityId);
  const hasClubDining = communityHasClubDining(communityId);
  const hoaPaymentPortal = communityHoaPaymentPortal(communityId);
  const hoaInAppCheckout = communitySupportsInAppHoaCheckout(communityId);

  const [statement, tierSlug, fb, residency] = await Promise.all([
    buildMemberStatement({
      communityId,
      memberEmail: session.email,
      startDate,
      endDate,
    }),
    getMemberTierSlug(session.email),
    getOrCreateFbPeriod({ communityId, memberEmail: session.email }),
    getMemberResidency(session.email),
  ]);
  const tier = await getTierConfig(communityId, tierSlug);
  const required = hasFbMinimum ? fb.requiredAmount : 0;

  return NextResponse.json({
    membership: {
      tier: tierSlug,
      tierName: tier.name,
      accessKinds: tier.accessKinds,
      residencyStatus: residency.residencyStatus,
      paysHoa: residency.paysHoa,
      communityId,
      hasFbMinimum,
      hasClubDining,
      hoaPaymentPortal,
      hoaInAppCheckout,
    },
    fbMinimum: hasFbMinimum
      ? {
          periodKind: fb.periodKind,
          periodStart: fb.periodStart,
          periodEnd: fb.periodEnd,
          required,
          spent: fb.spentAmount,
          remaining: Math.max(0, required - fb.spentAmount),
          status: fb.status,
        }
      : null,
    statement,
  });
}
