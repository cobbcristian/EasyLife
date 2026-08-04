"use client";

import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { StaffBookForMember } from "@/components/admin/staff-book-for-member";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

export default function PmBookingsPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={t("Member bookings")}
        right="avatar"
        avatarName={profile.name}
      />
      <PageBody>
        <p className="mb-6 text-sm text-grey">
          {t("Book amenities for residents from Front Desk or Property Management.")}
        </p>
        <StaffBookForMember />
      </PageBody>
    </div>
  );
}
