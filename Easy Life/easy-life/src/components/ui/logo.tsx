import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  /** Active club crest — only shown when managing that community. Never logo-wordmark.png. */
  communityLogoSrc?: string | null;
  communityName?: string | null;
  /** Product wordmark — "Easy Life" by default, or the white-label club name. */
  productName?: string | null;
  /** Render club name under the marks. Default true when crest + name are set. */
  showCommunityName?: boolean;
}

const markSizes = {
  sm: "h-6 w-auto",
  md: "h-8 w-auto",
  lg: "h-10 w-auto",
};

const partnerSizes = {
  sm: "h-7 w-auto max-w-[120px]",
  md: "h-10 w-auto max-w-[160px]",
  lg: "h-12 w-auto max-w-[200px]",
};

export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandAssets.logoIcon}
      alt="Easy Life"
      className={cn(markSizes[size], className)}
    />
  );
}

export function Logo({
  className,
  showText = true,
  size = "md",
  communityLogoSrc,
  communityName,
  productName,
  showCommunityName,
}: LogoProps) {
  const showClubName =
    showCommunityName ?? Boolean(communityLogoSrc && communityName);
  const wordmark = productName?.trim() || "Easy Life";
  // Hide Easy Life "e" whenever a club crest is shown OR the product is white-labeled.
  // Requiring both previously leaked the mark next to IronCrest when productName was missing.
  const whiteLabelOnly = Boolean(
    communityLogoSrc || (productName && productName !== "Easy Life"),
  );

  return (
    <span
      className={cn(
        "inline-flex",
        showClubName ? "flex-col items-start gap-1" : "items-center gap-2",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        {whiteLabelOnly ? null : <LogoMark size={size} />}
        {communityLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={communityLogoSrc}
            alt={communityName ?? wordmark}
            className={cn(partnerSizes[size], "object-contain")}
          />
        ) : showText ? (
          <span
            className={cn(
              "font-semibold tracking-tight text-ink",
              size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg",
            )}
          >
            {wordmark}
          </span>
        ) : null}
      </span>
      {showClubName && communityName ? (
        <span
          className={cn(
            "max-w-[11rem] truncate font-medium leading-snug text-grey",
            size === "sm" ? "text-[11px]" : "text-xs",
          )}
        >
          {communityName}
        </span>
      ) : null}
    </span>
  );
}
