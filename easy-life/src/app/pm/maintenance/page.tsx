import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import {
  ensureRecordsSeeded,
  listMaintenanceTasks,
  listServiceRequests,
} from "@/lib/server/records";
import { MaintenanceClient } from "./maintenance-client";

export const dynamic = "force-dynamic";

export default async function PmMaintenancePage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/maintenance] ensureRecordsSeeded failed", err);
  }
  try {
    await ensureFourClubDemoContent("full", session?.communityId, session?.email);
  } catch (err) {
    console.error("[pm/maintenance] four-club seed failed", err);
  }

  let rows: Awaited<ReturnType<typeof listServiceRequests>> = [];
  let tasks: Awaited<ReturnType<typeof listMaintenanceTasks>> = [];
  try {
    [rows, tasks] = await Promise.all([
      listServiceRequests({ communityId: session?.communityId }),
      listMaintenanceTasks(session?.communityId),
    ]);
  } catch (err) {
    console.error("[pm/maintenance] data load failed", err);
  }

  const requests = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    memberName: r.memberName,
    unit: r.unit,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <MaintenanceClient
      requests={requests}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        area: t.area,
        assignedTo: t.assignedTo,
        status: (["open", "in_progress", "done"].includes(t.status)
          ? t.status
          : "open") as "open" | "in_progress" | "done",
        due: t.due,
      }))}
    />
  );
}
