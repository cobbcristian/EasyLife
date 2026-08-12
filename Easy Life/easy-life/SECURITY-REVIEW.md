# Security Review — API Routes

**Date:** 2026-08-12
**Scope:** All API route handlers under `src/app/api/`, plus supporting server libraries (`storage.ts`, `sms.ts`, `notify.ts`, `records.ts`, `auth.ts`).

---

## Executive Summary

The application uses Prisma ORM throughout, which parameterizes queries and effectively eliminates classical SQL injection. Session authentication (`getSession()`) is checked in every route handler. However, several **cross-tenant data isolation**, **authorization**, **input validation**, and **data exposure** issues exist that could allow authenticated users to access or modify data belonging to other communities or users.

---

## CRITICAL Findings

### 1. Cross-Tenant Data Leak — `listResidentDirectory` loads ALL member profiles

**File:** `src/lib/server/records.ts` (line 3523)
**Affected route:** `GET /api/directory` → `listResidentDirectory()`

```typescript
const [members, users, profiles] = await Promise.all([
  prisma.communityMember.findMany({ where: { communityId: cid }, ... }),
  prisma.user.findMany({ where: { communityId: cid } }),
  prisma.memberProfileExt.findMany(),   // ← NO communityId filter
]);
```

**Issue:** `prisma.memberProfileExt.findMany()` is called without any `where` clause, loading **every profile across all communities** into memory. While the downstream mapping joins on name/email of community-scoped users, the full dataset (phone numbers, addresses, dates of birth, unit numbers, directory opt-out preferences) is loaded server-side. This is a performance concern and a data-handling risk — any bug in the join logic could leak cross-tenant PII.

**Attack path:** Not directly exploitable from the API response today, but a refactoring error or logging addition could expose profiles from other communities. The in-memory dataset is unnecessarily broad.

**Recommendation:** Add `where: { userEmail: { in: users.map(u => u.email) } }` or join on community-scoped emails.

---

### 2. Missing Community Scoping — Blog Comments

**File:** `src/app/api/blog/[id]/comments/route.ts` (lines 15–16)
**Backend:** `src/lib/server/member-api-store.ts` (lines 433–438)

```typescript
// Route — no communityId check on the blog post itself
const { id } = await params;
return NextResponse.json({ comments: await listBlogComments(id) });

// Backend
export async function listBlogComments(blogId: string) {
  return prisma.blogComment.findMany({
    where: { postId: blogId },  // ← no communityId filter
    orderBy: { createdAt: "asc" },
  });
}
```

**Issue:** Any authenticated user from community A can read and post comments on blog posts belonging to community B by guessing/enumerating the blog post ID (a Prisma CUID). The `addBlogComment` function similarly has no community scoping.

**Attack path:** `POST /api/blog/<other-community-post-id>/comments` with `{ body: "spam" }` — the comment is created without verifying the blog post belongs to the caller's community.

**Recommendation:** Verify `blogPost.communityId === session.communityId` before allowing read or write on comments.

---

### 3. Missing Community Scoping — Group Posts, Likes, Comments

**File:** `src/app/api/groups/[groupId]/posts/route.ts` (lines 21, 56–64)
**Backend:** `src/lib/server/project-management.ts` (lines 235–255)

```typescript
// listGroupPosts — no communityId filter
const posts = await prisma.groupPost.findMany({
  where: { groupId },  // ← only groupId, no communityId
  ...
});
```

**Issue:** `listGroupPosts`, `toggleGroupPostLike`, and `addGroupPostComment` operate solely on `groupId` / `postId` without verifying the group belongs to the caller's community. An authenticated user can enumerate group IDs and interact with groups from other communities.

**Attack path:**
1. Discover a `groupId` from another community (CUIDs are not secret).
2. `GET /api/groups/<foreign-groupId>/posts` — reads all posts from the other community's group.
3. `POST` with `action: "like"` or `action: "comment"` — interacts with foreign content.

**Recommendation:** Verify `group.communityId === session.communityId` before any group post operation.

---

### 4. Missing Community Scoping — Group Invite

**File:** `src/app/api/groups/[groupId]/invite/route.ts` (lines 14–28)

```typescript
const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
// ← No check: group.communityId === session.communityId
await inviteToGroup(groupId, body.email.trim());
```

