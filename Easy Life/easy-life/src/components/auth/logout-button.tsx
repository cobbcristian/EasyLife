"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { clearScreenCache } from "@/lib/screen-cache";
import { cn } from "@/lib/utils";

export function LogoutButton({
  variant = "ghost",
  className,
  label,
}: {
  variant?: "ghost" | "outline";
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();

  return (
    <form
      action="/api/auth/logout"
      method="post"
      onSubmit={() => {
        clearScreenCache();
      }}
    >
      <Button type="submit" variant={variant} className={cn(className)}>
        {label ?? t("Log out")}
      </Button>
    </form>
  );
}
