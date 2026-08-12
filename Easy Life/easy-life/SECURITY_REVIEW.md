# Security Review: API Route Authentication & Authorization

**Date:** 2026-08-12
**Scope:** Admin, AI, Calendar, and Cron API routes plus auth helper modules

---

## Executive Summary

The application uses JWT-based sessions with role checks across API routes. Most admin endpoints enforce `session.role === "admin"`, and several use `isSuperAdmin()` for tenant isolation. However, this review identified **6 significant vulnerabilities** and **4 informational findings** related to cross-tenant access, missing authorization scoping, weak defaults, and missing input validation.

Severity scale: **CRITICAL** > **HIGH** > **MEDIUM** > **LOW** > **INFO**

---

## Helper Module Analysis

### `src/lib/server/auth.ts`

| Finding | Severity | Details |
|---------|----------|---------|
| **Hardcoded dev secret** | MEDIUM | Lines 16–17: When `AUTH_SECRET` is unset in non-production, the fallback `"easy-life-dev-secret-change-in-production"` is used. If a preview/staging deployment runs with `NODE_ENV !== "production"`, any attacker who knows this string can forge arbitrary JWTs. |
| **Session payload trust** | INFO | Lines 57–63: The `communityId` and `role` are embedded in the JWT at sign-in time and never re-validated against the database on each request. A user whose role or community was changed by an admin continues to operate under the old JWT until it expires (7 days, line 6). |

### `src/lib/server/community-context.ts`

| Finding | Severity | Details |
|---------|----------|---------|
| **Cookie-driven community scoping for non-super-admins** | MEDIUM | Lines 33–34 in `resolveScopedCommunityId`: A non-super-admin user can set the `el_active_community` cookie to any community ID, and if they have an active `UserCommunity` membership row for it, the resolved community changes. The `userHasActiveMembership` check mitigates forging, but the cookie itself is `httpOnly: false` (see `active-community/route.ts` line 36), meaning client-side JS can manipulate it. |
| **Fallback to first community** | LOW | Lines 38–42 in `resolveScopedCommunityId`: If the session has no `communityId` and no valid cookie, it falls back to the first community in alphabetical order. This means a user with a `null` communityId (e.g. a super admin) who doesn't set the cookie defaults to querying an arbitrary community's data. Not exploitable per se, but could lead to accidental data exposure. |

### `src/lib/server/cron-auth.ts`

| Finding | Severity | Details |
|---------|----------|---------|
| **Unauthenticated cron in non-production** | LOW | Lines 13–19: When `CRON_SECRET` is unset and `NODE_ENV` is not `"production"`, the cron endpoint is completely open. This is by design for development, but preview deployments may inherit this behavior. |

---

## Route-by-Route Findings

### 1. `src/app/api/admin/overview/route.ts` — **CRITICAL: Cross-Tenant Data Leak**

**Authentication:** Admin role check (line 9). ✅
**Authorization / Tenant isolation:** ❌ **MISSING**

```
14:  const [bookings, users, providers, communities, contactUnread] =
15:    await Promise.all([
16:      prisma.booking.findMany({
17:        where: { status: { not: "cancelled" } },
...
23:      prisma.user.findMany({
...
32:      prisma.provider.findMany({
```

**Vulnerability:** A club admin (`role === "admin"` with a `communityId`) can call `GET /api/admin/overview` and receive **all bookings, all users, all providers, and all communities** across the entire platform. There is no `communityId` filter applied to any of the Prisma queries. Only a `isSuperAdmin` boolean is returned in the response (line 56), but no data scoping occurs.

**Attack path:**
1. Attacker registers or is assigned as an admin for Community A.
2. Attacker calls `GET /api/admin/overview`.
3. Response contains full PII (names, emails) for all users and providers across all communities.

**Impact:** Full cross-tenant PII disclosure. Violates multi-tenant isolation.

**Mitigation:** Add a `communityId` filter to all Prisma queries when `!isSuperAdmin(session)`.

---

### 2. `src/app/api/admin/service-bookings/route.ts` — **HIGH: Cross-Tenant Booking Mutation**

**Authentication:** Admin or PM role check (line 18). ✅
**Authorization / Tenant isolation:** ❌ **MISSING**

```
29:  if (!body.id || !body.status || !ALLOWED.includes(body.status)) {
30:    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
31:  }
32:
33:  const updated = updateCommunityBookingStatus(body.id, body.status);
```

**Vulnerability:** The `updateCommunityBookingStatus` function (in `communities-data.ts` lines 1305–1313) searches all bookings globally by ID — there is no check that the booking belongs to the admin's or PM's community. A club admin from Community A can update the status of a booking belonging to Community B by knowing (or guessing) the booking ID.

**Attack path:**
1. Attacker (admin of Community A) intercepts or enumerates booking IDs.
2. Attacker sends `PATCH /api/admin/service-bookings` with `{ id: "<community-b-booking>", status: "cancelled" }`.
3. Booking in Community B is modified.

