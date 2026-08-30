import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

const PLATFORM_LEAD_COMMUNITY = "__platform_leads__";
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_COMMUNITY = 200;
const MAX_UNITS = 80;
const MAX_MESSAGE = 4000;

function trimField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL;
}

/**
 * Public marketing lead capture.
 * Tickets are scoped to platform-only community id so club admins do not see them.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`landing-contact:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const name = trimField(body?.name, MAX_NAME);
    const email = trimField(body?.email, MAX_EMAIL).toLowerCase();
    const community = trimField(body?.community, MAX_COMMUNITY);
    const units = trimField(body?.units, MAX_UNITS);
    const message = trimField(body?.message, MAX_MESSAGE);

    if (!name || !email || !community) {
      return NextResponse.json(
        { error: "Name, email, and community are required" },
        { status: 400 },
      );
    }
    if (!isPlausibleEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    await prisma.helpTicket.create({
      data: {
        // Platform-only bucket — excluded from club-scoped listHelpTickets.
        communityId: PLATFORM_LEAD_COMMUNITY,
        userName: name,
        email,
        subject: `Landing page lead: ${community}`,
        priority: "Medium",
        message: [
          `Community: ${community}`,
          units ? `Units: ${units}` : null,
          message ? `Message: ${message}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        status: "open",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Landing contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 },
    );
  }
}
