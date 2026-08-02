import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { communityHasGrabGo } from "@/lib/community-features";
import { GrabGoMemberClient } from "./grab-go-client";

export const dynamic = "force-dynamic";

export default async function MemberGrabGoPage() {
  const session = await getSession();
  if (!communityHasGrabGo(session?.communityId)) {
    redirect("/member");
  }
  return <GrabGoMemberClient />;
}
