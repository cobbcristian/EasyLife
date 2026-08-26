import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, community, units, message } = body;

    if (!name || !email || !community) {
      return NextResponse.json(
        { error: "Name, email, and community are required" },
        { status: 400 }
      );
    }

    await prisma.helpTicket.create({
      data: {
        userName: name,
        email,
        subject: `Landing page lead: ${community}`,
        priority: "High",
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

    console.log("[Landing Lead]", { name, email, community, units });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Landing contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}
