import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  assignCommunityOwner,
  createSalesperson,
  hireDownline,
  listAssignments,
  listSalespeople,
  findSalespersonByUserId,
} from "@/lib/server/sales-crm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSuperAdmin(session)) {
    const [people, assignments] = await Promise.all([
      listSalespeople(),
      listAssignments({ activeOnly: false }),
    ]);
    return NextResponse.json({ people, assignments });
  }

  if (session.role === "sales") {
    const me = await findSalespersonByUserId(session.sub);
    if (!me) {
      return NextResponse.json({ error: "Sales profile not found" }, { status: 404 });
    }
    const [people, assignments] = await Promise.all([
      listSalespeople(),
      listAssignments({ salespersonId: me.id }),
    ]);
    const downline = people.filter(
      (p) => p.id === me.id || p.parentId === me.id,
    );
    return NextResponse.json({
      me,
      people: downline,
      assignments,
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    email?: string;
    name?: string;
    password?: string;
    parentId?: string | null;
    communityId?: string;
    salespersonId?: string;
    reason?: string;
    role?: "owner" | "support";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action ?? "create";

  if (action === "create") {
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: "email, name, and password required" },
        { status: 400 },
      );
    }
    const result = await createSalesperson({
      email: body.email,
      name: body.name,
      password: body.password,
      parentId: body.parentId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, salesperson: result });
  }

  if (action === "hire") {
    if (session.role !== "sales" && !isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: "email, name, and password required" },
        { status: 400 },
      );
    }
    let hiringId = body.parentId ?? null;
    if (session.role === "sales") {
      const me = await findSalespersonByUserId(session.sub);
      if (!me) {
        return NextResponse.json({ error: "Sales profile not found" }, { status: 404 });
      }
      hiringId = me.id;
    }
    if (!hiringId) {
      return NextResponse.json({ error: "parentId required" }, { status: 400 });
    }
    const result = await hireDownline({
      hiringSalespersonId: hiringId,
      email: body.email,
      name: body.name,
      password: body.password,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, salesperson: result });
  }

  if (action === "assign") {
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.communityId || !body.salespersonId) {
      return NextResponse.json(
        { error: "communityId and salespersonId required" },
        { status: 400 },
      );
    }
    const result = await assignCommunityOwner({
      communityId: body.communityId,
      salespersonId: body.salespersonId,
      reason: body.reason,
      role: body.role ?? "owner",
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, assignment: result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
