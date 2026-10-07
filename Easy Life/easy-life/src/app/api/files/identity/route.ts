import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";
import { MAX_UPLOAD_BYTES } from "@/lib/server/storage";
import type { SessionPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function canAccessStoredUrl(
  session: SessionPayload,
  storedUrl: string,
): Promise<boolean> {
  const email = session.email.toLowerCase();
  const staff =
    session.role === "admin" || session.role === "pm" || session.role === "board";

  const credential = await prisma.providerCredential.findFirst({
    where: { url: storedUrl },
  });
  if (credential) {
    const owner = session.role === "provider" && credential.providerEmail === email;
    if (owner) return true;
    if (!staff) return false;
    const communityId = await resolveScopedCommunityId(session);
    return communityId === credential.communityId;
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { registrationUrl: storedUrl },
        { insuranceUrl: storedUrl },
        { govIdUrl: storedUrl },
      ],
    },
  });
  return !!vehicle && vehicle.userId === session.sub;
}

function contentTypeForName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

/** Load bytes for a legacy public upload path or https URL (only after authz). */
async function loadLegacyBytes(
  stored: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (stored.startsWith("/uploads/")) {
    const name = stored.slice("/uploads/".length);
    if (!/^[a-z0-9]{8,64}(\.[a-z0-9]{1,5})?$/i.test(name)) return null;
    try {
      const data = await fs.readFile(path.join(UPLOAD_DIR, name));
      return { data, contentType: contentTypeForName(name) };
    } catch {
      return null;
    }
  }

  if (!/^https:\/\//i.test(stored)) return null;

  try {
    const response = await fetch(stored, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0 || data.length > MAX_UPLOAD_BYTES) return null;
    return {
      data,
      contentType: response.headers.get("content-type") || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stored = new URL(request.url).searchParams.get("u")?.trim() ?? "";
  if (!stored || stored.startsWith("private:")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorize against the exact DB-stored URL before any fetch (SSRF guard).
  if (!(await canAccessStoredUrl(session, stored))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await loadLegacyBytes(stored);
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