**Impact:** Cross-tenant booking manipulation (cancel, accept, etc.).

**Mitigation:** After retrieving the booking, verify `booking.communityId === session.communityId` (or allow super admin).

---

### 3. `src/app/api/admin/backfill-brand-images/route.ts` — **MEDIUM: Missing Tenant Scoping on Bulk Operation**

**Authentication:** Admin role check (line 8). ✅
**Authorization:** ❌ Only checks `role === "admin"`, not `isSuperAdmin`.

```
6:  const session = await getSession();
7:  if (!session || session.role !== "admin") {
8:    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
9:  }
10:
11:  const result = await backfillBrandImages();
```

**Vulnerability:** Any admin (including club-scoped admins) can trigger a platform-wide image backfill operation. This should be restricted to super admins only, as `backfillBrandImages()` likely affects all communities.

**Impact:** A club admin can trigger writes across all communities' brand images.

**Mitigation:** Replace `session.role !== "admin"` with `!isSuperAdmin(session)`.

---

### 4. `src/app/api/admin/users/[id]/route.ts` — **MEDIUM: TOCTOU Race in PATCH**

**Authentication:** Admin role check (line 19). ✅
**Authorization:** Community check on line 49. ✅ (mostly)

```
80:  const updated = await setUserStatus(id, body.status);
81:  if (!updated) {
82:    return NextResponse.json({ error: "Not found" }, { status: 404 });
83:  }
84:
85:  if (!isSuperAdmin(session) && updated.communityId !== session.communityId) {
86:    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
87:  }
```

**Vulnerability:** On line 49, the code correctly checks `existing.communityId !== session.communityId` before proceeding. However, for the `active` status approval path (lines 54–78), and for other statuses, the `setUserStatus` call on line 80 **executes before** the community check on line 85. This means the mutation is already committed by the time the Forbidden response is returned.

**Attack path:**
1. A user's `communityId` is changed between the line 45 lookup and the line 80 write (race condition), or
2. More directly: the line 49 check gates only the early return. For the non-pending path, `setUserStatus(id, body.status)` runs on line 80, and the community re-check on line 85 is post-mutation — the status is already changed.

**Impact:** Status mutation of a user in another community, with a "Forbidden" error returned after the fact.

**Mitigation:** Move the community ownership check to before `setUserStatus`, or pass `communityId` into `setUserStatus` as a WHERE clause.

---

### 5. `src/app/api/admin/users/[id]/route.ts` DELETE — **LOW: Tenant Isolation via List Filter**

**Authentication:** Admin role check (line 110). ✅
**Authorization:** Uses `listAdminUsers` filtered by community (lines 119–121), then checks `all.find(u => u.id === id)` (line 122). ✅

This is correct: a club admin can only delete users returned by the community-scoped list. However, this loads **all users** into memory to do a client-side filter, which is inefficient and could be a DoS vector with many users. A direct Prisma query with a `where: { id, communityId }` would be more efficient and more secure.

---

### 6. `src/app/api/ai/moderate/route.ts` — **MEDIUM: No Role or Community Scoping**

**Authentication:** Session check (line 9). ✅
**Authorization:** ❌ **MISSING** — any authenticated user (member, provider, sales, etc.) can invoke AI moderation.

```
9:  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
...
18:  const result = await moderateUpload(body);
```

**Vulnerability:** The `moderateUpload` function is called with untrusted input (`body`) from any authenticated user. There is no role check. While this may be intentional (all users can moderate their own uploads), the `body` is not validated — any JSON can be passed to the AI moderation function.

**Impact:** Potential for prompt injection or abuse of AI moderation credits by any authenticated user. No rate limiting observed.

---

### 7. `src/app/api/ai/chat/route.ts` — **LOW: Adequate Auth, Minor Observation**

**Authentication:** Session check (lines 12, 28). ✅
**Authorization:** Community check on POST (line 39). ✅
**Scoping:** GET history is scoped by `session.email` (line 14). POST is scoped by `session.communityId` (line 44). ✅

No significant issues. The `confirmAction` field (line 31) is passed through to `runClubAssistant` — the AI assistant implementation should validate that the action is authorized for the user's role. This is an internal trust boundary.

---

### 8. `src/app/api/ai/insights/route.ts` — **LOW: Adequate Auth, Staff Data Leak Concern**

**Authentication:** Session check (line 10). ✅
**Community scoping:** Uses `session.communityId` (lines 13, 16, 21). ✅

Lines 20–31: Staff users (admin, pm, board) get additional `ops` data including `rejoinWaiting` list for the community. Any authenticated user with these roles sees the rejoin waitlist — this may be too broad if `board` members shouldn't see operational data.

---

### 9. `src/app/api/ai/inbox/summary/route.ts` — **INFO: Properly Scoped**

**Authentication:** Session check (line 10). ✅
**Scoping:** Queries are filtered by `session.email` (line 13). ✅

No issues found.

---

### 10. `src/app/api/ai/verify-doc/route.ts` — **LOW: Missing File Validation**

