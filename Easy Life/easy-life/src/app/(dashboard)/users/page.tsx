import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { UsersAdminClient } from "./users-admin-client";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return <UsersAdminClient isSuperAdmin={isSuperAdmin(session)} />;
}
