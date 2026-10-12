import { NextResponse } from "next/server";
import { getPublishedWebsite } from "@/lib/server/website-builder";

export async function GET(
  _request: Request,
  context: { params: Promise<{ communityId: string }> },
) {
  const { communityId } = await context.params;
  const site = await getPublishedWebsite(communityId);
  if (!site.published) {
    return NextResponse.json({ error: "Website not published" }, { status: 404 });
  }
  return NextResponse.json(site);
}