**Authentication:** Session check (line 10). ✅
**Scoping:** Uses `session.name` and `session.email` (lines 30–31). ✅

```
13:  const file = form.get("file");
14:  if (!(file instanceof File)) {
15:    return NextResponse.json({ error: "file required" }, { status: 400 });
16:  }
```

No file size limit, file type validation, or content-type verification is performed before reading the entire file into memory (line 18: `Buffer.from(await file.arrayBuffer())`). An attacker could upload arbitrarily large files to cause memory exhaustion.

---

### 11. `src/app/api/calendar/feed/[token]/route.ts` — **INFO: Properly Secured**

**Authentication:** JWT token verification (lines 22–24). ✅
**Scoping:** Calendar data is scoped by `payload.email` and `payload.communityId` (lines 39–43). ✅

The token-based auth is appropriate for ICS feed subscriptions (calendar clients can't send cookies). The JWT includes a `purpose: "calendar_feed"` claim that is validated. No issues found.

---

### 12. `src/app/api/cron/reminders/route.ts` — **INFO: Properly Secured**

**Authentication:** `authorizeCronRequest` with `CRON_SECRET` bearer token (line 10). ✅
**Production safety:** Requires `CRON_SECRET` in production (cron-auth.ts line 13). ✅

The informational note about open access in non-production is documented in the response (line 25).

---

### 13. `src/app/api/admin/users/route.ts` — **INFO: Properly Scoped**

**Authentication:** Admin role check (lines 17, 47). ✅
**Community scoping (GET):** Club admins are scoped to `session.communityId` (line 26). ✅
**Community scoping (POST):** Non-super-admins are forced to `session.communityId` (line 78). ✅

**Minor note (line 67):** Default password `"password"` is used when none is provided. This should be flagged in a password security review but is outside the scope of this auth/authz review.

---

### 14. `src/app/api/admin/active-community/route.ts` — **INFO: Properly Secured**

**Authentication:** Super admin check (line 11). ✅
**Validation:** Verifies community exists in DB (lines 26–31). ✅

**Note:** The cookie is set with `httpOnly: false` (line 36), allowing client-side JS to read/modify it. This is intentional for the UI community switcher but means XSS could manipulate the active community context.

---

### 15. `src/app/api/admin/subscriptions/route.ts` — **INFO: Properly Secured**

**Authentication:** Super admin check (lines 14, 25). ✅
**Input validation:** Checks `userEmail` presence (line 41), `status` presence (line 52). ✅

No issues found.

---

### 16. `src/app/api/admin/bookings/route.ts` — **INFO: Properly Secured**

**Authentication:** `canStaffBookForMembers` check (lines 23, 86). ✅
**Community scoping:** `canStaffBookInCommunity` check (lines 34, 106). ✅
**Input validation:** Uses `parseBody(adminBookingSchema, body)` (line 97). ✅
**Member verification:** Verifies member exists in the target community (lines 111–118). ✅

This is one of the best-secured routes in the codebase.

---

## Summary of Vulnerabilities

| # | Severity | File | Finding |
|---|----------|------|---------|
| 1 | **CRITICAL** | `admin/overview/route.ts` | Club admin sees all tenants' bookings, users, providers (no community filter) |
| 2 | **HIGH** | `admin/service-bookings/route.ts` | Cross-tenant booking status mutation (no community ownership check) |
| 3 | **MEDIUM** | `admin/backfill-brand-images/route.ts` | Platform-wide operation accessible to club admins (should require super admin) |
| 4 | **MEDIUM** | `admin/users/[id]/route.ts` PATCH | TOCTOU: `setUserStatus` executes before post-mutation community check |
| 5 | **MEDIUM** | `ai/moderate/route.ts` | No role restriction or input validation on AI moderation endpoint |
| 6 | **MEDIUM** | `lib/server/auth.ts` | Hardcoded dev JWT secret used in non-production environments |
| 7 | **LOW** | `ai/verify-doc/route.ts` | No file size or type validation before memory load |
| 8 | **LOW** | `admin/users/[id]/route.ts` DELETE | Loads all users into memory for tenant filter (DoS risk) |
| 9 | **LOW** | `lib/server/cron-auth.ts` | Cron endpoint open when `CRON_SECRET` is unset in non-production |
| 10 | **LOW** | `lib/server/community-context.ts` | Fallback to first community when no community context is available |

---

## Recommended Remediation Priority

1. **Immediate:** Fix the overview route to scope all queries by `communityId` for non-super-admins.
2. **Immediate:** Add community ownership check to `service-bookings` PATCH.
3. **Short-term:** Restrict `backfill-brand-images` to super admins.
4. **Short-term:** Fix TOCTOU in user status PATCH by checking community before mutation.
5. **Short-term:** Add input validation and role checks to AI moderation route.
6. **Medium-term:** Ensure preview deployments set `AUTH_SECRET` or run with `NODE_ENV=production`.
7. **Medium-term:** Add file size/type validation to document upload endpoint.
