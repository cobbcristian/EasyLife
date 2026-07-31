import { ensureRecordsSeeded, getRoleMatrix } from "@/lib/server/records";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  await ensureRecordsSeeded();
  const matrix = await getRoleMatrix();
  return <RolesClient initial={matrix} />;
}
