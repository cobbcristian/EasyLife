import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listInvoices } from "@/lib/server/records";
import { PmInvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

export default async function PmInvoicesPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/invoices] ensureRecordsSeeded failed", err);
  }
  try {
    await ensureFourClubDemoContent("full", session?.communityId, session?.email);
  } catch (err) {
    console.error("[pm/invoices] four-club seed failed", err);
  }

  let rows: Awaited<ReturnType<typeof listInvoices>> = [];
  try {
    rows = await listInvoices(session?.communityId);
  } catch (err) {
    console.error("[pm/invoices] listInvoices failed", err);
  }

  const initial = rows.map((i) => ({
    id: i.id,
    vendor: i.vendor,
    description: i.description,
    amount: i.amount,
    status: i.status,
    createdAt: i.createdAt.toISOString().slice(0, 10),
  }));
  return <PmInvoicesClient initial={initial} />;
}
