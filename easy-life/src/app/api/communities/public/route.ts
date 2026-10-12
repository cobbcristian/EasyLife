import { NextResponse } from "next/server";
import { listCommunities } from "@/lib/server/db";

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
