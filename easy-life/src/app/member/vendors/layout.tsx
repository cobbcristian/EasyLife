import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasVendors } from "@/lib/community-features";

export default async function MemberVendorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!communityHasVendors(session?.communityId)) {
    redirect("/member");
  }
  return children;
}
