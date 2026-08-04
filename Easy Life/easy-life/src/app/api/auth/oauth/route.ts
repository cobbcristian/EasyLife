import { NextResponse } from "next/server";
import { listConfiguredOAuthProviders } from "@/lib/server/oauth";

export async function GET() {
  return NextResponse.json({
    providers: listConfiguredOAuthProviders(),
  });
}
