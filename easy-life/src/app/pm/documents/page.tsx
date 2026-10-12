import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listDocuments } from "@/lib/server/records";
import { PmDocumentsClient } from "./pm-documents-client";

export const dynamic = "force-dynamic";

const PM_CATEGORIES = new Set(["rules", "policy", "emergency", "legal"]);

const DEMO_PDF =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

export default async function PmDocumentsPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/documents] ensureRecordsSeeded failed", err);
  }

  let docs: Awaited<ReturnType<typeof listDocuments>> = [];
  try {
    docs = await listDocuments({ communityId: session?.communityId });
  } catch (err) {
    console.error("[pm/documents] listDocuments failed", err);
  }

  const filtered = docs.filter((d) => {
    if (d.audience === "board") return false;
    // PM portal shows club operating docs; include common categories.
    return (
      PM_CATEGORIES.has(d.category) ||
      d.category === "minutes" ||
      d.category === "financial"
    );
  });

  return (
    <PmDocumentsClient
      documents={filtered.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        url: d.url === "#" ? DEMO_PDF : d.url,
        size: d.sizeLabel,
        date: d.createdAt.toISOString(),
      }))}
    />
  );
}
