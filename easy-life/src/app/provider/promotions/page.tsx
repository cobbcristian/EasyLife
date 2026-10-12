import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listPromotions } from "@/lib/server/records";
import { redirect } from "next/navigation";
import { PromotionsClient } from "./promotions-client";

export default async function ProviderPromotionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const promotions = await listPromotions(session.email);
  return <PromotionsClient initial={promotions} />;
}
