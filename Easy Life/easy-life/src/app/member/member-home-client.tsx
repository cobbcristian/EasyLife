"use client";

import { useEffect, useState } from "react";
import { MemberMvpHome } from "@/components/member/member-mvp-home";
import { brandAssets, avatarForReviewer } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";

interface HomeBooking {
  id: string;
  amenity: string;
  date: string;
  time: string;
  status: string;
}

interface HomeServiceBooking {
  id: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

interface HomeEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  userRsvped?: boolean;
}

interface HomeTournament {
  id: string;
  title: string;
  sport: string;
  date: string;
  status: string;
  nextMatch: {
    opponent: string;
    courtNumber?: number | null;
    courtLabel?: string;
    time?: string;
    date?: string;
  } | null;
}

interface HomeData {
  balance: number;
  profile: {
    name: string;
    residencyStatus?: string;
    paysHoa?: boolean;
    membershipTier?: string;
  };
  branding?: { id?: string; name: string; logoUrl: string | null } | null;
  featuredTiles?: Array<{
    key: string;
    label: string;
    sub: string;
    rating: string;
    price: string;
    image: string;
    href: string;
    sponsored?: boolean;
  }>;
  bookings: HomeBooking[];
  serviceBookings?: HomeServiceBooking[];
  events: HomeEvent[];
  requests: { id: string; status: string }[];
  ads: unknown[];
  tournaments: HomeTournament[];
  notificationCount?: number;
}

function MemberMvpHomeSkeleton() {
  const { t } = useI18n();
  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <div className="bg-gradient-to-b from-[#ff7a00] via-[#f6c445] to-[#8ed63a] px-4 pb-14 pt-6 lg:rounded-t-2xl">
        <div className="mx-auto h-8 max-w-lg animate-pulse rounded bg-white/20" />
      </div>
      <div className="mx-auto -mt-6 max-w-lg px-4">
        <div className="h-12 animate-pulse rounded-[22px] bg-white shadow-md" />
      </div>
      <p className="py-10 text-center text-sm text-grey">{t("Loading…")}</p>
    </div>
  );
}

export function MemberHomeClient() {
  const [data, setData] = useState<HomeData | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(brandAssets.memberAvatar);
  const [profileEmail, setProfileEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/api/member/home")
      .then((r) => r.json())
      .then((home) => {
        if (!on) return;
        if (home?.error) {
          setError("Could not load home.");
          return;
        }
        setError(null);
        setData(home);
        const name = home?.profile?.name;
        if (home?.profile?.email) setProfileEmail(home.profile.email);
        if (home?.profile?.avatarUrl) {
          setAvatarSrc(home.profile.avatarUrl);
        } else if (name) {
          setAvatarSrc(avatarForReviewer(name));
        } else {
          setAvatarSrc(brandAssets.memberAvatar);
        }
      })
      .catch(() => {
        if (on) setError("Could not load home.");
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  if (error && !data) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-ink">{error}</p>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-[var(--mvp-blue)]"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return <MemberMvpHomeSkeleton />;
  }

  return (
    <MemberMvpHome
      profileName={data.profile.name}
      profileEmail={profileEmail}
      avatarSrc={avatarSrc}
      clubName={data.branding?.name}
      clubLogoSrc={data.branding?.logoUrl}
      communityId={data.branding?.id}
      paysHoa={data.profile.paysHoa !== false}
      residencyStatus={data.profile.residencyStatus ?? "resident"}
      featuredTiles={data.featuredTiles}
      bookings={data.bookings}
      serviceBookings={data.serviceBookings ?? []}
      events={data.events}
      tournaments={data.tournaments ?? []}
      notificationCount={data.notificationCount ?? 0}
    />
  );
}
