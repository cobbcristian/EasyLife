import { verifySessionToken } from "@/lib/server/auth";
import type { SessionPayload } from "@/lib/types";

export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function getMobileSession(
  request: Request,
): Promise<SessionPayload | null> {
  return verifySessionToken(bearerToken(request));
}
