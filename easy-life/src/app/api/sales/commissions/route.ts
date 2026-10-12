import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  closeCommunityContract,
  listCommissionLines,
  markCommissionLinesPaid,
} from "@/lib/server/commissions";
import { findSalespersonByUserId } from "@/lib/server/sales-crm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId") ?? undefined;
  const includeDownline = url.searchParams.get("downline") === "1";
  const status = url.searchParams.get("status") ?? undefined;

  if (isSuperAdmin(session)) {
    const lines = await listCommissionLines({
      communityId,
      status,
      includeDownline: false,
    });
    return NextResponse.json({ lines });
  }

  if (session.role === "sales") {
    const me = await findSalespersonByUserId(session.sub);
    if (!me) {
      return NextResponse.json({ error: "Sales profile not found" }, { status: 404 });
    }
    const lines = await listCommissionLines({
      salespersonId: me.id,
      includeDownline,
      communityId,
      status,
    });
    return NextResponse.json({ lines, me });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    communityId?: string;
    contractValueUsd?: number;
    lineIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "close_contract") {
    if (!body.communityId || !(body.contractValueUsd && body.contractValueUsd > 0)) {
      return NextResponse.json(
        { error: "communityId and positive contractValueUsd required" },
        { status: 400 },
      );
    }
    const result = await closeCommunityContract({
      communityId: body.communityId,
      contractValueUsd: body.contractValueUsd,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (body.action === "mark_paid") {
    const ids = body.lineIds ?? [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "lineIds required" }, { status: 400 });
    }
    const count = await markCommissionLinesPaid(ids);
    return NextResponse.json({ ok: true, count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
