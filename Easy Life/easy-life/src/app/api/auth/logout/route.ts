import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const response = wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/login", request.url));
  return clearSession(response);
}

/** Allow link / address-bar logout without 405. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  return clearSession(response);
}
