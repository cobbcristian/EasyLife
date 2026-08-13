# Security Audit: Server-Side Library & Infrastructure

**Scope:** `src/lib/server/`, `src/proxy.ts`, `prisma/schema.prisma`, `next.config.ts`  
**Date:** 2026-08-13  
**Auditor:** Automated Security Review

---

## Vulnerability 1: Predictable Temporary Passwords via `Math.random()`

- **Severity:** HIGH
- **Location:** `src/lib/server/db.ts:1079-1081`, `src/lib/server/member-import.ts:17-19`
- **Title:** Temporary passwords generated using cryptographically insecure `Math.random()`, making them predictable.

### Description

Both `tempPassword()` functions use `Math.random().toString(36).slice(2, 8)` to generate initial passwords for new admin onboarding and CSV-imported members. `Math.random()` is not a cryptographically secure PRNG — its internal state can be predicted after observing a few outputs, and it has limited entropy (~48 bits for the V8 xorshift128+ implementation). This means temporary passwords are predictable and brute-forceable.

### Impact

An attacker who observes one or more generated passwords (e.g., by creating a community or through the import result API response) can predict future temp passwords for other accounts, gaining unauthorized access to newly onboarded admin or member accounts before the legitimate user changes the password.

### Attack Path

1. Attacker invokes `onboardCommunityWithAdmin` or CSV import (requires admin role).
2. The API response includes `tempPassword` in cleartext.
3. Attacker observes the generated password pattern.
4. Since `Math.random()` state is seeded per V8 isolate and is deterministic, the attacker predicts subsequent passwords generated in the same isolate lifecycle.
5. Attacker uses predicted passwords to log in as newly imported members or onboarded admins before they change their password.

### Evidence

- `src/lib/server/db.ts:1080` — `Math.random().toString(36).slice(2, 8)` in `tempPassword()`
- `src/lib/server/member-import.ts:18` — Same insecure pattern
- `src/lib/server/db.ts:1108` — `tempPassword()` result used for new admin account
- `src/lib/server/member-import.ts:125` — `tempPassword()` result used for imported members

### Remediation

Replace `Math.random()` with `crypto.randomBytes()`:
```typescript
import { randomBytes } from "crypto";
function tempPassword(): string {
  return `EL-${randomBytes(6).toString("base64url").slice(0, 8)}!${randomBytes(1)[0] % 90 + 10}`;
}
```

---

## Vulnerability 2: AI Assistant Chat History Leaks Across Communities

- **Severity:** MEDIUM
- **Location:** `src/lib/server/ai/assistant.ts:690-694`, `src/lib/server/ai/assistant.ts:744-749`
- **Title:** AI chat history query is not scoped by community, leaking conversation context across tenants.

### Description

When the AI assistant processes a message, it fetches the last 6 chat messages for the user but only filters by `userEmail` — not by `communityId`. Similarly, `listAssistantHistory()` (exposed via the API) queries all messages for a user email without community scoping. A multi-club member's chat history from club A is included when they interact with the assistant in club B. This means the OpenAI system prompt receives conversation context from a different community.

### Impact

Sensitive community-specific information (amenity names, booking details, vendor interactions, personal preferences) from one club leaks into the AI context of another club. The AI might reveal to club B staff (if staff sees history) or to the user in a different context what amenities/services exist at club A.

### Attack Path

1. User is a member of community A and community B.
2. User chats with the AI assistant in community A about a sensitive booking or club-specific information.
3. User (or a different session scoped to community B) invokes the assistant in community B.
4. The assistant fetches the last 6 messages globally for that email (line 690-691), including messages from community A.
5. These are passed to OpenAI as context (line 706), potentially revealing private community A data.
6. The `listAssistantHistory` API also returns all history without community filter.

### Evidence

- `src/lib/server/ai/assistant.ts:690-691` — `prisma.aiChatMessage.findMany({ where: { userEmail: email } })` (no communityId filter)
- `src/lib/server/ai/assistant.ts:744-748` — `listAssistantHistory` also only filters by `userEmail`

### Remediation

Add `communityId` to the query filter:
```typescript
const history = await prisma.aiChatMessage.findMany({
  where: { userEmail: email, communityId },
  orderBy: { createdAt: "desc" },
  take: 6,
});
```

---

## Vulnerability 3: `findUserByEmail` Loads Entire User Table into Memory

