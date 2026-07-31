import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { addProviderToCommunity } from "@/lib/server/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: {
    businessName?: string;
    type?: "service" | "activity";
    category?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.businessName || !body.type) {
    return NextResponse.json(
      { error: "Business name and type are required" },
      { status: 400 },
    );
  }

  const result = await addProviderToCommunity(id, {
    businessName: body.businessName,
    type: body.type,
    category: body.category ?? "General",
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
  });

  if (!result) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  revalidatePath(`/communities/${id}`);
  revalidatePath("/services-activities");
  return NextResponse.json({
    ok: true,
    provider: result.provider,
    emailSent: result.emailSent ?? false,
    emailError: result.emailError,
    // Production: only expose OTP when email was not sent (manual share) so invites
    // still work without Resend. Prefer configuring RESEND_API_KEY in production.
    otp:
      process.env.NODE_ENV !== "production" || !result.emailSent
        ? result.otp
        : undefined,
  });
}
