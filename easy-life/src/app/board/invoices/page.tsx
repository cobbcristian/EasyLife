import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listInvoices } from "@/lib/server/records";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

export default async function BoardInvoicesPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const rows = await listInvoices(session?.communityId);
  const initial = rows.map((i) => ({
    id: i.id,
    vendor: i.vendor,
    description: i.description,
    amount: i.amount,
    status: i.status,
    submittedBy: i.submittedBy,
    createdAt: i.createdAt.toISOString().slice(0, 10),
  }));
  return <InvoicesClient initial={initial} />;
}
