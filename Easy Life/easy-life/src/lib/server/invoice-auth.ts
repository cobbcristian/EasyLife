import { isSuperAdmin } from "@/lib/server/community-context";
import type { SessionPayload } from "@/lib/types";

/** Board/admin may only approve invoices for their own club (super-admin: any). */
export function canResolveInvoice(
  session: SessionPayload,
  invoiceCommunityId: string,
): boolean {
  if (session.role !== "board" && session.role !== "admin") return false;
  if (isSuperAdmin(session)) return true;
  return session.communityId === invoiceCommunityId;
}
