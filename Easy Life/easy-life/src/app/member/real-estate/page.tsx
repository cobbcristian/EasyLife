"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bath, Bed, ImagePlus, Maximize, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";

type Filter = "all" | "sale" | "rent";

interface Listing {
  id: string;
  title: string;
  description: string;
  type: "sale" | "rent";
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  unit: string;
  color: string;
  images: string[];
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-white px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

function ListingHero({ listing }: { listing: Listing }) {
  const first = listing.images[0];
  if (first) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={first}
        alt={listing.title}
        className="h-36 w-full object-cover"
      />
    );
  }
  return <div className={cn("h-36 w-full bg-gradient-to-br", listing.color)} />;
}

function ListingDetailModal({
  listing,
  onClose,
  t,
}: {
  listing: Listing;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const images = listing.images;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="estate-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white font-[family-name:var(--font-poppins)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-[#f2f4f7]">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImage]}
              alt={listing.title}
              className="max-h-[min(50vh,420px)] w-full object-contain"
            />
          ) : (
            <div className={cn("aspect-[16/10] bg-gradient-to-br", listing.color)} />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-grey"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold capitalize text-ink">
            {t(`For ${listing.type}`)}
          </span>
        </div>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-[#eceff3] bg-white p-3">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(i)}
                className={cn(
                  "h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2",
                  i === activeImage
                    ? "border-[var(--mvp-blue)]"
                    : "border-transparent opacity-70",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="estate-detail-title"
                className="text-lg font-semibold tracking-[-0.02em] text-ink"
              >
                {listing.title}
              </h2>
              <p className="mt-1 text-sm text-grey">{listing.unit}</p>
            </div>
            <p className="shrink-0 text-lg font-semibold text-ink">
              {formatCurrency(listing.price)}
              {listing.type === "rent" ? (
                <span className="text-sm font-normal text-grey">/mo</span>
              ) : null}
            </p>
          </div>

          <div className="flex gap-4 text-sm text-grey">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" /> {listing.beds} {t("beds")}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" /> {listing.baths} {t("baths")}
            </span>
            <span className="flex items-center gap-1">
              <Maximize className="h-4 w-4" /> {listing.sqft} sqft
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{t("Description")}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-grey">
              {listing.description.trim() || t("No description provided.")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-2xl bg-[#f2f4f7] text-sm font-semibold text-ink"
          >
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberRealEstatePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "sale" as "sale" | "rent",
    price: "",
    beds: "2",
    baths: "2",
    sqft: "1200",
    unit: "",
    imageUrls: "",
  });

  useEffect(() => {
    let on = true;
    fetch("/api/real-estate")
      .then((r) => r.json())
      .then((estateData) => {
        if (!on) return;
        setListings(estateData.listings ?? []);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? listings : listings.filter((l) => l.type === filter)),
    [filter, listings],
  );

  function resetImages() {
    imagePreviews.forEach((p) => {
      if (p.startsWith("blob:")) URL.revokeObjectURL(p);
    });
    setImageFiles([]);
    setImagePreviews([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function onImagesPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const valid = files.filter((f) => f.type.startsWith("image/"));
    if (valid.length !== files.length) {
      toast({ variant: "warning", title: t("Please choose image files only") });
    }
    setImageFiles((prev) => [...prev, ...valid]);
    setImagePreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  }

  async function submitListing(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.title || !price) {
      toast({ variant: "warning", title: t("Title and price required") });
      return;
    }
    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("description", form.description);
    payload.append("type", form.type);
    payload.append("price", form.price);
    payload.append("beds", form.beds);
    payload.append("baths", form.baths);
    payload.append("sqft", form.sqft);
    payload.append("unit", form.unit);
    if (form.imageUrls.trim()) payload.append("imageUrls", form.imageUrls.trim());
    for (const file of imageFiles) payload.append("images", file);

    const res = await fetch("/api/real-estate", { method: "POST", body: payload });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not list property"),
        description: d.error,
      });
      return;
    }
    const data = await res.json();
    setListings((prev) => [data.listing, ...prev]);
    setForm({
      title: "",
      description: "",
      type: "sale",
      price: "",
      beds: "2",
      baths: "2",
      sqft: "1200",
      unit: "",
      imageUrls: "",
    });
    resetImages();
    setShowForm(false);
    toast({ variant: "success", title: t("Property listed") });
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
                {t("Member")}
              </p>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
                {t("Real Estate")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((o) => !o)}
              className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              {showForm ? t("Close") : t("List")}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {(["all", "sale", "rent"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize",
                  filter === f
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f2f4f7] text-grey",
                )}
              >
                {f === "all" ? t("All") : t(`For ${f}`)}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-4 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {showForm ? (
            <form
              className="space-y-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4"
              onSubmit={submitListing}
            >
              <h2 className="text-[15px] font-semibold text-ink">
                {t("List a property")}
              </h2>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("Title")}
                className={fieldClass}
              />
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("Highlights, upgrades, lease terms…")}
                className="min-h-[90px] w-full rounded-2xl border border-[#e4e8ee] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as "sale" | "rent" })
                  }
                  className={fieldClass}
                >
                  <option value="sale">{t("For sale")}</option>
                  <option value="rent">{t("For rent")}</option>
                </select>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder={t("Price")}
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={0}
                  value={form.beds}
                  onChange={(e) => setForm({ ...form, beds: e.target.value })}
                  placeholder={t("Beds")}
                  className={fieldClass}
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.baths}
                  onChange={(e) => setForm({ ...form, baths: e.target.value })}
                  placeholder={t("Baths")}
                  className={fieldClass}
                />
                <input
                  type="number"
                  min={0}
                  value={form.sqft}
                  onChange={(e) => setForm({ ...form, sqft: e.target.value })}
                  placeholder={t("Sq ft")}
                  className={fieldClass}
                />
              </div>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder={t("Unit")}
                className={fieldClass}
              />
              <label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onImagesPick}
                />
                <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-[12px] font-semibold text-ink ring-1 ring-[#e4e8ee]">
                  <ImagePlus className="h-4 w-4" />
                  {t("Add photos")}
                </span>
              </label>
              {imagePreviews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-16 w-20 rounded-xl object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <textarea
                rows={2}
                value={form.imageUrls}
                onChange={(e) => setForm({ ...form, imageUrls: e.target.value })}
                placeholder={t("Or paste image URLs (one per line)")}
                className="min-h-[70px] w-full rounded-2xl border border-[#e4e8ee] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
              />
              <button
                type="submit"
                className="h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
              >
                {t("Submit listing")}
              </button>
            </form>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-grey">{t("Loading…")}</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No listings yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Be the first to list a home for sale or rent in the community.")}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("List a property")}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white text-left"
                >
                  <div className="relative overflow-hidden">
                    <ListingHero listing={l} />
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink">
                      {t(`For ${l.type}`)}
                    </span>
                    {l.images.length > 1 ? (
                      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        {l.images.length} {t("photos")}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink">{l.title}</h3>
                      <span className="shrink-0 text-sm font-bold text-ink">
                        {formatCurrency(l.price)}
                        {l.type === "rent" ? (
                          <span className="text-[11px] font-normal text-grey">/mo</span>
                        ) : null}
                      </span>
                    </div>
                    {l.description.trim() ? (
                      <p className="mt-1 line-clamp-2 text-[12px] text-grey">
                        {l.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-grey">{l.unit}</p>
                    <div className="mt-2 flex gap-3 text-[11px] text-grey">
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" /> {l.beds}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" /> {l.baths}
                      </span>
                      <span className="flex items-center gap-1">
                        <Maximize className="h-3.5 w-3.5" /> {l.sqft}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <ListingDetailModal listing={selected} onClose={() => setSelected(null)} t={t} />
      ) : null}
    </div>
  );
}
