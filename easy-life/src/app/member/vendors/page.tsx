"use client";

import { useEffect, useState } from "react";
import { MemberMvpVendorList } from "@/components/member/member-mvp-vendor-list";
import { useI18n } from "@/lib/i18n";

interface Vendor {
  id: string;
  name: string;
  category: string;
  type: string;
  rating: number | null;
}

export default function MemberVendorsPage() {
  const { t } = useI18n();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/directory?type=vendors")
      .then((r) => r.json())
      .then((d) => setVendors(d.vendors ?? []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  return <MemberMvpVendorList vendors={vendors} />;
}
