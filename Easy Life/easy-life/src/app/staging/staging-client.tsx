"use client";

import Link from "next/link";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { useI18n } from "@/lib/i18n";

export function StagingClient({ clubName }: { clubName: string | null }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white">
      <ContentHeader title={t("Coming soon")} />
      <PageBody>
        <div className="mx-auto max-w-lg rounded-2xl border border-border-1 bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold text-ink">
            {clubName
              ? `${clubName} ${t("is getting ready")}`
              : t("Your club is getting ready")}
          </h1>
          <p className="mt-3 text-sm text-grey">
            {t(
              "The member portal is in staging mode while your club finishes setup. You will receive an email when it goes live.",
            )}
          </p>
          <p className="mt-6 text-xs text-grey">
            {t("Club admins can turn off staging under Communities → Settings when ready to launch.")}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <LogoutButton />
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t("Check again")}
            </Button>
            <Link href="/login">
              <Button variant="secondary">{t("Login")}</Button>
            </Link>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
