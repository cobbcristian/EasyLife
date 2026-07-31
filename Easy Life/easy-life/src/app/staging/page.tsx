"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { useI18n } from "@/lib/i18n";

function StagingBody() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [clubName, setClubName] = useState<string | null>(
    searchParams.get("club") || searchParams.get("name"),
  );

  useEffect(() => {
    if (clubName) return;
    fetch("/api/member/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const name =
          d?.community?.appDisplayName ||
          d?.community?.name ||
          d?.communityName ||
          null;
        if (name) setClubName(name);
      })
      .catch(() => {});
  }, [clubName]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border-1 bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <h1 className="text-xl font-bold text-ink">{t("Your club is getting ready")}</h1>
      {clubName ? (
        <p className="mt-2 text-sm font-semibold text-ink">{clubName}</p>
      ) : null}
      <p className="mt-3 text-sm text-grey">
        {t(
          "The member portal is in staging mode while your club finishes setup. You will receive an email when it goes live.",
        )}
      </p>
      <p className="mt-6 text-xs text-grey">
        {t(
          "Club admins can turn off staging under Communities → Settings when ready to launch.",
        )}
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
  );
}

export default function StagingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white">
      <ContentHeader title={t("Coming soon")} />
      <PageBody>
        <Suspense fallback={null}>
          <StagingBody />
        </Suspense>
      </PageBody>
    </div>
  );
}
