import { GrabGoKioskClient } from "./kiosk-client";

export const dynamic = "force-dynamic";

export default async function GrabGoKioskPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <GrabGoKioskClient machineCode={decodeURIComponent(code)} />;
}
