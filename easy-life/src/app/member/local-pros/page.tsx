import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasLocalPros } from "@/lib/community-features";
import { LocalProsClient } from "./local-pros-client";

export const dynamic = "force-dynamic";

export default async function MemberLocalProsPage() {
  const session = await getSession();
  if (!communityHasLocalPros(session?.communityId)) {
    redirect("/member");
  }
  return <LocalProsClient />;
}
