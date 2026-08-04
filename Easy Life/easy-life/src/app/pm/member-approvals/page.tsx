import { getSession } from "@/lib/server/auth";
import { listPendingMembers } from "@/lib/server/member-enrollment";
import { MemberApprovalsClient } from "./member-approvals-client";

export const dynamic = "force-dynamic";

export default async function PmMemberApprovalsPage() {
  const session = await getSession();
  const pending = session?.communityId
    ? await listPendingMembers(session.communityId)
    : [];

  return <MemberApprovalsClient initial={pending} />;
}
