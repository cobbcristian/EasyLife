import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listGlAccounts,
  listJournalEntries,
  createJournalEntry,
} from "@/lib/server/general-ledger";
import {
  exportQuickBooksCsv,
  getQuickBooksStatus,
  connectQuickBooksRealm,
} from "@/lib/server/quickbooks-export";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const exportQb = searchParams.get("export") === "quickbooks";

  if (exportQb) {
    const csv = await exportQuickBooksCsv(communityId);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="quickbooks-${communityId}.csv"`,
      },
    });
  }

  const [accounts, entries, quickbooks] = await Promise.all([
    listGlAccounts(communityId),
    listJournalEntries(communityId),
    getQuickBooksStatus(communityId),
  ]);
  return NextResponse.json({ accounts, entries, quickbooks });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: {
    action?: "journal" | "connect_qb";
    entryDate?: string;
    memo?: string;
    lines?: { accountId: string; debit: number; credit: number; memo?: string }[];
    realmId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "connect_qb" && body.realmId) {
    const result = await connectQuickBooksRealm(communityId, body.realmId);
    return NextResponse.json(result);
  }

  if (!body.lines || !body.entryDate) {
    return NextResponse.json({ error: "Missing journal entry data" }, { status: 400 });
  }

  try {
    const entry = await createJournalEntry({
      communityId,
      entryDate: body.entryDate,
      memo: body.memo ?? "",
      postedBy: session.name,
      lines: body.lines,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
