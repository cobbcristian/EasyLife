import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { updateUserAvatar } from "@/lib/server/db";
import { saveUpload, validateMediaUpload } from "@/lib/server/storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Photo file required" }, { status: 400 });
  }

  const validationError = validateMediaUpload(photo);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const avatarUrl = await saveUpload(photo);
  const saved = await updateUserAvatar(session.email, avatarUrl);
  if (!saved) {
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  revalidatePath("/account");
  revalidatePath("/provider/account");
  revalidatePath("/member/profile");

  return NextResponse.json({ ok: true, avatarUrl: saved });
}
