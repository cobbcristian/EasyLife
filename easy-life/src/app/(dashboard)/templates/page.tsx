import { ensureRecordsSeeded, listTemplates } from "@/lib/server/records";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  await ensureRecordsSeeded();
  const templates = await listTemplates();
  return <TemplatesClient initial={templates} />;
}
