import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listCampaigns,
  createCampaign,
  recordDonation,
  getCampaignWithDonations,
} from "@/lib/server/fundraising";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = session.communityId ?? "golden-ocala";
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("id");
  if (campaignId) {
    const campaign = await getCampaignWithDonations(campaignId, communityId);
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ campaign });
  }
  const activeOnly = session.role === "member";
  const campaigns = await listCampaigns(communityId, activeOnly);
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: "create" | "donate";
    title?: string;
    description?: string;
    goalAmount?: number;
    eventDate?: string;
    status?: string;
    campaignId?: string;
    amount?: number;
    donorName?: string;
    message?: string;
    anonymous?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const communityId = session.communityId ?? "golden-ocala";

  if (body.action === "donate") {
    if (!body.campaignId || body.amount == null) {
      return NextResponse.json({ error: "Missing donation fields" }, { status: 400 });
    }
    try {
      const result = await recordDonation({
        communityId,
        campaignId: body.campaignId,
        donorName: body.donorName?.trim() || session.name,
        donorEmail: session.email,
        amount: body.amount,
        message: body.message,
        anonymous: body.anonymous,
      });
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Donation failed";
      const status = message === "Campaign not found" ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }

  if (!["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.title || !body.goalAmount) {
    return NextResponse.json({ error: "title and goalAmount required" }, { status: 400 });
  }
  const campaign = await createCampaign({
    communityId,
    title: body.title,
    description: body.description,
    goalAmount: body.goalAmount,
    eventDate: body.eventDate,
    status: body.status ?? "active",
  });
  return NextResponse.json({ campaign });
}
