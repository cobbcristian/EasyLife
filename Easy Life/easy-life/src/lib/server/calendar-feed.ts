import { SignJWT, jwtVerify } from "jose";

export type CalendarFeedPayload = {
  email: string;
  name: string;
  communityId: string | null;
};

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production.");
    }
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Long-lived subscribe token for Google / Apple / Outlook ICS feeds. */
export async function createCalendarFeedToken(
  payload: CalendarFeedPayload,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    communityId: payload.communityId,
    purpose: "calendar_feed",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("730d")
    .sign(getKey());
}

export async function verifyCalendarFeedToken(
  token: string,
): Promise<CalendarFeedPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (payload.purpose !== "calendar_feed") return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    if (!email || !name) return null;
    const communityId =
      typeof payload.communityId === "string" ? payload.communityId : null;
    return { email, name, communityId };
  } catch {
    return null;
  }
}

/** Path-safe encoding (JWT has dots that break a single route segment). */
export function encodeCalendarFeedTokenParam(jwt: string): string {
  return Buffer.from(jwt, "utf8").toString("base64url");
}

export function decodeCalendarFeedTokenParam(encoded: string): string | null {
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function buildCalendarSubscribeLinks(httpsFeedUrl: string) {
  const webcalUrl = httpsFeedUrl.replace(/^https:/i, "webcal:");
  const encoded = encodeURIComponent(httpsFeedUrl);
  return {
    httpsUrl: httpsFeedUrl,
    webcalUrl,
    appleUrl: webcalUrl,
    googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    outlookUrl: `https://outlook.live.com/calendar/0/addcalendar?url=${encoded}`,
    outlookOfficeUrl: `https://outlook.office.com/calendar/0/addfromweb?url=${encoded}`,
  };
}
