import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createGalleryImage, ensureRecordsSeeded, listGallery } from "@/lib/server/records";
import { MAX_UPLOAD_BYTES, saveUpload } from "@/lib/server/storage";
import { moderateUpload } from "@/lib/server/ai/moderate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  return NextResponse.json({ images: await listGallery(session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  const title = (form.get("title") as string) || file.name.replace(/\.[^.]+$/, "");
  const category = (form.get("category") as string) || "My Uploads";

  const mod = await moderateUpload({ title, fileName: file.name });
  if (!mod.allowed) {
    return NextResponse.json(
      { error: "Upload blocked by content moderation", reasons: mod.reasons },
      { status: 400 },
    );
  }

  const url = await saveUpload(file);

  const image = await createGalleryImage({
    communityId: session.communityId,
    title,
    category,
    url,
    uploadedBy: session.name,
  });
  revalidatePath("/member/gallery");
  return NextResponse.json({ ok: true, image });
}
