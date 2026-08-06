import { NextResponse } from "next/server";
import { getSession, createSessionToken } from "@/lib/server/auth";

/**
 * Issue a mobile JWT from an existing httpOnly web session.
 * Used by the Oceanside native WebView after email/password web login
 * so push registration and SecureStore can share the same token.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await createSessionToken({
    sub: session.sub,
    email: session.email,
    role: session.role,
    name: session.name,
    communityId: session.communityId,
  });

  return NextResponse.json({
    ok: true,
    token,
    role: session.role,
    redirectTo:
      session.role === "provider"
        ? "/provider"
        : session.role === "admin"
          ? "/dashboard"
          : "/member",
  });
}