- **Severity:** MEDIUM
- **Location:** `src/lib/server/db.ts:647-651`
- **Title:** Case-insensitive email fallback loads all users into memory, enabling denial-of-service and exposing all password hashes in-process.

### Description

When the primary `findUnique({ email })` lookup fails, `findUserByEmail` falls back to `prisma.user.findMany()` — fetching **every user row** including password hashes into application memory. This is called on every login attempt, registration check, profile lookup, and more. At scale, this creates a DoS vector and unnecessarily exposes all user credentials in memory.

### Impact

1. **Denial of Service:** An attacker sending requests with non-existent emails triggers full table scans, causing memory pressure and latency spikes.
2. **Information exposure:** All user password hashes are loaded into the Node.js heap on every failed primary lookup, increasing the window for memory-dump attacks or heap inspection.

### Attack Path

1. Attacker sends repeated authentication requests with randomized/non-existent email addresses.
2. Each request triggers `prisma.user.findMany()` loading ALL users.
3. Under load, this causes memory exhaustion and response time degradation.
4. Alternatively, in a compromised runtime, heap dumps reveal all user password hashes.

### Evidence

- `src/lib/server/db.ts:649` — `const all = await prisma.user.findMany();`
- `src/lib/server/db.ts:650` — `all.find(...)` iterates all users
- Function is called from login, registration, password reset, profile endpoints

### Remediation

Use a case-insensitive database query instead of loading all rows:
```typescript
const match = await prisma.user.findFirst({
  where: { email: { equals: email, mode: "insensitive" } },
});
```

---

## Vulnerability 4: Hardcoded JWT Signing Secret in Development Mode

- **Severity:** HIGH
- **Location:** `src/lib/server/auth.ts:16-17`
- **Title:** A static, well-known JWT secret is used when `AUTH_SECRET` is unset, enabling token forgery in any non-production environment.

### Description

When `AUTH_SECRET` is not set and `NODE_ENV !== "production"`, the JWT signing key defaults to the hardcoded string `"easy-life-dev-secret-change-in-production"`. Any preview, staging, or development deployment that lacks an explicit `AUTH_SECRET` will use this known secret. Since this value is committed to source code, anyone with access to the repository can forge arbitrary session tokens.

### Impact

An attacker can forge any session token (for any user, any role including `admin`) on any deployment where `AUTH_SECRET` is not explicitly configured — including staging and preview environments which may contain real production data.

### Attack Path

1. Attacker identifies a staging/preview deployment (e.g., a Vercel preview URL).
2. If `AUTH_SECRET` is not configured on that environment, the hardcoded key is used.
3. Attacker crafts a JWT signed with `"easy-life-dev-secret-change-in-production"`.
4. Attacker sets the JWT as the `el_session` cookie.
5. Attacker gains admin access to the preview environment.

### Evidence

- `src/lib/server/auth.ts:16-17` — `return new TextEncoder().encode("easy-life-dev-secret-change-in-production");`
- `src/lib/server/auth.ts:10-11` — Only production throws when secret is missing

### Remediation

Always require `AUTH_SECRET` in any internet-facing deployment, including preview/staging:
```typescript
if (!secret) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("AUTH_SECRET must be set");
  }
  // Only allow in truly local dev
  return new TextEncoder().encode(crypto.randomBytes(32).toString("hex"));
}
```

---

## Vulnerability 5: OTP/Temp Password Returned in API Response on Provider Registration

- **Severity:** HIGH
- **Location:** `src/lib/server/db.ts:554-598`
- **Title:** The generated OTP is returned directly in the `addProviderToCommunity` response, exposing credentials to any admin-level caller.

### Description

When `addProviderToCommunity` creates a provider with an email, it generates an OTP (8 hex chars from `randomBytes(4)`), sets it as the user's password, and returns the `otp` field directly in the function result. This OTP becomes the initial password for the provider account. Any API consumer that calls this endpoint receives the plaintext credential in the response body.

### Impact

Any admin user (including a compromised or malicious club admin from a different community) who invokes this API can immediately log in as the newly created provider account. Since the OTP is the account password until changed, this grants full provider access.

### Attack Path

1. A club admin calls the provider registration API.
2. The response includes `otp: "a1b2c3d4"`.
3. The admin (or any interceptor) uses this OTP as the provider's password to log in.
4. The admin now has full access as the provider, including accessing that provider's data.

### Evidence

