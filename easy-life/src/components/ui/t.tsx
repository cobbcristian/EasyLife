"use client";

import { useI18n } from "@/lib/i18n";

/** Renders translated UI copy — pass the English source string as children. */
export function T({ children }: { children: string }) {
  const { t } = useI18n();
  return <>{t(children)}</>;
}
