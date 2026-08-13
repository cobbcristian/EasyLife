# Security Audit Findings — EasyLife Application

**Date:** 2026-08-13  
**Scope:** Amenities, dining, HOA/dues, maintenance/packages, groups, commissions/sales, admin endpoints, SSO/OAuth, webhooks

---

## Finding 1: Amenity DELETE — No Community Scoping

**File:** `src/app/api/amenities/[id]/route.ts` (lines 46–58)  
**Underlying function:** `src/lib/server/records.ts` (line 2104–2106)

### Description
The `DELETE /api/amenities/[id]` handler verifies the caller is an `admin` but does **not** verify that the amenity belongs to the caller's community. The underlying `deleteAmenity(id)` function performs `prisma.amenity.delete({ where: { id } })` with no community filter.

### Attack Path
1. Attacker authenticates as a community admin (community A).
2. Attacker obtains or guesses an amenity ID belonging to community B (IDs are UUIDs but may be leaked via listing endpoints or predictable in demo seeds).
3. `DELETE /api/amenities/{victimAmenityId}` permanently removes the amenity from community B.

### Impact
- **Severity: High** — Cross-tenant destructive action. A community admin can delete amenities from other communities.
- Data loss; removed amenity cannot be recovered without DB restore.

### Existing Mitigations
None. The route only checks `session.role !== "admin"`.

---

## Finding 2: Amenity PATCH (Playability) — No Community Ownership Verification

**File:** `src/app/api/amenities/[id]/route.ts` (lines 6–44)  
**Underlying function:** `src/lib/server/records.ts` (lines 1798–1823)

### Description
The PATCH handler passes `session.communityId` to `setAmenityPlayability`, but the underlying function **does not compare** it against the amenity's actual `communityId`. It fetches the amenity by ID alone (`findUnique({ where: { id } })`), then updates it regardless of community.

### Attack Path
1. Admin/PM/board member from community A calls `PATCH /api/amenities/{communityB_amenityId}` with `{ playable: false, reason: "Closed" }`.
2. The amenity in community B is marked unplayable, preventing all bookings.

### Impact
- **Severity: Medium** — Cross-tenant modification (non-destructive but disruptive). Denies service to another community's members.

### Existing Mitigations
The `communityId` is passed but unused for authorization.

---

## Finding 3: Amenity Availability — No Community Scoping

**File:** `src/app/api/amenities/[id]/availability/route.ts` (lines 1–26)  
**Underlying function:** `src/lib/server/records.ts` (lines 1875–1895)

### Description
`GET /api/amenities/{id}/availability?date=...` fetches availability for any amenity ID without verifying the authenticated user belongs to the same community as the amenity.

### Attack Path
1. Authenticated user from community A requests availability for an amenity in community B.
2. Returns booking slots and existing bookings (member names, times) from community B.

### Impact
- **Severity: Low** — Information disclosure of booking schedules in other communities.

### Existing Mitigations
None.

---

## Finding 4: Package DELETE — Cross-Tenant Deletion

**File:** `src/app/api/packages/[id]/route.ts` (lines 55–69)

### Description
The `DELETE /api/packages/[id]` handler checks that the user is `admin` or `pm` but performs `prisma.package.delete({ where: { id } })` **without any community scoping**. An admin/PM from one community can delete package records from another community.

### Attack Path
1. Admin from community A learns or guesses a package ID from community B.
2. `DELETE /api/packages/{victimPackageId}` permanently deletes the record.

### Impact
- **Severity: High** — Cross-tenant destructive action. Package tracking data for another community is permanently lost.

### Existing Mitigations
None. Only role check is performed.

---

## Finding 5: Package PATCH — Cross-Tenant Status Manipulation

**File:** `src/app/api/packages/[id]/route.ts` (lines 5–53)

### Description
The PATCH handler checks if the user is staff (`admin/pm/board`) OR the owner (`pkg.memberEmail === session.email`). For staff users, there is **no community check** — a staff member from community A can update package status for packages in community B.

### Attack Path
1. PM from community A calls `PATCH /api/packages/{communityB_packageId}` with `{ status: "picked_up" }`.
2. The package record in community B is fraudulently marked as picked up.

### Impact
- **Severity: Medium** — Cross-tenant data manipulation. Could cause confusion about package delivery status in another community.

### Existing Mitigations
None.

---

## Finding 6: Group Membership — Cross-Tenant Join/Leave

**File:** `src/app/api/groups/route.ts` (lines 36–43)  
**Underlying function:** `src/lib/server/member-api-store.ts` (lines 373–402)

### Description
When a user POSTs with a `groupId` (join/leave action), `toggleGroupMembership(email, groupId)` does not verify the group belongs to the user's community. The function fetches the group by ID alone and toggles membership regardless of community.

