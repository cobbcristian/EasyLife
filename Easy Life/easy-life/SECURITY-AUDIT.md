# Security Audit Report — EasyLife Application

**Date:** 2026-08-13
**Scope:** Session handling, OAuth, IDOR, Bookings, Messages, Admin user management, Documents

---

## 1. Session Handling (`src/lib/server/auth.ts`)

### FINDING 1.1 — Hardcoded Fallback JWT Secret in Development (MEDIUM)

- **File:** `src/lib/server/auth.ts`, lines 11–18
- **Description:** When `AUTH_SECRET` is unset and `NODE_ENV` is not `"production"`, the code falls back to a hardcoded secret (`"easy-life-dev-secret-change-in-production"`). This same fallback is duplicated in `src/lib/server/mfa.ts` (lines 12–13). If a non-production deployment (staging, preview) runs without `AUTH_SECRET`, all JWTs are signed with this publicly-known key.
- **Attack path:** An attacker who knows the fallback secret can forge session JWTs for any user/role on any non-production deployment.
- **Impact:** Full account takeover on staging/preview environments.
- **Existing mitigations:** Production environments throw if `AUTH_SECRET` is unset (line 12–13). The risk is limited to non-production environments.

### FINDING 1.2 — No Session Invalidation on Password Change or Account Freeze (MEDIUM)

- **File:** `src/lib/server/auth.ts`, lines 23–31; `src/app/api/auth/reset-password/route.ts`
- **Description:** Sessions are stateless JWTs with a 7-day expiry. When a user changes their password, resets their password, or is frozen by an admin, existing session tokens remain valid until they naturally expire. There is no server-side session revocation mechanism.
- **Attack path:** After a compromised password is changed, an attacker with a stolen JWT continues to have access for up to 7 days. Similarly, freezing an account does not immediately terminate active sessions.
- **Impact:** Delayed effect of security actions (password reset, account freeze).
- **Existing mitigations:** `getSession()` calls check `frozen` status in some (not all) endpoints at request time, but the JWT itself never becomes invalid. Some endpoints check `frozen` status only after the fact (e.g., login), not on every API call.

### FINDING 1.3 — Session Token Not Rotated After Login (LOW)

- **File:** `src/app/api/auth/login/route.ts`, lines 122–139
- **Description:** The session cookie is set directly after login without invalidating any prior session. There is no session fixation protection beyond `SameSite=lax`. If an attacker can inject a session cookie before login (e.g., on shared subdomains), the pre-login cookie persists.
- **Impact:** Low — `SameSite=lax` and `httpOnly` cookies mitigate most session fixation vectors.
- **Existing mitigations:** `SameSite=lax`, `httpOnly`, `secure` in production.

### FINDING 1.4 — Password Reset Token Reusable (LOW-MEDIUM)

- **File:** `src/app/api/auth/reset-password/route.ts`, `src/lib/server/auth.ts` lines 69–87
- **Description:** The password reset token is a JWT with 1-hour expiry. After a successful password reset, the token is not invalidated — it can be reused to reset the password again within the same window.
- **Attack path:** If an attacker intercepts a reset token, they can repeatedly reset the password within the 1-hour window even after the legitimate user has already used it.
- **Impact:** Limited account takeover window.
- **Existing mitigations:** 1-hour expiry limits the window. Rate limiting (5 attempts/minute).

---

## 2. OAuth Implementation (`src/lib/server/oauth.ts`, `src/app/api/auth/oauth/`)

### FINDING 2.1 — Apple ID Token Not Signature-Verified (HIGH)

- **File:** `src/lib/server/oauth.ts`, lines 189–194 and 247–262
- **Description:** The Apple `id_token` is decoded using `decodeJwtPayload()` which simply base64-decodes the JWT payload without verifying the signature. This means the server trusts the email and subject claims from the token without cryptographic verification.
- **Attack path:** An attacker who can intercept or tamper with the token exchange response (e.g., via a compromised network, or a malicious proxy) could inject arbitrary `email` and `sub` claims. More realistically, if the token exchange response is manipulated, the server would accept any email address.
- **Impact:** Potential account takeover via forged Apple SSO identity.
- **Existing mitigations:** The code does use TLS for the Apple token endpoint, and the authorization code exchange itself provides some trust. However, best practice requires verifying the `id_token` signature against Apple's public keys.

### FINDING 2.2 — Password Reset Token and Code Leaked in API Response (HIGH)

- **File:** `src/app/api/auth/forgot-password/route.ts`, lines 35–53
- **Description:** The forgot-password endpoint returns the full reset token, reset URL, and a derived OTP code directly in the JSON response body. This means any client-side code (or network observer) can obtain the password reset token without needing email access.
- **Attack path:** An attacker calls `POST /api/auth/forgot-password` with a victim's email and receives the reset token in the response. They then use it at `/api/auth/reset-password` to change the victim's password.
- **Impact:** **Critical** — Complete account takeover for any user whose email is known.
- **Existing mitigations:** The comment suggests this is a "Demo" feature for MVP. Rate limiting exists but does not prevent a single successful call per email.

