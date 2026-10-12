import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasRentals } from "@/lib/community-features";

export default async function MemberRentalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!communityHasRentals(session?.communityId)) {
    redirect("/member");
  }
  return children;
}
