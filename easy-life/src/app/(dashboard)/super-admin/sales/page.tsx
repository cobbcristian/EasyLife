import { redirect } from "next/navigation";
import { PageBody } from "@/components/layout/content-header";
import { SalesAdminConsole } from "@/components/admin/sales-admin-console";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";

export const dynamic = "force-dynamic";

export default async function SuperAdminSalesPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) redirect("/login");
  return (
    <PageBody>
      <SalesAdminConsole />
    </PageBody>
  );
}