### FINDING 2.3 — OAuth State Cookie SameSite=lax with Apple form_post (LOW-MEDIUM)

- **File:** `src/app/api/auth/oauth/[provider]/route.ts`, lines 35–41; callback `POST` handler
- **Description:** Apple SSO uses `response_mode: "form_post"`, which sends the callback as a POST from Apple's domain. The `oauth_state` cookie is set with `SameSite=lax`, which browsers do not send on cross-site POST requests. The callback correctly reads the state from the cookie and validates it (lines 209–213 of callback), but `SameSite=lax` may cause the state cookie to be absent on the Apple POST callback in some browsers.
- **Impact:** Apple SSO callback may fail intermittently due to missing state cookie, or worse, the state validation is bypassed if the code handles the missing cookie case improperly. In this code, a missing cookie correctly triggers "SSO state mismatch" (line 213), so the primary impact is Apple SSO failing rather than a bypass.
- **Existing mitigations:** The state validation is strict — missing cookie = rejection. This is a usability issue more than a security issue.

### FINDING 2.4 — Microsoft Email Assumed Verified (LOW)

- **File:** `src/lib/server/oauth.ts`, line 243
- **Description:** Microsoft profile responses have `emailVerified` hardcoded to `true` without checking the actual verification status. While Microsoft generally only returns verified emails, this assumption could lead to issues with certain Microsoft tenant configurations.
- **Impact:** Low — mostly theoretical.

---

## 3. Member-Facing IDOR (`src/app/api/member/`)

### FINDING 3.1 — Service Booking Status Update Has No Ownership Check (HIGH)

- **File:** `src/app/api/member/service-bookings/[id]/route.ts`, lines 20–44
- **Description:** The PATCH endpoint allows any authenticated member to accept or deny any service booking by ID. The code retrieves the booking via `getCommunityBookingById(id)` (line 39) but never verifies that the booking belongs to the requesting member. It only checks `session.role === "member"`.
- **Attack path:** Member A can accept/deny Member B's service bookings by calling `PATCH /api/member/service-bookings/{booking_id}` with any booking ID.
- **Impact:** Unauthorized modification of other members' service bookings.
- **Existing mitigations:** None. The booking ID is the only access control, and it is a guessable/enumerable identifier.

### FINDING 3.2 — Visitors Queried By Name, Not By ID (LOW-MEDIUM)

- **File:** `src/app/api/member/visitors/route.ts`, lines 17–26
- **Description:** Visitor records are queried by `host: session.name.trim()` rather than by `session.email` or `session.sub`. If two members share the same name, they would see each other's visitor records.
- **Attack path:** A member could change their display name to match another member's name and see their visitor records.
- **Impact:** Information disclosure of visitor records.
- **Existing mitigations:** Name collisions are unlikely in small communities. The `communityId` filter provides some scoping.

### FINDING 3.3 — Member Profile Update Allows Unvalidated Fields via `updateMemberProfile` (LOW)

- **File:** `src/app/api/member/profile/route.ts`, lines 25–49
- **Description:** The PATCH body is typed but the entire body object is passed to `updateMemberProfile(session.email, body)`. If `updateMemberProfile` doesn't strip unexpected fields, a member could potentially set fields they shouldn't (mass assignment).
- **Impact:** Depends on the `updateMemberProfile` implementation — potentially setting fields like `role`, `communityId`, etc.
- **Existing mitigations:** The typed interface restricts to `name`, `phone`, `unit`, `directoryVisible`, `commsPush`, but TypeScript types are not enforced at runtime.

---

## 4. Booking Endpoints (`src/app/api/bookings/`)

### FINDING 4.1 — Booking Detail Accessible to Any Community Member (LOW)

- **File:** `src/app/api/bookings/[id]/route.ts`, lines 5–19
- **Description:** `GET /api/bookings/{id}` calls `getBookingReservationDetail(id, session.email)` which properly checks that the requester is either the host or an invitee. This is correctly implemented.
- **Impact:** None — properly mitigated.

### FINDING 4.2 — Booking Cancellation Properly Scoped (NONE)

- **File:** `src/app/api/bookings/[id]/cancel/route.ts`, `src/lib/server/records.ts` line 846–849
- **Description:** `cancelBooking(id, memberEmail)` verifies `booking.memberEmail === memberEmail`. Properly scoped to the booking owner.
- **Impact:** None — properly mitigated.

### FINDING 4.3 — Booking Invite Endpoint Properly Checks Ownership (NONE)

