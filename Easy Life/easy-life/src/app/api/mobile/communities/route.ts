import { NextResponse } from "next/server";
import { listCommunities } from "@/lib/server/db";

/** Public community picker for mobile signup (id + display only). */
export async function GET() {
  const communities = await listCommunities();
  return NextResponse.json({
    communities: communities.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
    })),
  });
}
