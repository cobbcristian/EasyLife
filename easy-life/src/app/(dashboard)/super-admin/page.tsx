import { redirect } from "next/navigation";
import { PageBody } from "@/components/layout/content-header";
import { SuperAdminConsole } from "@/components/admin/super-admin-console";
import { getSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  return (
    <PageBody>
      <SuperAdminConsole />
    </PageBody>
  );
}