- **File:** `src/app/api/bookings/[id]/invites/route.ts`, lines 35–41
- **Description:** The invite endpoint correctly verifies `booking.memberEmail === session.email` before allowing invites.
- **Impact:** None — properly mitigated.

---

## 5. Message/Chat Endpoints (`src/app/api/messages/`, threads)

### FINDING 5.1 — Private Messages Channel Role Check Is Correct (NONE)

- **File:** `src/app/api/messages/route.ts`, lines 12–16, 21–24, 55–58
- **Description:** Channel access is restricted by role (`board` channel requires `board` or `admin`, `pm` channel requires `pm`, `board`, or `admin`). Properly implemented.
- **Impact:** None.

### FINDING 5.2 — Chat Thread Access Properly Scoped to Community (NONE)

- **File:** `src/app/api/messages/threads/[id]/route.ts`, lines 16–21
- **Description:** `assertChatParticipantInCommunity()` verifies both thread membership and community match. Properly scoped.
- **Impact:** None.

### FINDING 5.3 — No Message Content Sanitization (LOW-MEDIUM)

- **File:** `src/app/api/messages/route.ts`, line 67; `src/app/api/messages/threads/[id]/route.ts`, line 52
- **Description:** Message body content is stored as-is without HTML/script sanitization. If rendered as HTML on the frontend without proper escaping, this could lead to Stored XSS.
- **Attack path:** A user posts a message containing `<script>` tags or event handlers. If the frontend renders this as raw HTML, the script executes in other users' browsers.
- **Impact:** Stored XSS — session theft, data exfiltration from other users.
- **Existing mitigations:** React's default behavior escapes strings in JSX. If the frontend uses `dangerouslySetInnerHTML` or a rich-text renderer, this becomes exploitable. Needs frontend code review to confirm.

---

## 6. Admin User Management (`src/app/api/admin/users/`)

### FINDING 6.1 — TOCTOU Race in Admin User Status Update (MEDIUM)

- **File:** `src/app/api/admin/users/[id]/route.ts`, lines 45–51, 80–87
- **Description:** The PATCH endpoint first checks `existing.communityId !== session.communityId` (line 49) to prevent cross-tenant updates. However, the actual update is done via `setUserStatus(id, body.status)` (line 80) which does not re-verify community ownership. After the update, there's a second community check on line 85 (`updated.communityId !== session.communityId`), but the update has already been committed to the database.
- **Attack path:** In a race condition, if the user's community is changed between the initial check (line 45) and the update (line 80), a club admin could modify a user in another community.
- **Impact:** Cross-tenant privilege modification in race condition scenarios.
- **Existing mitigations:** The post-update check (line 85) returns 403, but the damage (status change) is already done.

### FINDING 6.2 — Club Admin Can Create Users with Any Role (MEDIUM)

- **File:** `src/app/api/admin/users/route.ts`, lines 45–114
- **Description:** A club admin (`session.role === "admin"` with `session.communityId` set) can create users with any role including `"admin"`. The community scoping on line 77–78 correctly forces the new user to the admin's own community, but a club admin creating another admin account effectively escalates their administrative reach.
- **Attack path:** Club admin creates an `admin` user in their own community, who can then be used to perform admin-level actions. While scoped to the same community, it allows admin multiplication.
- **Impact:** Low — admin can only create within their own community. But creating `provider` or `sales` roles in their community may not be intended.
- **Existing mitigations:** Community scoping is enforced for non-super-admins.

### FINDING 6.3 — Admin DELETE Has No Cross-Tenant Check for Non-Super-Admin (MEDIUM)

- **File:** `src/app/api/admin/users/[id]/route.ts`, lines 105–149
- **Description:** The DELETE endpoint uses `listAdminUsers()` filtered by the admin's community (line 119–121), then checks `all.find(u => u.id === id)`. If the user is not in the filtered list, it returns 404. However, `listAdminUsers` without a `communityId` filter returns ALL users. A super admin (no communityId) correctly passes `undefined`, but the `isSuperAdmin()` check determines whether to scope or not. This is correctly implemented.
- **Impact:** None for the delete endpoint specifically — properly scoped.

---

## 7. Document/File Access (`src/app/api/documents/`)

### FINDING 7.1 — Documents Scoped by Community but No Audience Enforcement for Staff (LOW)

- **File:** `src/app/api/documents/route.ts`, lines 6–36
- **Description:** Members are restricted to `audience: "member"` documents. Non-member roles (board, PM, admin) can pass any `audience` filter and see all documents in their community. The community scoping uses `session.communityId`, which is correct.
- **Impact:** Staff roles can see all document audiences within their own community. This appears intentional.
- **Existing mitigations:** Community scoping is enforced via `session.communityId`.

