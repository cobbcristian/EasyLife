# Security Audit Report — EasyLife API Routes

**Audit Date:** 2026-08-13  
**Scope:** 49 API route files under `src/app/api/`  
**Focus:** Cross-tenant access, IDOR, missing authorization, injection, data exposure, business logic flaws

---

## CRITICAL Severity

### 1. Community onboarding returns temp password and invite code in API response

- **Severity:** CRITICAL
- **Location:** `src/app/api/communities/route.ts`
- **Title:** Temporary admin password and invite code leaked in POST response body.
- **Description:** When a super-admin onboards a new community, the API response includes the plaintext `tempPassword` and `inviteCode` in the JSON body (lines 84-85). Any intermediate proxy, logging middleware, CDN, or browser extension can capture these credentials. If the welcome email also fails (`emailSent: false`), the response is the only delivery channel, meaning the credentials transit through the network in cleartext JSON.
- **Impact:** An attacker who can intercept or log API responses (e.g., via shared infrastructure, browser devtools, or logging) gains the admin credentials for a newly created community, achieving full takeover.
- **Attack Path:**
  1. Super-admin calls `POST /api/communities` to onboard a new community.
  2. Response JSON contains `tempPassword` and `inviteCode` in plaintext.
  3. Attacker intercepts the response (network log, shared proxy, CDN cache, client-side JS interception).
  4. Attacker uses the temp password to log in as the new community's admin.
- **Evidence:** `src/app/api/communities/route.ts:84-85`
- **Remediation:** Never return plaintext credentials in API responses. Send the temp password exclusively via email. If email is not configured, return a one-time-use setup link with a short-lived token instead.

---

### 2. Grab-and-Go kiosk API has no authentication in demo mode (default)

