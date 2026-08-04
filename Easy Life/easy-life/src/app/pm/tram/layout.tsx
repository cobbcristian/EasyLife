import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasTramService } from "@/lib/community-features";

export default async function PmTramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!communityHasTramService(session?.communityId)) {
    redirect("/pm");
  }
  return children;
}
