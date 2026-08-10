import type { SessionPayload } from "@/lib/types";
import { getRoleMatrix } from "@/lib/server/records";

const ROLE_LABELS: Record<string, string> = {
  member: "Member",
  board: "Board",
  pm: "Property Mgr",
  provider: "Provider",
  admin: "Admin",
  sales: "Sales",
};

/** Longest-prefix match for permission-gated routes. */
const PATH_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: "/member/bookings", permission: "Book amenities" },
  { prefix: "/member/directory", permission: "View directory" },
  { prefix: "/member/payments", permission: "Pay dues" },
  { prefix: "/board/documents", permission: "Manage documents" },
  { prefix: "/pm/documents", permission: "Manage documents" },
  { prefix: "/board/invoices", permission: "Approve invoices" },
  { prefix: "/reports", permission: "View financial reports" },
  { prefix: "/pm/front-desk", permission: "Front desk check-in" },
  { prefix: "/communities", permission: "Manage communities" },
  { prefix: "/roles", permission: "Manage users & roles" },
];

export function matrixRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function permissionForPath(pathname: string): string | null {
  const sorted = [...PATH_PERMISSIONS].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find(
    (p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`),
  );
  return match?.permission ?? null;
}

let matrixCache: { matrix: Record<string, string[]>; at: number } | null = null;
const CACHE_MS = 30_000;

async function cachedMatrix(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (matrixCache && now - matrixCache.at < CACHE_MS) return matrixCache.matrix;
  const matrix = await getRoleMatrix();
  matrixCache = { matrix, at: now };
  return matrix;
}

export async function roleHasPermission(role: string, permission: string): Promise<boolean> {
  const matrix = await cachedMatrix();
  const allowed = matrix[permission];
  if (!allowed) return role === "admin";
  return allowed.includes(matrixRole(role));
}

export async function canAccessPath(
  session: SessionPayload,
  pathname: string,
): Promise<boolean> {
  const permission = permissionForPath(pathname);
  if (!permission) return true;
  return roleHasPermission(session.role, permission);
}

export function forbiddenRedirect(role: string, baseUrl: string): URL {
  const paths: Record<string, string> = {
    admin: "/dashboard",
    member: "/member",
    board: "/board",
    pm: "/pm",
    provider: "/provider",
    sales: "/sales",
  };
  return new URL(paths[role] ?? "/login", baseUrl);
}
