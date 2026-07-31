"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatCurrency, formatDate } from "@/lib/utils";
import { isMarketplaceProductCover, resolveMarketplaceListingImage } from "@/lib/brand-assets";

export interface ListingDTO {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller: string;
  unit: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
}

function ListingThumbnail({ item }: { item: ListingDTO }) {
  const cover = resolveMarketplaceListingImage(
    item.title,
    item.category,
    item.imageUrl,
    item.id,
  );
  if (item.videoUrl && !item.imageUrl) {
    return (
      <div className="relative aspect-[4/3] w-full bg-black">
        <video
          src={item.videoUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          Video
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover}
      alt={item.title}
      className="aspect-[4/3] w-full bg-slate-100 object-cover transition-transform group-hover:scale-[1.02]"
    />
  );
}

function ListingDetailModal({
  item,
  onClose,
  t,
}: {
  item: ListingDTO;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-detail-title"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl overflow-hidden rounded-xl border border-border-2 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-slate-100">
          {(() => {
            const cover = resolveMarketplaceListingImage(
              item.title,
              item.category,
              item.imageUrl,
              item.id,
            );
            const showProductImage =
              Boolean(item.imageUrl) || isMarketplaceProductCover(cover);
            if (showProductImage) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={item.title}
                  className="max-h-[min(60vh,520px)] w-full object-contain"
                />
              );
            }
            if (item.videoUrl) {
              return (
                <video
                  src={item.videoUrl}
                  className="max-h-[min(60vh,520px)] w-full bg-black object-contain"
                  controls
                  playsInline
                  autoPlay
                />
              );
            }
            return (
              <div className="aspect-[4/3] bg-gradient-to-br from-[var(--mvp-blue)] to-[#0051d4]" />
            );
          })()}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-grey shadow hover:bg-white"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {item.imageUrl && item.videoUrl ? (
          <div className="border-t border-border-2 bg-black p-2">
            <video
              src={item.videoUrl}
              className="mx-auto max-h-64 w-full object-contain"
              controls
              playsInline
            />
          </div>
        ) : null}

        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="listing-detail-title" className="text-xl font-bold text-ink">
                {item.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="info">{item.category}</Badge>
                <span className="text-xs text-grey">{formatDate(item.createdAt)}</span>
              </div>
            </div>
            <p className="shrink-0 text-2xl font-bold text-navy">{formatCurrency(item.price)}</p>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-ink">{t("Description")}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-2">
              {item.description.trim() || t("No description provided.")}
            </p>
          </div>

          <p className="mt-5 text-sm text-grey">
            {item.seller} · {t("Unit")} {item.unit}
          </p>

          <div className="mt-6">
            <Button variant="outline" onClick={onClose}>
              {t("Close")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketplaceClient({ initial }: { initial: ListingDTO[] }) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const router = useRouter();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ListingDTO | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    imageUrl: "",
    videoUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetMedia() {
    setImageFile(null);
    setVideoFile(null);
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    if (videoPreview?.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
    setImagePreview(null);
    setVideoPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "warning", title: t("Please choose an image file") });
      return;
    }
    setImageFile(file);
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  }

  function onVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ variant: "warning", title: t("Please choose a video file") });
      return;
    }
    setVideoFile(file);
    if (videoPreview?.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
    setVideoPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) {
      toast({ variant: "warning", title: t("Title and price required") });
      return;
    }
    setBusy(true);
    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("description", form.description);
    payload.append("price", form.price);
    payload.append("category", form.category || "General");
    payload.append("unit", profile.unit);
    if (form.imageUrl.trim()) payload.append("imageUrl", form.imageUrl.trim());
    if (form.videoUrl.trim()) payload.append("videoUrl", form.videoUrl.trim());
    if (imageFile) payload.append("image", imageFile);
    if (videoFile) payload.append("video", videoFile);

    const res = await fetch("/api/marketplace", { method: "POST", body: payload });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({ variant: "warning", title: t("Could not post"), description: d.error });
      return;
    }
    toast({ variant: "success", title: t("Item posted") });
    setForm({ title: "", description: "", price: "", category: "", imageUrl: "", videoUrl: "" });
    resetMedia();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-4xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("Marketplace")}
            </h1>
            <p className="mt-0.5 text-[12px] text-grey">
              {t(`${initial.length} items for sale by residents`)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {open ? t("Close") : t("Post")}
          </button>
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {open ? (
            <form className="space-y-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4" onSubmit={submit}>
              <h2 className="text-[15px] font-semibold text-ink">{t("New listing")}</h2>
              <Input
                placeholder={t("Title")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("Condition, dimensions, pickup details…")}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t("Price ($)")}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <Input
                  placeholder={t("Category")}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onImagePick}
                  />
                  <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-3 text-[12px] font-semibold text-ink ring-1 ring-[#e4e8ee]">
                    <ImagePlus className="h-4 w-4" />
                    {imageFile ? t("Change photo") : t("Add photo")}
                  </span>
                </label>
                <label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={onVideoPick}
                  />
                  <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-3 text-[12px] font-semibold text-ink ring-1 ring-[#e4e8ee]">
                    <Video className="h-4 w-4" />
                    {videoFile ? t("Change video") : t("Add video")}
                  </span>
                </label>
              </div>
              {(imagePreview || videoPreview) && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt={t("Preview")}
                      className="max-h-36 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      className="max-h-36 w-full rounded-xl bg-black object-cover"
                      controls
                      playsInline
                    />
                  ) : null}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("Posting...") : t("Post item")}
              </button>
            </form>
          ) : null}

          {initial.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No listings yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Be the first to list something for neighbors.")}
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("List your first item")}
              </button>
            </div>
          ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {initial.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white text-left"
              >
                <ListingThumbnail item={item} />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <span className="shrink-0 text-sm font-bold text-ink">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-grey">
                    {item.seller} · {item.unit}
                  </p>
                </div>
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      {selected ? (
        <ListingDetailModal item={selected} onClose={() => setSelected(null)} t={t} />
      ) : null}
    </div>
  );
}