**Issue:** Any authenticated user can invite any email address to any group in any community, as long as they know the group ID. There is also no ownership check — the caller doesn't need to be the group owner or even a member.

**Attack path:** `POST /api/groups/<foreign-groupId>/invite` with `{ email: "attacker@example.com" }` — the attacker joins a group from another community.

**Recommendation:** Verify `group.communityId === session.communityId` AND that the caller is a group member or owner.

---

### 5. Missing Community Scoping — Group Membership Toggle

**File:** `src/app/api/groups/route.ts` (line 40)
**Backend:** `src/lib/server/member-api-store.ts` (lines 373–392)

```typescript
const group = await toggleGroupMembership(session.email, body.groupId);
```

**Issue:** `toggleGroupMembership` looks up the group by `groupId` alone without checking the group's `communityId`. A user from community A can join/leave groups in community B.

**Recommendation:** Add community scoping to `toggleGroupMembership`.

---

## HIGH Findings

### 6. Help Tickets — Weak Community Scoping on Read

**File:** `src/app/api/help-tickets/route.ts` (line 16)
**Backend:** `src/lib/server/records.ts` (lines 3096–3101)

```typescript
export async function listHelpTickets(communityId?: string | null) {
  return prisma.helpTicket.findMany({
    where: communityId
      ? { OR: [{ communityId }, { communityId: null }] }
      : undefined,   // ← if communityId is falsy, returns ALL tickets
    ...
  });
}
```

**Issue:** If `session.communityId` is `null` or `undefined` (e.g., a platform-level admin), `listHelpTickets` returns **all tickets across all communities** including community-specific ones. While this is gated behind `session.role === "admin"`, a platform admin without a community might see tickets containing sensitive member complaints from all tenants.

**Recommendation:** Ensure the query always filters to the admin's community scope, or provide explicit "super-admin" role separation.

---

### 7. Email Spoofing in Help Ticket Creation

**File:** `src/app/api/help-tickets/route.ts` (line 36)

```typescript
email: body.email ?? session.email,
```

**Issue:** The client can supply an arbitrary `email` field that overrides the session email. This allows a user to create help tickets impersonating another user's email address.

**Attack path:** `POST /api/help-tickets` with `{ subject: "Test", message: "...", email: "victim@example.com" }` — the ticket appears to come from the victim.

**Recommendation:** Always use `session.email` for the ticket creator email. Remove or ignore the client-supplied `email` field.

---

### 8. Stored XSS Vectors — No HTML Sanitization on User Content

**Affected files (all POST handlers that store user-supplied text):**
- `src/app/api/messages/route.ts` (line 67, `body.body`)
- `src/app/api/blog/route.ts` (line 27, `body.title`, `body.body`)
- `src/app/api/blog/[id]/comments/route.ts` (line 38, `body.body`)
- `src/app/api/announcements/route.ts` (line 42, `body.title`, `body.body`)
- `src/app/api/groups/[groupId]/posts/route.ts` (line 56, `body.text`)
- `src/app/api/groups/[groupId]/messages/route.ts` (line 33, `body.body`)
- `src/app/api/marketplace/route.ts` (line 83, `title`, `description`)
- `src/app/api/contact/route.ts` (line 19, `body.message`, `body.subject`)
- `src/app/api/help-tickets/route.ts` (line 33, `body.subject`, `body.message`)

**Issue:** User-supplied strings (`body`, `title`, `subject`, `message`, `description`) are stored in the database without any HTML sanitization or length limits. If the frontend renders these values using `dangerouslySetInnerHTML` or similar, this creates stored XSS.

**Mitigation:** Next.js React components escape content by default when using JSX `{variable}`. This is a **partial mitigation** — the risk materializes if any rendering path uses `dangerouslySetInnerHTML`, markdown-to-HTML conversion, or if content is served in non-React contexts (email, push notifications, admin dashboards).

**Recommendation:** Add server-side HTML sanitization (e.g., DOMPurify) for all user-generated content. Add length limits on all text fields.

---

### 9. Document URL Injection

**File:** `src/app/api/documents/route.ts` (line 58)

```typescript
url: body.url ?? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
```

**Issue:** Board/PM/admin users can set an arbitrary URL for a document. There is no validation that the URL points to a legitimate file host. This could be used to store `javascript:` URIs, data URIs, or links to phishing/malware sites that would be served to community members.