- `src/lib/server/db.ts:559` — `otp = randomBytes(4).toString("hex")`
- `src/lib/server/db.ts:570` — Password is set to hash of OTP
- `src/lib/server/db.ts:598` — `return { provider, otp, emailSent, emailError }`

### Remediation

Only return the OTP when email sending fails (as a fallback for manual communication). When email succeeds, do not include it in the response:
```typescript
return { 
  provider, 
  otp: emailSent ? undefined : otp,
  emailSent, 
  emailError 
};
```

---

## Vulnerability 6: In-Memory Rate Limiter Provides No Protection in Multi-Instance/Serverless Deployments

- **Severity:** MEDIUM
- **Location:** `src/lib/server/rate-limit.ts:1-17`
- **Title:** Rate limiter uses in-process memory map, offering zero protection in serverless (Vercel) deployments.

### Description

The rate limiter stores request counts in a `Map` within the Node.js process. On Vercel (or any serverless platform), each invocation may run in a fresh process or a different instance. The rate limit state is never shared across instances and is lost on cold starts. This means brute-force attacks against login, password reset, and other sensitive endpoints have no effective rate limiting.

### Impact

An attacker can perform unlimited brute-force attempts against login, password reset, OTP validation, and registration endpoints. The per-instance Map is reset on every cold start and is not shared across concurrent serverless functions.

### Attack Path

1. Attacker targets the login endpoint with credential stuffing.
2. Each request may hit a different serverless instance with a fresh rate limit map.
3. Even same-instance requests are lost on cold starts (common in serverless).
4. Attacker achieves unlimited login attempts without being blocked.

### Evidence

- `src/lib/server/rate-limit.ts:5` — `const hits = new Map<string, number[]>();`
- `src/lib/server/rate-limit.ts:7-16` — Pure in-memory sliding window
- Comment at line 3: "Sufficient for a single instance / dev"

### Remediation

Use an external store for rate limiting in production:
- Vercel KV / Upstash Redis
- The `@upstash/ratelimit` library designed for edge/serverless

---

## Vulnerability 7: `listServiceRequests` Can Bypass Community Scoping via Email Parameter

- **Severity:** MEDIUM
- **Location:** `src/lib/server/records.ts:854-863`
- **Title:** Service request listing by email omits community scoping, allowing cross-tenant data access when called with an email from another community.

### Description

`listServiceRequests` accepts either `communityId` or `email` as filter criteria. When `email` is provided, the query only filters by `memberEmail` without additionally scoping to the caller's community. If an admin or member endpoint passes a user email from a different community, the query returns service requests from ALL communities for that email.

### Impact

A member or admin in community A could potentially view service requests submitted by the same email address in community B, leaking maintenance request details, unit numbers, and descriptions across tenants.

### Attack Path

1. An API endpoint passes the email parameter to `listServiceRequests`.
2. The function queries `{ memberEmail: opts.email }` without community scoping (line 860).
3. If the targeted email is also a member of another community, their service requests from that community are returned.
4. The caller sees service request details (unit, description, category) from another tenant.

### Evidence

- `src/lib/server/records.ts:858-860` — `where: opts.email ? { memberEmail: opts.email } : { communityId: scope(opts.communityId) }`

### Remediation

Always include community scoping:
```typescript
where: {
  ...(opts.email ? { memberEmail: opts.email } : {}),
  communityId: scope(opts.communityId),
},
```

---

## Vulnerability 8: `listBookingsForMember` Has No Community Scoping

- **Severity:** MEDIUM
- **Location:** `src/lib/server/records.ts:158-162`
- **Title:** Booking list for member has no community filter, exposing bookings across all clubs for multi-club members.

### Description

`listBookingsForMember` only filters by `memberEmail`. For users who are members of multiple communities, this returns bookings from ALL communities. If this is used in a context where only the current community's bookings should be visible, it constitutes a data leak.

### Impact

When a user is a member of multiple clubs, viewing their bookings in community B's context also reveals bookings made at community A, including amenity names, times, and guest lists that are specific to community A.

### Attack Path

1. User is a member of both community A and community B.
2. User (or an admin viewing user data) fetches bookings in community B's context.
3. `listBookingsForMember` returns ALL bookings for that email across all communities.
4. Community A's booking details (amenities, times, court assignments) are visible in community B.

### Evidence

- `src/lib/server/records.ts:158-162` — `where: { memberEmail: email, status: { not: "cancelled" } }` (no communityId filter)

