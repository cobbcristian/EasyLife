import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveMarketplaceListingImage } from "@/lib/brand-assets";
import { getSession } from "@/lib/server/auth";
import { createListing, ensureRecordsSeeded, listListings } from "@/lib/server/records";
import { saveUpload, validateMediaUpload } from "@/lib/server/storage";
import { moderateUpload } from "@/lib/server/ai/moderate";

function mapListing(l: Awaited<ReturnType<typeof listListings>>[number]) {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    category: l.category,
    seller: l.seller,
    unit: l.unit,
    imageUrl: resolveMarketplaceListingImage(l.title, l.category, l.imageUrl),
    videoUrl: l.videoUrl,
    createdAt: l.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const listings = await listListings(session.communityId);
  return NextResponse.json({ listings: listings.map(mapListing) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const priceRaw = String(form.get("price") ?? "");
    const category = String(form.get("category") ?? "General").trim() || "General";
    const description = String(form.get("description") ?? "").trim();
    const unit = String(form.get("unit") ?? "—").trim() || "—";
    const imageUrlField = String(form.get("imageUrl") ?? "").trim();
    const videoUrlField = String(form.get("videoUrl") ?? "").trim();
    const imageFile = form.get("image");
    const videoFile = form.get("video");

    if (!title || !priceRaw) {
      return NextResponse.json({ error: "Title and price required" }, { status: 400 });
    }
    const mod = await moderateUpload({
      title,
      caption: description,
      fileName: imageFile instanceof File ? imageFile.name : undefined,
    });
    if (!mod.allowed) {
      return NextResponse.json(
        { error: "Listing blocked by content moderation", reasons: mod.reasons },
        { status: 400 },
      );
    }
    const price = Number(priceRaw);
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    let imageUrl: string | null = imageUrlField || null;
    let videoUrl: string | null = videoUrlField || null;

    if (imageFile instanceof File && imageFile.size > 0) {
      const err = validateMediaUpload(imageFile);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      imageUrl = await saveUpload(imageFile);
    }
    if (videoFile instanceof File && videoFile.size > 0) {
      const err = validateMediaUpload(videoFile, { allowVideo: true });
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      videoUrl = await saveUpload(videoFile, { allowVideo: true });
    }

    const listing = await createListing({
      communityId: session.communityId,
      title,
      description,
      price,
      category,
      seller: session.name,
      unit,
      imageUrl,
      videoUrl,
    });
    revalidatePath("/member/marketplace");
    return NextResponse.json({ ok: true, listing: mapListing(listing) });
  }

  let body: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    unit?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title || body.price == null) {
    return NextResponse.json({ error: "Title and price required" }, { status: 400 });
  }
  const mod = await moderateUpload({
    title: body.title,
    caption: body.description,
    fileName: body.imageUrl ?? undefined,
  });
  if (!mod.allowed) {
    return NextResponse.json(
      { error: "Listing blocked by content moderation", reasons: mod.reasons },
      { status: 400 },
    );
  }
  const listing = await createListing({
    communityId: session.communityId,
    title: body.title,
    description: body.description,
    price: Number(body.price),
    category: body.category ?? "General",
    seller: session.name,
    unit: body.unit ?? "—",
    imageUrl: body.imageUrl ?? null,
    videoUrl: body.videoUrl ?? null,
  });
  revalidatePath("/member/marketplace");
  return NextResponse.json({ ok: true, listing: mapListing(listing) });
}
