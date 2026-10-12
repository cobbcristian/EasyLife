import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listAccessLogs } from "@/lib/server/records";
import { AccessLogsClient } from "./access-logs-client";

export const dynamic = "force-dynamic";

export default async function AccessLogsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

  const communityId = await resolveScopedCommunityId(session);
  const logs = await listAccessLogs(communityId);

  return (
    <AccessLogsClient
      logs={logs.map((l) => ({
        id: l.id,
        userName: l.userName,
        action: l.action,
        detail: l.detail,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