### Remediation

Add an optional `communityId` parameter and use it as a filter when present:
```typescript
export async function listBookingsForMember(email: string, communityId?: string) {
  return prisma.booking.findMany({
    where: { 
      memberEmail: email, 
      status: { not: "cancelled" },
      ...(communityId ? { communityId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}
```

---

## Vulnerability 9: Cron Endpoints Unauthenticated in Non-Production

- **Severity:** MEDIUM
- **Location:** `src/lib/server/cron-auth.ts:12-19`
- **Title:** Cron jobs run unauthenticated when `CRON_SECRET` is not set, exposing sensitive operations in preview/staging environments.

### Description

When `CRON_SECRET` is unset and `NODE_ENV` is not `"production"`, cron endpoints allow unauthenticated access. Preview and staging environments on Vercel may have `NODE_ENV=development` or lack the secret, allowing anyone who discovers the cron URL to trigger data mutations like membership reminders, status transitions, and commission processing.

### Impact

An attacker can trigger cron jobs on preview/staging deployments without authentication, causing data mutations (processing payments, changing membership statuses, sending notifications) on environments that may share a production database.

### Attack Path

1. Attacker discovers a Vercel preview deployment URL.
2. Preview deployment has no `CRON_SECRET` configured.
3. Attacker calls `/api/cron/reminders`, `/api/cron/rejoin`, etc.
4. These endpoints process real data (if connected to a shared DB), triggering membership state changes, reminder sends, and commission calculations.

### Evidence

- `src/lib/server/cron-auth.ts:12-19` — Returns `{ ok: true, secured: false }` when secret is unset in non-production

### Remediation

Either require the secret in all environments or add an additional check (e.g., verify the request comes from Vercel's cron infrastructure):
```typescript
if (!secret) {
  return { ok: false, status: 401, error: "CRON_SECRET is not configured" };
}
```

---

## Vulnerability 10: File Uploads Written to Public Directory Without Access Control

- **Severity:** MEDIUM
- **Location:** `src/lib/server/storage.ts:143-144`, `src/lib/server/storage.ts:162-164`
- **Title:** Uploaded files are stored in `public/uploads/` with random filenames but no authentication required to access them.

### Description

When Azure Blob Storage is not configured, file uploads fall back to the local filesystem at `public/uploads/`. In Next.js, the `public/` directory is served statically without any authentication. While filenames are random (24 hex chars), once a URL is known (e.g., from an API response or by observing the URL in an image tag), anyone can access it without authentication. This includes potentially sensitive documents (ID verifications, profile photos, uploaded PDFs).

### Impact

Any uploaded file (including sensitive documents like ID verification uploads, medical forms, or private photos) is accessible to anyone who knows or guesses the URL. The 24 hex chars provide some obscurity but no access control.

### Attack Path

1. A member uploads a sensitive document (ID verification, PDF, photo).
2. The file is stored at `/uploads/<24-hex-chars>.ext`.
3. The URL is returned in an API response and may be stored in database records visible to other users.
4. Anyone with the URL can access the file without authentication.
5. URLs may leak through browser history, shared links, or other API responses.

### Evidence

- `src/lib/server/storage.ts:5` — `const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")`
- `src/lib/server/storage.ts:143-144` — `await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer); return \`/uploads/${filename}\`;`
- `src/lib/server/storage.ts:162-164` — Same pattern for media uploads

### Remediation

Serve uploads through an authenticated API route instead of the public directory:
```typescript
const UPLOAD_DIR = path.join(process.cwd(), ".uploads"); // Outside public/
// Serve via /api/uploads/[filename] with auth check
```

---

## Summary

| # | Severity | Title |
|---|----------|-------|
| 1 | HIGH | Predictable temporary passwords via `Math.random()` |
| 2 | MEDIUM | AI chat history leaks across communities |
| 3 | MEDIUM | `findUserByEmail` loads entire user table (DoS + hash exposure) |
| 4 | HIGH | Hardcoded JWT signing secret in dev mode |
| 5 | HIGH | OTP returned in provider registration API response |
| 6 | MEDIUM | In-memory rate limiter useless in serverless |
| 7 | MEDIUM | Service requests queryable without community scope |
| 8 | MEDIUM | Bookings list has no community scoping |
| 9 | MEDIUM | Cron endpoints unauthenticated in non-production |
| 10 | MEDIUM | File uploads in public directory without access control |