**Recommendation:** Validate that `body.url` starts with `https://` and belongs to an allowlisted domain, or reject external URLs entirely.

---

### 10. Marketplace Image/Video URL Injection

**File:** `src/app/api/marketplace/route.ts` (lines 45–46, 69–70, 134)

```typescript
const imageUrlField = String(form.get("imageUrl") ?? "").trim();
const videoUrlField = String(form.get("videoUrl") ?? "").trim();
// ...
imageUrl: body.imageUrl ?? null,
videoUrl: body.videoUrl ?? null,
```

**Issue:** Both form-data and JSON code paths accept arbitrary URLs for `imageUrl` and `videoUrl` without any validation. The file-upload path validates uploads, but the URL fields bypass all checks. An attacker could inject `javascript:` URIs or links to malicious content.

**Recommendation:** Validate URL format and restrict to `https://` with an allowlisted domain set.

---

## MEDIUM Findings

### 11. Hardcoded JWT Secret in Development

**File:** `src/lib/server/auth.ts` (lines 15–18)

```typescript
if (process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET must be set in production...");
}
return new TextEncoder().encode("easy-life-dev-secret-change-in-production");
```

**Issue:** The development JWT secret is hardcoded in the source code. If `NODE_ENV` is not explicitly set to `"production"` in a deployed environment, all sessions can be forged with this known secret.

**Mitigation:** Production check exists but relies on `NODE_ENV` being correctly set.

**Recommendation:** Log a prominent warning in non-production mode. Consider requiring `AUTH_SECRET` in all environments except explicitly local development.

---

### 12. Announcement Broadcast — No Rate Limiting

**File:** `src/app/api/announcements/route.ts` (lines 56–77)

```typescript
if (body.broadcast && session.communityId) {
  const members = await prisma.user.findMany({
    where: { communityId: session.communityId },
    select: { email: true },
  });
  for (const m of members.slice(0, 50)) {
    await sendEmail({ to: m.email, subject: body.title!, body: body.body! });
    // ...push notifications...
  }
}
```

**Issue:** Any user with `admin`, `board`, or `pm` role can trigger mass emails (up to 50) and push notifications per announcement. There is no rate limiting, cooldown, or confirmation step. A compromised board member account could spam all community members.

**Recommendation:** Add rate limiting per user per time window. Consider requiring a confirmation token or admin approval for broadcasts.

---

### 13. No Input Length Validation

**All POST routes** accept unbounded string inputs. Examples:
- Blog post `body` could be megabytes of text
- Announcement `body` is passed directly to email body
- Marketplace `description` has no cap
- Chat messages have no length limit

**Recommendation:** Add `maxLength` validation on all text inputs server-side. Suggested limits: titles (200 chars), bodies (10,000 chars), comments (2,000 chars).

---

### 14. Visitor Registration — Host Name Matching

**File:** `src/app/api/member/visitors/route.ts` (lines 17–26)

```typescript
const host = session.name.trim();
const visitors = await prisma.checkin.findMany({
  where: {
    communityId: session.communityId ?? undefined,
    type: "guest",
    host,    // ← matched by display name, not email/ID
  },
  ...
});
```

**Issue:** Visitors are scoped by `host` which is a display name string, not a unique identifier. If two members share the same name, they would see each other's visitors. This is a data leak between members within the same community.

**Recommendation:** Use `session.email` or `session.sub` as the host identifier instead of the display name.

---

### 15. Group Posts — `imageUrl` Accepts Arbitrary URLs

**File:** `src/app/api/groups/[groupId]/posts/route.ts` (line 63)

```typescript
imageUrl: body.imageUrl,
```

**Issue:** The `imageUrl` field in group post creation accepts any string without validation. No file upload is required — a user can supply any URL which will be stored and potentially rendered as an image.

**Recommendation:** Validate URLs or require file uploads through the storage pipeline.

---

## LOW Findings

### 16. Chat Messages Returned Without Filtering Sensitive Fields

**File:** `src/app/api/messages/threads/[id]/route.ts` (line 22)
**Backend:** `src/lib/server/local-pros.ts` (lines 491–496)

```typescript
export async function listChatMessages(threadId: string) {
  return prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
}
```

