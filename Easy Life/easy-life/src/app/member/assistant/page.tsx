import { Suspense } from "react";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

export default function MemberAssistantPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-grey">Loading Plaza…</div>}>
      <AssistantClient />
    </Suspense>
  );
}
