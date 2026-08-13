# Security Audit Report — API Endpoints

**Date:** 2026-08-13
**Scope:** `/src/app/api/` routes and `/src/lib/server/records.ts`

---

## Finding 1: Client-Controlled Guest Fee Amount — Financial Manipulation

**Severity: HIGH**
**File:** `src/app/api/guest-fees/route.ts`, lines 101–104
**Function:** `POST` handler

### Vulnerability

The guest fee amount is accepted directly from the client request body and used to create a real billable charge. If the client provides `body.amount`, it overrides the server-side preset fee entirely:

```typescript
const amount =
    typeof body.amount === "number" && body.amount > 0
      ? body.amount
      : preset.amount;
```

The only validation is `typeof body.amount === "number" && body.amount > 0`, which allows any positive number — including `0.01` or `999999`.

### Attack Path

1. Attacker authenticates as any user with role `pm`, `admin`, or `board`.
2. Attacker calls `POST /api/guest-fees` with `{ "guestName": "...", "guestEmail": "victim@example.com", "amount": 0.01 }`.
3. A real `MemberCharge` is created in the database at `$0.01` instead of the preset `$25`/`$50`.
4. Alternatively, the attacker can set `amount: 99999` to create a fraudulent overcharge against any guest email.
5. The charge record includes a `payToken` and generates a live payment URL (`/pay/guest/<token>`).

### Why Existing Controls Don't Prevent It

- The role check (`canManageGuestFees`) only gates access — it does not validate the amount.
- There is no upper or lower bound on the amount beyond `> 0`.
- There is no audit trail or approval step for amounts that deviate from presets.

### Recommendation

Remove client-side amount override or constrain it to exactly the preset values. If custom amounts are needed, add admin-level approval or at minimum enforce `amount >= preset.amount` and a reasonable ceiling.

---

## Finding 2: `listTemplates()` Has No Community Scoping — Cross-Tenant Data Leak

**Severity: HIGH**
**Files:**
- `src/app/api/templates/route.ts`, lines 7–14 (GET) and lines 16–32 (POST)
- `src/lib/server/records.ts`, lines 2700–2706

### Vulnerability

The `listTemplates()` function queries ALL `ContentTemplate` rows globally with zero filtering:

```typescript
export async function listTemplates() {
  return prisma.contentTemplate.findMany({ orderBy: { name: "asc" } });
}
```

The `ContentTemplate` model itself has no `communityId` field at all (schema line 512–517). Similarly, `createTemplate()` inserts rows with no community association.

The API route only requires `role === "admin"`, so any admin from any community sees every template created by every other community's admin, and can create templates visible to all.

### Attack Path

1. Attacker registers or gains access as an admin for community A.
2. `GET /api/templates` returns templates created by admins of communities B, C, D, etc.
3. This leaks internal operational content (template names, subjects, channels) across tenants.
4. Attacker can also `POST /api/templates` to inject templates that will appear in other communities' admin panels.

### Why Existing Controls Don't Prevent It

- The role check `session.role !== "admin"` only verifies the caller is *some* admin — not that they belong to the same community.
- Neither the database model nor the query function accepts or filters by `communityId`.

### Recommendation

Add a `communityId` column to `ContentTemplate`. Filter by `session.communityId` in both list and create operations. Require `communityId` to be set on every template.

---

## Finding 3: `listHelpTickets()` Leaks Tickets Across Communities

**Severity: HIGH**
**Files:**
- `src/app/api/help-tickets/route.ts`, lines 10–17 (GET) and lines 19–48 (POST)
- `src/lib/server/records.ts`, lines 3096–3102

### Vulnerability

The `listHelpTickets` query uses an `OR` clause that returns tickets with `communityId: null` to ALL communities:

```typescript
export async function listHelpTickets(communityId?: string | null) {
  return prisma.helpTicket.findMany({
    where: communityId ? { OR: [{ communityId }, { communityId: null }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
```

When `communityId` is `null`/`undefined`, the query returns ALL tickets from ALL communities with no filter at all (`where: undefined`).

Additionally, `createHelpTicket` sets `communityId: input.communityId ?? null`, so tickets from members without a community set are created with `communityId: null` and become visible to every community's admin.

### Attack Path

1. An admin from community A calls `GET /api/help-tickets`.
2. If `session.communityId` is null (which is possible for platform-level admins, see `auth.ts` line 34), the query has no `where` clause — returning all 100 most recent tickets from every community.
3. Even when `communityId` is set, the `OR [{ communityId }, { communityId: null }]` causes community A admins to see null-community tickets that may contain sensitive information from other communities' members.
4. A member who submits a help ticket without a `communityId` on their session leaks their ticket (with their name, email, message) to every community admin.

### Why Existing Controls Don't Prevent It

- The role check only requires `admin` — no community ownership verification.
- The `communityId: null` catch-all in the OR clause was likely intended for unscoped tickets but creates a cross-tenant data leak.

### Recommendation

Remove the `{ communityId: null }` arm from the OR clause, or route null-community tickets to a super-admin-only view. Enforce strict community scoping: `where: { communityId }` (not optional).

