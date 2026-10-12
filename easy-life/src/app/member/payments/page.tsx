import { Suspense } from "react";
import { PaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

export default function MemberPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsClient />
    </Suspense>
  );
}