### Attack Path
1. Member from community A obtains a `groupId` belonging to community B.
2. `POST /api/groups` with `{ groupId: "community-B-group-id" }` — user joins the group.
3. User can now access group posts, messages, and participate in community B's social groups.

### Impact
- **Severity: Medium** — Cross-tenant access to social features. Unauthorized participation in another community's groups, access to private group discussions.

### Existing Mitigations
The `listGroupsForMember` query is community-scoped (so the group won't appear in listings), but direct ID access bypasses this.

---

## Finding 7: Group Invite — No Community or Ownership Verification

**File:** `src/app/api/groups/[groupId]/invite/route.ts` (lines 6–36)  
**Underlying function:** `src/lib/server/member-api-store.ts` (lines 424–431)

### Description
Any authenticated user can invite anyone to any group by providing a `groupId`. The handler verifies the group exists (`findUnique`) but does NOT verify:
1. The caller belongs to the group.
2. The caller is the group owner/admin.
3. The group belongs to the caller's community.

### Attack Path
1. User from community A invites arbitrary email addresses into community B's groups.
2. Or: Any member can force-add other users to groups they don't manage.

### Impact
- **Severity: Medium** — Cross-tenant social manipulation; privacy violation. Anyone can force group membership on others.

### Existing Mitigations
None.

---

## Finding 8: Group Posts — Cross-Tenant Read Access

**File:** `src/app/api/groups/[groupId]/posts/route.ts` (lines 12–23)  
**Underlying function:** `src/lib/server/project-management.ts` (lines 235–250)

### Description
`GET /api/groups/{groupId}/posts` fetches posts for any `groupId` with no community scoping. `listGroupPosts(groupId, viewerEmail)` queries by `groupId` alone.

### Attack Path
1. Authenticated user from community A requests posts from a community B group.
2. All posts, comments, likes, author emails, and names are returned.

### Impact
- **Severity: Medium** — Information disclosure of social content and member PII (emails, names) from other communities.

### Existing Mitigations
None.

---

## Finding 9: Checkout — Arbitrary Charge ID Mark-as-Paid

**File:** `src/app/api/checkout/route.ts` (lines 81–83, 100–109)

### Description
The `/api/checkout` endpoint accepts a `chargeId` in the request body. In both "stored payment" mode (line 81) and "demo" mode (line 101), after a successful payment, it calls `afterChargePaid(body.chargeId)` which calls `updateMemberChargeStatus(chargeId, "paid")`. There is **no verification that the chargeId belongs to the authenticated user or their community**.

### Attack Path
1. Attacker authenticates as any member.
2. Sends `POST /api/checkout` with `{ amount: 0.01, chargeId: "victim-charge-id" }`.
3. In demo mode (non-production), the charge is marked paid regardless of amount mismatch.
4. In stored-payment mode: if the attacker's own stored card is charged $0.01, the **victim's** charge (potentially thousands in HOA dues) is simultaneously marked paid.

### Impact
- **Severity: Critical** — Financial fraud. Attacker can settle arbitrary charges from any community for pennies. HOA dues, guest fees, service charges, and other financial obligations can be fraudulently discharged.

### Existing Mitigations
- In production with Stripe, the success_url includes the chargeId but actual payment confirmation should go through the webhook. However, the code also marks paid locally on stored-payment success (line 81).
- Demo mode bypasses all payment verification.

---

## Finding 10: Mobile Payment — Arbitrary Service Request Completion

**File:** `src/app/api/mobile/payment/route.ts` (lines 45–52)

### Description
The mobile payment endpoint accepts a `serviceRequestId` in the body and marks it `completed` via `prisma.serviceRequest.update` with no ownership or community verification. Any authenticated mobile user can close any service request.

### Attack Path
1. Attacker authenticates on mobile.
2. `POST /api/mobile/payment` with `{ serviceRequestId: "any-id", amount: 0 }`.
3. The service request (from any user, any community) is marked completed.

### Impact
- **Severity: Medium** — Cross-tenant service disruption. Maintenance/service requests can be prematurely closed, causing issues for other communities' property management workflows.

### Existing Mitigations
The `.catch(() => null)` silently swallows errors, making the vulnerability harder to detect.

---

## Finding 11: Grab-Go Kiosk API — Open in Demo Mode

**File:** `src/app/api/grab-go/kiosk/route.ts` (lines 19–23)

### Description
The `authorizeMachine` function returns `true` when `GRAB_GO_MACHINE_KEY` is not set (demo mode). This means the entire kiosk API (open sessions, record grabs, close and charge) is unauthenticated when the env var is unset.

### Attack Path
1. In any environment without `GRAB_GO_MACHINE_KEY` (dev, staging, demo):
2. Attacker directly calls `POST /api/grab-go/kiosk` with `{ action: "open", machineCode: "...", unlockMethod: "member_number", memberNumber: "..." }`.
3. Attacker opens sessions on behalf of other members, records fake grabs, and triggers charges.

### Impact
- **Severity: High** — Unauthenticated access to financial operations. Can charge arbitrary members for grab-go purchases they never made.

### Existing Mitigations
Comment says "In production, protect with a machine API key header" but there is no enforcement — relies solely on env var being set.

---

## Finding 12: Cron Endpoint — Unauthenticated in Non-Production

**File:** `src/app/api/cron/reminders/route.ts` (lines 9–27)  
**Auth function:** `src/lib/server/cron-auth.ts` (lines 1–16)

### Description
The cron reminder endpoint (`GET /api/cron/reminders`) is unauthenticated when `CRON_SECRET` is not set and `NODE_ENV !== "production"`. Anyone can trigger reminder processing, dependent membership aging, and rejoin reminders.

### Attack Path
1. In staging/development/preview environments without `CRON_SECRET`:
2. Anyone calls `GET /api/cron/reminders`.
3. Processing runs, potentially sending notifications and modifying membership states.

### Impact
- **Severity: Low** — Trigger unwanted side effects (spam notifications, premature membership state changes) in non-production environments.

### Existing Mitigations
Production requires `CRON_SECRET`. The response includes a warning note when unsecured.

---

## Finding 13: Admin Users POST — Community Admin Can Create Super Admin

**File:** `src/app/api/admin/users/route.ts` (lines 45–114)

### Description
A community-scoped admin (`session.role === "admin"` with a `communityId`) can create new users. While line 77 restricts `communityId` override to super admins, the `role` parameter is not restricted. A community admin can create a user with `role: "admin"` and `communityId` will be forced to their own community — but this still creates additional admins who could potentially escalate if the community admin is later changed to super admin.

More critically: since `ALLOWED_ROLES` includes `"sales"`, a community admin can create `sales` role users. Sales users get cross-community data visibility in `/api/sales` and `/api/sales/commissions` (all salespeople are listed for a sales user).

### Attack Path
1. Community admin creates a user with `role: "sales"` in their community.
2. Login as that sales user → `GET /api/sales` → sees all salespeople across the platform.

### Impact
- **Severity: Medium** — Privilege escalation pathway. Community admin can create sales users who can view cross-tenant sales data.

### Existing Mitigations
Sales users still need `findSalespersonByUserId` to match, but the user list exposes `listSalespeople()` to all sales-role users (line 32).

---

## Finding 14: Admin `backfill-brand-images` — Any Admin Can Trigger

**File:** `src/app/api/admin/backfill-brand-images/route.ts` (lines 6–14)

### Description
The endpoint only checks `session.role !== "admin"` — any community admin can trigger brand image backfill across all communities, not just super admins.

### Attack Path
1. Community admin calls `POST /api/admin/backfill-brand-images`.
2. The `backfillBrandImages()` function runs across all communities.

### Impact
- **Severity: Low** — Not destructive but allows a community admin to trigger platform-wide operations that should be super-admin only.

### Existing Mitigations
None.

---

## Summary Table

| # | Area | Severity | Type | Cross-Tenant |
|---|------|----------|------|--------------|
| 1 | Amenities DELETE | High | Destructive | Yes |
| 2 | Amenities PATCH | Medium | Manipulation | Yes |
| 3 | Amenity Availability | Low | Info Disclosure | Yes |
| 4 | Package DELETE | High | Destructive | Yes |
| 5 | Package PATCH | Medium | Manipulation | Yes |
| 6 | Groups join/leave | Medium | Unauthorized Access | Yes |
| 7 | Groups invite | Medium | Social Manipulation | Yes |
| 8 | Group posts read | Medium | Info Disclosure | Yes |
| 9 | Checkout chargeId | Critical | Financial Fraud | Yes |
| 10 | Mobile payment | Medium | Service Disruption | Yes |
| 11 | Grab-Go kiosk | High | Unauthed Financial | N/A (config) |
| 12 | Cron reminders | Low | Unauthed Trigger | N/A (config) |
| 13 | Admin user creation | Medium | Privilege Escalation | Partial |
| 14 | Brand image backfill | Low | Scope Bypass | Yes |

---

## Recommended Remediations

1. **Amenity operations:** Add `communityId` filter to `deleteAmenity` and verify community match in `setAmenityPlayability`.
2. **Package operations:** Add `communityId` filter to PATCH and DELETE queries.
3. **Group operations:** Verify `group.communityId === session.communityId` before join, invite, and read operations.
4. **Checkout:** Verify `chargeId` belongs to `session.email` and `session.communityId` before marking paid; validate amount matches.
5. **Mobile payment:** Verify `serviceRequestId` belongs to the user before updating status.
6. **Grab-Go kiosk:** Fail closed when `GRAB_GO_MACHINE_KEY` is not set (reject requests instead of allowing all).
7. **Admin backfill:** Require `isSuperAdmin(session)` check.
8. **Admin user creation:** Restrict which roles a community admin can create (exclude `sales`).
