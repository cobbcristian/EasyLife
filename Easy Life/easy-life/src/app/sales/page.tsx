import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { SalesRepConsole } from "@/components/sales/sales-rep-console";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "sales" && session.role !== "admin") redirect("/login");
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <SalesRepConsole />
    </div>
  );
}