- **Severity:** CRITICAL
- **Location:** `src/app/api/grab-go/kiosk/route.ts`
- **Title:** Kiosk API is completely unauthenticated when `GRAB_GO_MACHINE_KEY` env var is unset.
- **Description:** The `authorizeMachine` function (lines 19-23) returns `true` when `GRAB_GO_MACHINE_KEY` is not set, treating this as "demo mode." This means all kiosk endpoints (open sessions, record grabs, close sessions with charges) are publicly accessible without any authentication. Since environment variables are commonly forgotten in deployment, this is a dangerous default.
- **Impact:** Any unauthenticated attacker can open grab-and-go sessions, record fake purchases, close sessions (triggering charges to members' accounts), and manipulate inventory — all without any credentials.
- **Attack Path:**
  1. Attacker discovers `POST /api/grab-go/kiosk` endpoint.
  2. `GRAB_GO_MACHINE_KEY` is not set (the default).
  3. Attacker sends `{"action":"open","machineCode":"...","unlockMethod":"card_tap","memberEmail":"victim@example.com"}`.
  4. Session opens for victim member; attacker records grabs and closes session, charging victim.
- **Evidence:** `src/app/api/grab-go/kiosk/route.ts:19-23`
- **Remediation:** Require `GRAB_GO_MACHINE_KEY` to be set. Fail closed (deny access) when the key is missing, rather than fail open. Add startup validation that refuses to serve the kiosk route without a configured key.

---

## HIGH Severity

### 3. Event invite authorization relies on name comparison instead of authenticated identity

- **Severity:** HIGH
- **Location:** `src/app/api/events/[id]/invites/route.ts`
- **Title:** Organizer check compares `session.name` to `event.createdBy`, which is spoofable and fragile.
- **Description:** The invite endpoint (lines 39-46) checks if the user is the event organizer by comparing `event.createdBy.trim().toLowerCase()` with `session.name.trim().toLowerCase()`. The `createdBy` field is set to `session.name` when the event is created (not a stable user ID). If two users share the same display name, or if a user changes their name, this check can be bypassed. Names are user-controlled and not unique identifiers.
- **Impact:** A user with the same display name as an event organizer (or who sets their name to match) can send invites to arbitrary events they did not create, leading to unauthorized event manipulation.
- **Attack Path:**
  1. Attacker observes the `createdBy` field of a target event (returned in `GET /api/events`).
  2. Attacker changes their profile name to match `createdBy`.
  3. Attacker calls `POST /api/events/{id}/invites` — the name check passes.
  4. Attacker sends invites to arbitrary email addresses on behalf of the organizer.
- **Evidence:** `src/app/api/events/[id]/invites/route.ts:39-46`, `src/app/api/events/route.ts:98`
- **Remediation:** Store `createdByEmail` or `createdByUserId` on the event, and compare against `session.email` or `session.sub` instead of display name.

---

### 4. Blog comments lack cross-tenant scoping — any user can read/write comments on any community's posts

- **Severity:** HIGH
- **Location:** `src/app/api/blog/[id]/comments/route.ts`
- **Title:** Blog comment GET and POST accept arbitrary blog post ID with no community or ownership check.
- **Description:** Both `GET` and `POST` handlers accept a blog post `id` from the URL path and pass it directly to `listBlogComments(id)` and `addBlogComment({blogId: id, ...})` without verifying that the blog post belongs to the user's community. The underlying Prisma queries filter only by `postId` with no `communityId` scoping. Any authenticated user from any community can read and post comments on any community's blog posts.
- **Impact:** Cross-tenant data access — users from Community A can read and comment on Community B's blog posts, breaking tenant isolation.
- **Attack Path:**
  1. Attacker (member of Community A) obtains or guesses a blog post ID from Community B.
  2. Attacker calls `GET /api/blog/{id}/comments` to read all comments.
  3. Attacker calls `POST /api/blog/{id}/comments` with `{"body": "spam"}` to post a comment on the other community's blog.
- **Evidence:** `src/app/api/blog/[id]/comments/route.ts:16,38-42`, `src/lib/server/member-api-store.ts:433-444`
- **Remediation:** Look up the blog post by ID, verify its `communityId` matches `session.communityId`, then proceed. Return 404 for cross-tenant access attempts.

---

### 5. Group invite endpoint has no membership or ownership check

- **Severity:** HIGH
- **Location:** `src/app/api/groups/[groupId]/invite/route.ts`
- **Title:** Any authenticated user can invite anyone to any group regardless of group membership or ownership.
- **Description:** The POST handler checks only that the user is authenticated and that the group exists (lines 11-15). It does not verify that the requesting user is a member of the group, an admin of the group, or even belongs to the same community. Any authenticated user can invite arbitrary email addresses to any group.
- **Impact:** An attacker can add themselves or arbitrary users to private groups, gaining access to private group content and conversations.
- **Attack Path:**
  1. Attacker discovers or enumerates group IDs.
  2. Attacker calls `POST /api/groups/{groupId}/invite` with `{"email":"attacker@evil.com"}`.
  3. Attacker is added to the private group's membership.
  4. Attacker can now read group posts and messages.
- **Evidence:** `src/app/api/groups/[groupId]/invite/route.ts:10-28`, `src/lib/server/member-api-store.ts:424-431`
- **Remediation:** Verify that the requesting user is a member or admin of the target group before allowing invitations. Also verify community scoping.

---

### 6. Group posts endpoint has no membership check — any user can read/write to any group

- **Severity:** HIGH
- **Location:** `src/app/api/groups/[groupId]/posts/route.ts`
- **Title:** Group post listing and creation do not verify group membership or community scoping.
- **Description:** Both `GET` (listing posts) and `POST` (creating posts, liking, commenting) accept an arbitrary `groupId` from the URL and operate on it without verifying the user is a member of that group or even in the same community. The underlying `listGroupPosts(groupId, ...)` queries by `groupId` alone with no `communityId` filter.
- **Impact:** Cross-tenant and unauthorized group access — any authenticated user can read posts from private groups in any community, post content, like posts, and add comments.
- **Attack Path:**
  1. Attacker enumerates or guesses group IDs.
  2. `GET /api/groups/{groupId}/posts` returns all posts in that group.
  3. `POST /api/groups/{groupId}/posts` with `{"text":"injected content"}` adds a post.
- **Evidence:** `src/app/api/groups/[groupId]/posts/route.ts:21,56-65`, `src/lib/server/project-management.ts:235-242`
- **Remediation:** Verify group membership and community scoping before allowing any read or write operations on group posts.

---

### 7. Event detail endpoint lacks community scoping — IDOR across tenants

- **Severity:** HIGH
- **Location:** `src/app/api/events/[id]/route.ts`
- **Title:** Any authenticated user can view full event details (including RSVP list) from any community.
- **Description:** The `GET` handler fetches event details by `id` (line 14) without checking that the event belongs to the user's community. While `getEventReservationDetail` takes the user's email, it does not filter by community — it retrieves any event by ID. This is an IDOR that exposes event details including RSVP names and emails across tenants.
- **Impact:** Cross-tenant information disclosure — member names, emails, and event details from other communities are exposed.
- **Attack Path:**
  1. Attacker enumerates event IDs (e.g., CUIDs are not secret).
  2. `GET /api/events/{id}` returns full event details including RSVP list from another community.
- **Evidence:** `src/app/api/events/[id]/route.ts:13-22`, `src/lib/server/records.ts:364-378`
- **Remediation:** Add `communityId` check to `getEventReservationDetail` or verify in the route handler that the event's community matches `session.communityId`.

---

### 8. Events GET endpoint exposes all RSVP emails and names to any community member

- **Severity:** HIGH
- **Location:** `src/app/api/events/route.ts`
- **Title:** Event listing returns full RSVP list (emails and names) to all authenticated users.
- **Description:** The `GET` handler (lines 37-38) returns `rsvps: e.rsvps.map((r) => ({ email: r.memberEmail, name: r.memberName }))` for every event, to every authenticated user regardless of role. This exposes member email addresses and attendance details to all community members, including for events the user is not attending.
- **Impact:** Mass PII exposure — any member can enumerate email addresses and names of all event attendees in their community, enabling spam, phishing, or social engineering.
- **Attack Path:**
  1. Authenticated member calls `GET /api/events`.
  2. Response includes full RSVP lists with emails for every event.
  3. Attacker harvests member emails.
- **Evidence:** `src/app/api/events/route.ts:37-38`
- **Remediation:** Restrict RSVP details. Return only `rsvpCount` to regular members. Only return individual RSVP details to event organizers and admins. Strip email addresses from the member-facing response.

---

### 9. Templates listing is not community-scoped — exposes all templates across tenants

- **Severity:** HIGH
- **Location:** `src/app/api/templates/route.ts`
- **Title:** `listTemplates()` returns all templates from all communities with no scoping.
- **Description:** The `GET` handler calls `listTemplates()` which executes `prisma.contentTemplate.findMany({ orderBy: { name: "asc" } })` — a query with no `communityId` filter. Any admin from any community can see all templates across the entire platform.
- **Impact:** Cross-tenant data leakage — confidential communication templates from one community are visible to admins of other communities.
- **Attack Path:**
  1. Admin of Community A calls `GET /api/templates`.
  2. Response includes templates from Community B, C, etc.
- **Evidence:** `src/app/api/templates/route.ts:13`, `src/lib/server/records.ts:2700-2702`
- **Remediation:** Add `communityId` filtering to `listTemplates()` and pass `session.communityId`.

---

### 10. Tournament player listing has no authorization beyond basic authentication

- **Severity:** HIGH
- **Location:** `src/app/api/tournaments/[id]/players/route.ts`
- **Title:** Any authenticated user can list players for any tournament across all communities.
- **Description:** The `GET` handler (lines 12-20) only requires authentication and accepts any tournament `id`. The underlying `listTournamentPlayers(id)` queries by `tournamentId` alone with no community scope. Any authenticated user from any community can enumerate players (names, UTR ratings, etc.) in any tournament.
- **Impact:** Cross-tenant information disclosure of participant data.
- **Attack Path:**
  1. Attacker enumerates tournament IDs.
  2. `GET /api/tournaments/{id}/players` returns player list from any community's tournament.
- **Evidence:** `src/app/api/tournaments/[id]/players/route.ts:17-20`, `src/lib/server/records.ts:2577-2582`
- **Remediation:** Verify that the tournament belongs to `session.communityId` before returning player data.

---

### 11. Tram requests visible across communities — no tenant isolation

- **Severity:** HIGH
- **Location:** `src/app/api/tram/route.ts`
- **Title:** Tram request listing exposes all requests in a community with member personal data, but lacks proper tenant enforcement.
- **Description:** The `GET` handler (lines 5-33) falls back to hardcoded `communityId: "golden-ocala"` when `session.communityId` is null (line 11). More importantly, it has no role check — any authenticated user can see all tram requests (not just their own), including member names, emails, phone numbers, pickup locations, and destinations. The `my` filter is optional and defaults to showing all.
- **Impact:** Any authenticated user can see all tram requests including personal information (phone numbers, locations) of other members. Stalking/privacy risk.
- **Attack Path:**
  1. Authenticated user calls `GET /api/tram` without `my=true`.
  2. Response includes all tram requests with member names, emails, phones, and locations.
- **Evidence:** `src/app/api/tram/route.ts:11-32`
- **Remediation:** For non-PM/admin users, always filter to `myRequests` only. Only PM/admin should see all requests.

---

### 12. Push test endpoint allows sending notifications to arbitrary email addresses

- **Severity:** HIGH
- **Location:** `src/app/api/push/test/route.ts`
- **Title:** Admin-only push test allows sending push notifications to any email, enabling targeted harassment.
- **Description:** The endpoint (line 25) uses `body.email ?? session.email` — letting the admin specify any target email. While it requires admin role, there is no check that the target email belongs to the same community. An admin of Community A can send push notifications to users of Community B.
- **Impact:** Cross-tenant push notification abuse. Admin can send unsolicited notifications to users outside their community.
- **Attack Path:**
  1. Admin of Community A calls `POST /api/push/test` with `{"email":"user@communityB.com"}`.
  2. Push notification is sent to a user of Community B.
- **Evidence:** `src/app/api/push/test/route.ts:25,30-34`
- **Remediation:** Verify the target email belongs to a user in `session.communityId`.

---

## MEDIUM Severity

### 13. Blog post creation has no role check — any authenticated user can create posts

- **Severity:** MEDIUM
- **Location:** `src/app/api/blog/route.ts`
- **Title:** Blog POST handler requires only authentication, not an elevated role.
- **Description:** The `POST` handler (line 15) checks only `if (!session)` — any authenticated user (member, provider, etc.) can create blog posts. This may be intentional, but contrasts with announcements (which require admin/board/pm role) and likely violates expected content moderation controls.
- **Impact:** Regular members or providers can publish blog posts that appear alongside official community content, potentially posting misleading or harmful content.
- **Attack Path:**
  1. Any authenticated user (even a provider) calls `POST /api/blog` with arbitrary content.
  2. Blog post is published and visible to the entire community.
- **Evidence:** `src/app/api/blog/route.ts:15`
- **Remediation:** Add role checking consistent with other content creation endpoints (e.g., require admin/board/pm role).

---

### 14. Help ticket POST allows email spoofing via user-supplied email field

- **Severity:** MEDIUM
- **Location:** `src/app/api/help-tickets/route.ts`
- **Title:** Help ticket creation uses attacker-controlled `body.email` instead of `session.email`.
- **Description:** Line 36 uses `body.email ?? session.email`, allowing any authenticated user to submit a help ticket with an arbitrary email address. This could be used to impersonate another member when communicating with support staff.
- **Impact:** Social engineering — an attacker can submit tickets that appear to come from another member, potentially leading support staff to disclose information or take actions on behalf of the impersonated user.
- **Attack Path:**
  1. Attacker calls `POST /api/help-tickets` with `{"email":"admin@community.com","subject":"Reset my password","message":"Please reset my password"}`.
  2. Ticket appears to come from the admin; support staff may act on it.
- **Evidence:** `src/app/api/help-tickets/route.ts:36`
- **Remediation:** Always use `session.email` for the ticket submitter. If the ability to submit on behalf of another is needed, restrict it to admin/PM roles.

---

### 15. Community listing (non-admin GET) has no authentication

- **Severity:** MEDIUM
- **Location:** `src/app/api/communities/public/route.ts`
- **Title:** Public community listing exposes all community names and locations without authentication.
- **Description:** The `GET` handler has no authentication check at all (lines 4-13). It calls `listCommunities()` and returns `id`, `name`, and `location` for every community on the platform.
- **Impact:** Information disclosure — an unauthenticated attacker can enumerate all communities on the platform, their IDs, names, and geographic locations. This enables targeted attacks against specific communities.
- **Attack Path:**
  1. Unauthenticated request to `GET /api/communities/public`.
  2. Response lists all communities with IDs, names, and locations.
- **Evidence:** `src/app/api/communities/public/route.ts:4-13`
- **Remediation:** If public listing is intentional (e.g., for registration), ensure community IDs are not directly usable for other API calls. If not intended, add authentication. At minimum, do not expose internal IDs.

---

### 16. Search endpoint exposes member emails to non-admin users

- **Severity:** MEDIUM
- **Location:** `src/app/api/search/route.ts`
- **Title:** Search results include member email addresses for all roles, not just admins.
- **Description:** The search results (lines 77-83) include `meta: m.email` for member search results, visible to all authenticated users regardless of role. This leaks member email addresses through a search interface, bypassing any directory opt-out controls.
- **Impact:** PII exposure — any authenticated user can harvest member email addresses by searching for names.
- **Attack Path:**
  1. Authenticated user calls `GET /api/search?q=john`.
  2. Response includes matching members with their email addresses in `meta`.
- **Evidence:** `src/app/api/search/route.ts:77-83`
- **Remediation:** Only include member emails in search results for admin/PM roles. For regular members, show only the member name.

---

### 17. Tram driver creation uses hardcoded default PIN "1234"

- **Severity:** MEDIUM
- **Location:** `src/app/api/tram/drivers/route.ts`
- **Title:** New tram drivers are created with default PIN "1234" if none is provided.
- **Description:** Line 52 sets `pin: body.pin || "1234"` — if no PIN is provided, the driver account is created with the hardcoded default PIN. This PIN may be used for driver authentication to the tram system.
- **Impact:** Predictable credentials — any newly created driver account without an explicit PIN can be accessed with PIN "1234", allowing unauthorized access to driver functions.
- **Attack Path:**
  1. PM creates a driver without specifying a PIN.
  2. Driver is created with PIN "1234".
  3. Anyone who knows the driver ID and default PIN can authenticate as that driver.
- **Evidence:** `src/app/api/tram/drivers/route.ts:52`
- **Remediation:** Generate a random PIN on creation and deliver it securely, or require a PIN to be explicitly set.

---

### 18. Real estate POST has no role check — any member can create property listings

- **Severity:** MEDIUM
- **Location:** `src/app/api/real-estate/route.ts`
- **Title:** Real estate listing creation requires only authentication, no role validation.
- **Description:** The `POST` handler (line 278) only checks `if (!session)`. Any authenticated user, regardless of role (including providers or board members), can create real estate listings. There's no content moderation on real estate listings unlike marketplace listings.
- **Impact:** Unauthorized listing creation — any user can post potentially fraudulent real estate listings visible to the community.
- **Attack Path:**
  1. Any authenticated user calls `POST /api/real-estate` with fabricated property details.
  2. Fake listing appears in the community's real estate section.
- **Evidence:** `src/app/api/real-estate/route.ts:278`
- **Remediation:** Add appropriate role checks. If member-created listings are intentional, add content moderation similar to the marketplace endpoint.

---

### 19. Favorites DELETE does not enforce ownership verification at the API layer

- **Severity:** MEDIUM
- **Location:** `src/app/api/favorites/route.ts`
- **Title:** Favorite deletion by ID relies on helper function for ownership but the ID is attacker-controlled.
- **Description:** The `DELETE` handler accepts a favorite `id` from query params (line 39) and passes it along with `session.email` to `removeFavorite`. While `removeFavorite` likely filters by email (needs verification), the pattern of accepting arbitrary IDs from the client and relying entirely on a downstream helper for authorization is fragile. If the helper's email check were ever removed or weakened during refactoring, this would become an IDOR.
- **Impact:** If the downstream helper does not properly scope by email, an attacker could delete other users' favorites.
- **Attack Path:**
  1. Attacker discovers another user's favorite ID.
  2. `DELETE /api/favorites?id={victimFavoriteId}`.
  3. If helper lacks email filter, favorite is deleted.
- **Evidence:** `src/app/api/favorites/route.ts:39-44`
- **Remediation:** Add explicit ownership verification in the route handler, not just in the downstream helper. The route should verify the favorite belongs to the session user before deletion.

---

### 20. Communities admin GET leaks all communities to any admin, not just super-admin

- **Severity:** MEDIUM
- **Location:** `src/app/api/communities/route.ts`
- **Title:** Non-super-admin admins without a `communityId` can see all communities.
- **Description:** The `GET` handler (lines 14-18) filters communities only when the admin has a `communityId` and is not a super admin. If `session.communityId` is null/undefined for a non-super-admin (e.g., during account setup), `isSuperAdmin` returns false but the filter `!session.communityId` evaluates true, resulting in all communities being returned.
- **Impact:** An admin who has not yet been assigned to a community (or whose `communityId` is null due to a bug) can view all communities on the platform.
- **Attack Path:**
  1. Admin user with null `communityId` (not a super-admin) calls `GET /api/communities`.
  2. `isSuperAdmin(session)` returns false, `!session.communityId` is true, so the fallback returns `all`.
  3. All communities are exposed.
- **Evidence:** `src/app/api/communities/route.ts:14-18`
- **Remediation:** Explicitly handle the case where admin is not super-admin and has no `communityId` — return empty or error rather than all communities.

---

*End of Report — 20 vulnerabilities identified (2 Critical, 10 High, 8 Medium)*