### FINDING 7.2 — Document URL Points to Dummy PDF (INFORMATIONAL)

- **File:** `src/app/api/documents/route.ts`, lines 27–29
- **Description:** Documents with `url === "#"` are rewritten to a W3C dummy PDF. This is a demo/seed behavior but exposes a fixed external URL to all users.
- **Impact:** None — informational.

---

## 8. Additional Cross-Cutting Findings

### FINDING 8.1 — In-Memory Rate Limiter Is Per-Instance Only (MEDIUM)

- **File:** `src/lib/server/rate-limit.ts`, lines 1–22
- **Description:** The rate limiter uses an in-memory `Map`. In a multi-instance deployment (e.g., serverless functions, multiple pods), each instance maintains its own counter. An attacker can spread requests across instances to bypass rate limits.
- **Attack path:** Distribute brute-force login attempts across multiple serverless invocations to bypass the 10-attempts-per-minute limit.
- **Impact:** Rate limiting is ineffective in production serverless deployments.
- **Existing mitigations:** Comment acknowledges this (line 3): "For multi-instance production, back this with Redis or an edge KV."

### FINDING 8.2 — Client IP from X-Forwarded-For Is Spoofable (LOW)

- **File:** `src/lib/server/rate-limit.ts`, lines 19–22
- **Description:** `clientIp()` reads the first value from `X-Forwarded-For`. Behind a single reverse proxy this is fine, but if the proxy chain is not configured to strip/overwrite this header, an attacker can spoof their IP to bypass per-IP rate limits.
- **Impact:** Rate limit bypass via IP spoofing.
- **Existing mitigations:** Most cloud hosting (Vercel) properly sets `X-Forwarded-For`.

### FINDING 8.3 — MFA Pending Token Contains Full Session Data (LOW)

- **File:** `src/lib/server/mfa.ts`, lines 104–112
- **Description:** The MFA pending token is a JWT containing `sub`, `email`, `role`, `name`, and `communityId`. While it has a `purpose: "mfa-pending"` claim, if this token leaks (e.g., in URL parameters as shown in the OAuth callback, line 95 of the callback), it exposes user identity data. The token is returned in the login response and passed via URL query parameter.
- **Impact:** Information exposure. The token cannot be used as a session token (purpose check prevents it), so the risk is limited to data leakage.
- **Existing mitigations:** Purpose-based claim separation prevents token misuse.

### FINDING 8.4 — Session JWT Exposed in Deep Link URL (MEDIUM)

- **File:** `src/app/api/auth/oauth/[provider]/callback/route.ts`, lines 122–129
- **Description:** For mobile "plaza" native app flow, the full session JWT is placed in a deep link URL (`plaza-oceanside://oauth?token=<JWT>`). This URL may be logged in browser history, proxy logs, or system logs.
- **Attack path:** If device/browser logs are accessible, an attacker retrieves the JWT from URL history and impersonates the user.
- **Impact:** Session token leakage via URL logging.
- **Existing mitigations:** Deep links are handled by the native app and typically not logged by intermediary proxies. Risk is primarily on-device.

---

## Summary Table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 2.2 | Password reset token leaked in API response | **CRITICAL** | Unmitigated |
| 2.1 | Apple ID token not signature-verified | **HIGH** | Unmitigated |
| 3.1 | Service booking IDOR — no ownership check | **HIGH** | Unmitigated |
| 1.2 | No session invalidation on password change/freeze | MEDIUM | Unmitigated |
| 6.1 | TOCTOU race in admin user status update | MEDIUM | Partially mitigated |
| 8.1 | In-memory rate limiter per-instance only | MEDIUM | Acknowledged |
| 8.4 | Session JWT in deep link URL | MEDIUM | Low risk in practice |
| 1.1 | Hardcoded fallback JWT secret | MEDIUM | Production throws |
| 6.2 | Club admin can create any-role users | MEDIUM | Community-scoped |
| 1.4 | Password reset token reusable | LOW-MEDIUM | Time-limited |
| 5.3 | No server-side message content sanitization | LOW-MEDIUM | Depends on frontend |
| 3.2 | Visitors queried by name instead of ID | LOW-MEDIUM | Community-scoped |
| 2.3 | OAuth state cookie SameSite=lax with Apple form_post | LOW-MEDIUM | Fails safely |
| 8.2 | X-Forwarded-For IP spoofable | LOW | Platform-dependent |
| 8.3 | MFA pending token exposes user data | LOW | Purpose claim separates |
| 1.3 | Session not rotated after login | LOW | SameSite mitigates |
| 3.3 | Member profile mass assignment potential | LOW | Needs impl review |
| 2.4 | Microsoft email assumed verified | LOW | Theoretical |
| 7.1 | Documents audience filter for staff | LOW | Appears intentional |
