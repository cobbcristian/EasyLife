import { getSession } from "@/lib/server/auth";
import { MemberTournamentsClient } from "./member-tournaments-client";

export const dynamic = "force-dynamic";

export default async function MemberTournamentsPage() {
  const session = await getSession();
  return (
    <MemberTournamentsClient
      avatarName={session?.name?.trim() || "Member"}
      memberEmail={session?.email ?? ""}
    />
  );
}
