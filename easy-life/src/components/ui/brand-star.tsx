import { cn } from "@/lib/utils";
import { brandAssets } from "@/lib/brand-assets";

/** Figma star glyph (ratings, favorites). */
export function BrandStar({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandAssets.iconStar}
      alt=""
      aria-hidden
      className={cn("h-4 w-4 shrink-0", className)}
    />
  );
}
