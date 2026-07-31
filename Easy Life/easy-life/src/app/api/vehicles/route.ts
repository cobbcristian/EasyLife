import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createVehicle, listVehicles } from "@/lib/server/records";
import { saveDocumentUpload } from "@/lib/server/storage";
import { verifyVehicleRegistration } from "@/lib/server/vehicle-verify";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ vehicles: await listVehicles(session.sub) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let make = "";
  let model = "";
  let color = "";
  let plate = "";
  let year: number | null = null;
  let ownerName = "";
  let registrationFile: File | null = null;
  let insuranceFile: File | null = null;
  let govIdFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    make = String(form.get("make") ?? "").trim();
    model = String(form.get("model") ?? "").trim();
    color = String(form.get("color") ?? "").trim();
    plate = String(form.get("plate") ?? "").trim();
    ownerName = String(form.get("ownerName") ?? "").trim() || session.name;
    const yearRaw = String(form.get("year") ?? "").trim();
    year = yearRaw ? Number(yearRaw) : null;
    if (year != null && !Number.isFinite(year)) year = null;
    const reg = form.get("registration");
    const ins = form.get("insurance");
    const gov = form.get("govId");
    registrationFile = reg instanceof File && reg.size > 0 ? reg : null;
    insuranceFile = ins instanceof File && ins.size > 0 ? ins : null;
    govIdFile = gov instanceof File && gov.size > 0 ? gov : null;
  } else {
    let body: {
      make?: string;
      model?: string;
      color?: string;
      plate?: string;
      year?: number;
      ownerName?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    make = body.make?.trim() ?? "";
    model = body.model?.trim() ?? "";
    color = body.color?.trim() ?? "";
    plate = body.plate?.trim() ?? "";
    year = body.year ?? null;
    ownerName = body.ownerName?.trim() || session.name;
  }

  if (!make || !model || !plate) {
    return NextResponse.json({ error: "Make, model, and plate required" }, { status: 400 });
  }
  if (!registrationFile || !insuranceFile) {
    return NextResponse.json(
      {
        error:
          "Upload vehicle registration and insurance documents (image or PDF). Government ID is strongly recommended.",
      },
      { status: 400 },
    );
  }

  try {
    const [registrationUrl, insuranceUrl, govIdUrl] = await Promise.all([
      saveDocumentUpload(registrationFile),
      saveDocumentUpload(insuranceFile),
      govIdFile ? saveDocumentUpload(govIdFile) : Promise.resolve(null),
    ]);

    const registrationBuf = Buffer.from(await registrationFile.arrayBuffer());
    const insuranceBuf = Buffer.from(await insuranceFile.arrayBuffer());
    const govIdBuf = govIdFile ? Buffer.from(await govIdFile.arrayBuffer()) : undefined;

    const verification = await verifyVehicleRegistration({
      claim: {
        year,
        make,
        model,
        plate,
        ownerName,
        memberName: session.name,
        memberEmail: session.email,
      },
      registration: {
        fileName: registrationFile.name,
        buffer: registrationBuf,
        mimeType: registrationFile.type,
      },
      insurance: {
        fileName: insuranceFile.name,
        buffer: insuranceBuf,
        mimeType: insuranceFile.type,
      },
      govId: govIdFile
        ? {
            fileName: govIdFile.name,
            buffer: govIdBuf,
            mimeType: govIdFile.type,
          }
        : null,
    });

    const vehicle = await createVehicle({
      userId: session.sub,
      make,
      model,
      color,
      plate,
      year,
      ownerName,
      registrationUrl,
      insuranceUrl,
      govIdUrl,
      verificationStatus: verification.status,
      verificationJson: JSON.stringify(verification),
      verifiedAt: verification.status === "verified" ? new Date() : null,
    });

    revalidatePath("/member/profile");
    return NextResponse.json({
      ok: true,
      vehicle,
      verification: {
        status: verification.status,
        score: verification.score,
        notes: verification.notes,
        matches: verification.matches,
        provider: verification.provider,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
