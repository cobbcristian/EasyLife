import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { buildMemberInsights } from "@/lib/server/ai/insights";
import { listWaitingRejoins } from "@/lib/server/membership-rejoin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const insights = await buildMemberInsights({
    communityId: session.communityId,
    userEmail: session.email,
  });

  if (["admin", "pm", "board"].includes(session.role)) {
    const waitlist = await listWaitingRejoins(session.communityId);
    return NextResponse.json({
      ...insights,
      ops: {
        rejoinWaiting: waitlist.waiting.slice(0, 10),
        churnNote:
          insights.churnRisk.score >= 60
            ? "This member shows elevated churn risk — useful as a staff demo signal."
            : null,
      },
    });
  }

  return NextResponse.json(insights);
}
