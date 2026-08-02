import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasGuestFees } from "@/lib/community-features";

export default async function PmGuestFeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!communityHasGuestFees(session?.communityId)) {
    redirect("/pm");
  }
  return children;
}