**Issue:** The entire `chatMessage` record is returned, including any internal fields like `id`, `authorEmail`. While not highly sensitive, this could leak email addresses of other community members to participants.

**Mitigation:** Chat participant verification (`assertChatParticipantInCommunity`) is correctly enforced before this query runs.

---

### 17. Payment Methods — Stripe Payment Method IDs Exposed

**Backend:** `src/lib/server/payment-methods.ts`

The `toDto` mapping should be checked to confirm it strips `stripePaymentMethodId` and `stripeCustomerId` from API responses. These are internal Stripe identifiers that should not be sent to the client.

---

### 18. Cookie Security — `secure` Flag Only in Production

**File:** `src/lib/server/auth.ts` (line 120)

```typescript
secure: process.env.NODE_ENV === "production",
```

**Issue:** Session cookies are not sent with the `Secure` flag in non-production environments. This is expected behavior but should be noted — if the application is served over HTTP in a staging environment, session tokens could be intercepted.

---

## Positive Observations (Mitigations Already Present)

1. **No SQL Injection:** Prisma ORM is used throughout, parameterizing all queries.
2. **Session Authentication:** Every route handler calls `getSession()` and returns 401 if null.
3. **Role-Based Access:** Multiple routes enforce role checks (admin, board, pm, member).
4. **Community Scoping (mostly):** The `scope()` helper in `records.ts` defaults missing community IDs to a sentinel value `"__missing_community__"`, preventing null community IDs from matching real data.
5. **File Upload Validation:** `storage.ts` validates MIME types, enforces size limits, and generates random filenames (preventing path traversal).
6. **Safe Filename Generation:** `safeExt()` restricts extensions to alphanumeric chars. `randomBytes(12)` prevents predictable filenames.
7. **Content Moderation:** Gallery and marketplace uploads go through `moderateUpload()`.
8. **Payment Method Ownership:** `setDefaultPaymentMethod` and `deletePaymentMethod` both verify `userEmail` matches before operating.
9. **Chat Community Scoping:** `assertChatParticipantInCommunity` correctly verifies both participation and community membership.
10. **DM Community Scoping:** `getOrCreateDmThread` calls `assertEmailsBelongToCommunity` to prevent cross-community DMs.

---

## Summary Table

| # | Severity | Category | File | Issue |
|---|----------|----------|------|-------|
| 1 | CRITICAL | Cross-tenant | `records.ts:3523` | `memberProfileExt.findMany()` loads all profiles globally |
| 2 | CRITICAL | Cross-tenant | `blog/[id]/comments/route.ts` | Blog comments have no community scoping |
| 3 | CRITICAL | Cross-tenant | `groups/[groupId]/posts/route.ts` | Group posts/likes/comments have no community scoping |
| 4 | CRITICAL | Cross-tenant | `groups/[groupId]/invite/route.ts` | Group invites have no community or ownership check |
| 5 | CRITICAL | Cross-tenant | `groups/route.ts` | Group join/leave has no community scoping |
| 6 | HIGH | Authorization | `help-tickets/route.ts` | Null communityId returns all tickets |
| 7 | HIGH | Spoofing | `help-tickets/route.ts:36` | Client can override ticket creator email |
| 8 | HIGH | XSS | Multiple POST routes | No HTML sanitization on stored user content |
| 9 | HIGH | Injection | `documents/route.ts:58` | Arbitrary URL stored for documents |
| 10 | HIGH | Injection | `marketplace/route.ts` | Arbitrary image/video URLs accepted |
| 11 | MEDIUM | Auth | `auth.ts:16` | Hardcoded dev JWT secret |
| 12 | MEDIUM | Abuse | `announcements/route.ts` | No rate limit on broadcast emails |
| 13 | MEDIUM | Validation | All POST routes | No input length validation |
| 14 | MEDIUM | Data leak | `member/visitors/route.ts` | Host matched by name, not unique ID |
| 15 | MEDIUM | Injection | `groups/[groupId]/posts/route.ts` | Arbitrary imageUrl accepted |
| 16 | LOW | Data exposure | `messages/threads/[id]/route.ts` | Full chat message records returned |
| 17 | LOW | Data exposure | `payment-methods.ts` | Verify Stripe IDs are stripped from responses |
| 18 | LOW | Config | `auth.ts:120` | Cookie `secure` flag only in production |
