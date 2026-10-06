import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";
import { readPrivateDocument } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

function storedKey(name: string): string {
  return `private:${name}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const filename = decodeURIComponent(name);
  const key = storedKey(filename);
  const email = session.email.toLowerCase();
  const staff = session.role === "admin" || session.role === "pm" || session.role === "board";

  const credential = await prisma.providerCredential.findFirst({ where: { url: key } });
  if (credential) {
    const owner = session.role === "provider" && credential.providerEmail === email;
    const communityId = staff ? await resolveScopedCommunityId(session) : null;
    if (!owner && !(staff && communityId === credential.communityId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [{ registrationUrl: key }, { insuranceUrl: key }, { govIdUrl: key }],
      },
    });
    if (!vehicle || vehicle.userId !== session.sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const file = await readPrivateDocument(key);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
