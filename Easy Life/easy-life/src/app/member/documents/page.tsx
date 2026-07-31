import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listDocuments } from "@/lib/server/records";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function MemberDocumentsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const docs = await listDocuments({ communityId: session?.communityId });

  return (
    <DocumentsClient
      documents={docs
        .filter((d) => d.audience === "member")
        .map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          url: d.url,
          size: d.sizeLabel,
          date: d.createdAt.toISOString(),
        }))}
    />
  );
}
