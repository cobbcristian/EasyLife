import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listDocuments } from "@/lib/server/records";
import { BoardDocumentsClient } from "./board-documents-client";

export const dynamic = "force-dynamic";

export default async function BoardDocumentsPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[board/documents] ensureRecordsSeeded failed", err);
  }

  let docs: Awaited<ReturnType<typeof listDocuments>> = [];
  try {
    docs = await listDocuments({ communityId: session?.communityId });
  } catch (err) {
    console.error("[board/documents] listDocuments failed", err);
  }

  return (
    <BoardDocumentsClient
      documents={docs.map((d) => ({
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
