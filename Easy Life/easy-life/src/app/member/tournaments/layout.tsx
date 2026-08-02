import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasTournaments } from "@/lib/community-features";

export default async function MemberTournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!communityHasTournaments(session?.communityId)) {
    redirect("/member");
  }
  return children;
}
