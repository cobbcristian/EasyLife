import { cn, getInitials } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  /** Override computed initials (e.g. role badge "SA" for super admin). */
  initials?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, src, initials, size = "md", className, ...props }: AvatarProps) {
  if (src) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-full bg-slate-200",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[var(--mvp-blue)] font-semibold text-white",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {initials ?? getInitials(name)}
    </div>
  );
}
