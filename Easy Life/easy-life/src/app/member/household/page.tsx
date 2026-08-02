import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasHouseholdMembership } from "@/lib/community-features";
import { HouseholdClient } from "./household-client";

export const dynamic = "force-dynamic";

export default async function MemberHouseholdPage() {
  const session = await getSession();
  if (!communityHasHouseholdMembership(session?.communityId)) {
    redirect("/member");
  }
  return <HouseholdClient />;
}
