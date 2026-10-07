import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { tournamentsEnabledFor } from "@/lib/server/community-flags";

export default async function MemberTournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!(await tournamentsEnabledFor(session?.communityId))) {
    redirect("/member");
  }
  return children;
}
