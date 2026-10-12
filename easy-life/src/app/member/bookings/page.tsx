import { Suspense } from "react";
import { MemberBookingsLive } from "./bookings-live";

export default function MemberBookingsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-sm text-grey">Loading…</div>}>
      <MemberBookingsLive />
    </Suspense>
  );
}