---

## Finding 4: `listReservationsForMember()` Has No Community Scoping

**Severity: HIGH**
**Files:**
- `src/app/api/reservations/route.ts`, lines 10–15 (GET)
- `src/lib/server/records.ts`, lines 3441–3446

### Vulnerability

The `listReservationsForMember` function filters only by `memberEmail`:

```typescript
export async function listReservationsForMember(email: string) {
  return prisma.restaurantReservation.findMany({
    where: { memberEmail: email },
    orderBy: { createdAt: "desc" },
  });
}
```

If a user has the same email across multiple communities, they would see reservations from all communities. More importantly, `createReservation` stores a `communityId` on each reservation record, but the list query ignores it entirely — there is no community isolation on read.

The API route (line 13) calls `listReservationsForMember(session.email)` without passing `session.communityId`.

### Attack Path

1. User signs into community A.
2. Calls `GET /api/reservations`.
3. Receives all reservations for their email across every community they're a member of (or that shares the same email key).
4. If a multi-community user exists, they see reservation details (restaurant names, party sizes, dates/times) from another community's dining context — leaking community-specific operations.

### Why Existing Controls Don't Prevent It

- Auth check only verifies the user is logged in — not scoped to a specific community.
- The data layer function does not accept or filter by `communityId`.

### Recommendation

Pass `session.communityId` to `listReservationsForMember` and add it as a `where` clause filter.

---

## Finding 5: Guest Fee Charge Created for Arbitrary Email Without Rate Limiting

**Severity: HIGH**
**File:** `src/app/api/guest-fees/route.ts`, lines 68–146

### Vulnerability

The `POST /api/guest-fees` endpoint creates a `MemberCharge` record and a payment URL for any email address provided in `body.guestEmail`. There is:
- No verification the email belongs to a real person
- No rate limiting on charge creation
- No maximum number of outstanding charges
- The `payToken` is a random 16-byte hex token, but the payment URL is publicly accessible (`/pay/guest/<token>`)

Combined with Finding 1 (client-controlled amount), a privileged user (pm/admin/board) can generate unlimited billable invoices to any email at any amount.

### Attack Path

1. Attacker authenticates with `pm`, `admin`, or `board` role.
2. Repeatedly calls `POST /api/guest-fees` with different `guestEmail` values and high `amount` values.
3. Each call creates a real `MemberCharge` in the database and a publicly accessible payment URL.
4. Attacker can harvest the payment URLs and use social engineering to get victims to pay.
5. No audit trail distinguishes legitimate from abusive charges.

### Why Existing Controls Don't Prevent It

- Role check exists but does not throttle or cap charge creation.
- `guestEmail` is only validated for format (`includes("@")`) — no domain verification or existence check.
- There is no approval workflow or audit review for charges.

### Recommendation

Add rate limiting per session/IP. Require a second admin to approve charges above a threshold. Log all charge creation events for audit. Consider email verification before generating payment URLs.

---

## Summary

| # | Finding | Severity | File(s) |
|---|---------|----------|---------|
| 1 | Client-controlled guest fee amount | HIGH | `guest-fees/route.ts:101-104` |
| 2 | Templates have no community scoping | HIGH | `templates/route.ts`, `records.ts:2700-2706` |
| 3 | Help tickets leak across communities | HIGH | `help-tickets/route.ts:10-17`, `records.ts:3096-3102` |
| 4 | Reservations have no community scoping | HIGH | `reservations/route.ts:10-15`, `records.ts:3441-3446` |
| 5 | Unlimited unvalidated guest fee charges | HIGH | `guest-fees/route.ts:68-146` |

### Endpoints Reviewed with No HIGH/CRITICAL Findings

- **`member/hoa-dues/route.ts`** — Amount is server-computed, properly scoped by communityId.
- **`member/hoa-checkout/route.ts`** — Amount resolved server-side via `resolveHoaPaymentForMember`, not client-controlled.
- **`member/payment-methods/route.ts`** — Scoped by `session.email`, demo mode gated properly.
- **`member/payment-methods/[id]/route.ts`** — Operations scoped by `session.email`.
- **`member/payment-settings/route.ts`** — Scoped by `session.email`, validates preference enum.
- **`member/household/route.ts`** — Validates sponsor relationship before allowing dependent updates.
- **`stripe/subscription-checkout/route.ts`** — Plan is validated server-side by `createProviderSubscriptionCheckout`.
- **`stripe/connect/route.ts`** — Requires `provider` role, creates fresh Stripe account.
- **`stripe/billing-portal/route.ts`** — Requires `provider` role, scoped by email.
- **`newsletters/route.ts`** — Properly scoped by `session.communityId` via `listNewsletters`.
- **`vehicles/route.ts`** — Scoped by `session.sub` (userId).
- **`vehicles/[id]/route.ts`** — `deleteVehicle` verifies `userId` ownership.
- **`pets/route.ts`** — Scoped by `session.sub` (userId).
- **`maintenance-tasks/route.ts`** — Properly scoped by `session.communityId`.
