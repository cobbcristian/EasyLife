import type { AuthRole, SessionPayload } from "@/lib/types";

/**
 * JWT claims after a successful club switch.
 * Role must come from the target membership — never reuse the prior session role,
 * or a PM/board user who is only a member at another club keeps elevated privileges.
 */
export function sessionClaimsForCommunitySwitch(
  session: Pick<SessionPayload, "sub" | "email" | "name">,
  switched: { communityId: string; role: AuthRole },
): SessionPayload {
  return {
    sub: session.sub,
    email: session.email,
    name: session.name,
    role: switched.role,
    communityId: switched.communityId,
  };
}
