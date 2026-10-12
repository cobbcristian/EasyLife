"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ProviderPaywallGate({
  children,
  needsSubscription,
}: {
  children: React.ReactNode;
  needsSubscription: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onSubscribePage = pathname.startsWith("/provider/subscribe");
  const shouldRedirect = needsSubscription && !onSubscribePage;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/provider/subscribe");
    }
  }, [shouldRedirect, router]);

  if (shouldRedirect) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-grey">
        Checking subscription...
      </div>
    );
  }

  return <>{children}</>;
}
