import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--mvp-blue)] text-white hover:brightness-95 focus-visible:ring-[var(--mvp-blue)]",
  secondary:
    "bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/15 focus-visible:ring-[var(--mvp-blue)]",
  outline:
    "border border-border-1 bg-white text-gray-2 hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost: "text-gray-2 hover:bg-slate-100 focus-visible:ring-slate-400",
  danger:
    "bg-danger text-white hover:brightness-95 focus-visible:ring-red-400",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
