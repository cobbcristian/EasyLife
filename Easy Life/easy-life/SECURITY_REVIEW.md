# Security Review Report

**Date:** 2026-08-12
**Scope:** Authentication, authorization, OAuth, MFA, session management, rate limiting, calendar feeds, proxy/middleware, and infrastructure configuration.

---

## CRITICAL Findings

### 1. Hardcoded Super Admin Credentials Exposed in URL (Credential Leak)

**File:** `src/proxy.ts` lines 191–196
**Severity:** CRITICAL

```typescript
if (pathname === "/go/superadmin" || pathname === "/go/superadmin/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("email", "superadmin@gmail.com");
    url.searchParams.set("password", "password");
    const redirect = NextResponse.redirect(url);
```

**Attack path:** Any visitor navigating to `/go/superadmin` is redirected to `/login?email=superadmin@gmail.com&password=password`. The super admin email and password are hardcoded in source code and appear as query parameters in the redirect URL. Query parameters are logged by web servers, CDNs (Vercel edge logs), browser history, and Referer headers.

**Impact:** Full platform takeover. The super admin account has no community restriction (`communityId` is null), so `homeForRole` sends it to `/super-admin` with unrestricted access.

**Mitigation present:** None.

---

### 2. Plaintext Password Comparison Fallback (Authentication Bypass via Known Seeds)

**File:** `src/lib/server/password.ts` lines 133–134
**Severity:** CRITICAL

```typescript
// Backwards-compat: allow plaintext seeds that haven't been hashed.
return password === stored;
```

**Attack path:** If any user record in the database still has a plaintext password (e.g., from initial seeding, migration, or import), authentication succeeds via a non-constant-time string comparison (`===`). Combined with Finding #1 (super admin uses `password` as plaintext), any seeded account with a simple password is vulnerable.

**Impact:** Authentication bypass for any account with an unhashed password. Additionally, `===` is not timing-safe, enabling timing side-channel attacks to infer password characters one byte at a time.

**Mitigation present:** `passwordNeedsRehash` triggers rehashing on next login, but only if the user actually logs in. Stale seeded accounts remain vulnerable indefinitely.

---

### 3. Hardcoded Fallback JWT Signing Key (Token Forgery)

**File:** `src/lib/server/auth.ts` lines 8–18 and `src/lib/server/mfa.ts` lines 9–16 and `src/lib/server/calendar-feed.ts` lines 9–19
**Severity:** CRITICAL (in production if AUTH_SECRET is unset or leaked)

All three files share the same fallback pattern:

```typescript
function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}
```

**Attack path:** If `AUTH_SECRET` is not set (no `.env` files exist in the repo), all JWTs (session tokens, MFA tokens, calendar feed tokens, password reset tokens) are signed with the hardcoded string `"easy-life-dev-secret-change-in-production"`. An attacker who knows this string (it's in public source code) can forge arbitrary session tokens for any user/role, including admin.

`auth.ts` does throw in production mode, but `mfa.ts` **does not** — it silently falls back to the hardcoded key regardless of `NODE_ENV`. This means even in production, if `AUTH_SECRET` is unset, MFA pending tokens and setup tokens can be forged.

**Impact:** Complete authentication bypass — forge a session JWT with `role: "admin"` and any `sub`.

**Mitigation present:** `auth.ts` throws in production if `AUTH_SECRET` is unset. `calendar-feed.ts` also throws in production. `mfa.ts` does NOT throw and silently uses the dev key.

---

## HIGH Findings

### 4. Apple ID Token Not Signature-Verified (OAuth Identity Spoofing)

**File:** `src/lib/server/oauth.ts` lines 189–193 and 248
**Severity:** HIGH

```typescript
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}
```

Used at line 248:
```typescript
const payload = decodeJwtPayload(tokens.idToken);
```

**Attack path:** The Apple `id_token` is decoded by simply base64-decoding the payload section without verifying the JWT signature against Apple's public keys (JWKS). While the token is received over TLS from Apple's token endpoint (which provides some transport-level trust), this violates the OAuth/OIDC security model. If Apple's token endpoint ever returned a manipulated token, or if there's a man-in-the-middle at the server level, the email/sub claims would be trusted without cryptographic verification.

**Impact:** Potential account takeover if an attacker can influence the `id_token` contents. The risk is partially mitigated by the server-to-server TLS exchange, but OIDC best practice mandates signature verification.

---

### 5. No CSRF Protection on State-Changing POST Endpoints

**Files:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/change-password/route.ts`, `src/app/api/auth/mfa/setup/route.ts`, `src/app/api/auth/mfa/confirm/route.ts`, `src/app/api/auth/mfa/disable/route.ts`, `src/app/api/invites/member/route.ts`
**Severity:** HIGH

None of the POST endpoints implement CSRF protection (no CSRF tokens, no custom header checks, no `Origin`/`Referer` validation). The session cookie uses `sameSite: "lax"`, which protects against top-level cross-site POST (forms), but does NOT protect against:

- **Same-site attacks** from any subdomain (e.g., if an XSS exists on another page under the same eTLD+1)
- Requests from JavaScript on `SameSite=Lax` contexts where the browser policy is lenient

**Attack path:** An attacker hosting a malicious page on a same-site subdomain could submit POST requests to `/api/auth/change-password` with the victim's cookies attached, changing their password without their knowledge.

**Impact:** Password change, MFA disable, and member invite actions could be triggered without user consent.

**Mitigation present:** `SameSite=Lax` cookies block cross-site form submissions but not same-site or certain browser edge cases.

---

### 6. In-Memory Rate Limiter Easily Bypassed

**File:** `src/lib/server/rate-limit.ts` lines 1–22
**Severity:** HIGH

```typescript
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
```

**Bypass vectors:**

1. **Multi-instance / serverless:** In Vercel's serverless model, each cold start creates a new `Map()`. Rate limit state is lost between function invocations, making the rate limiter ineffective at scale.

2. **IP spoofing via `X-Forwarded-For`** (`clientIp` at line 19–21): The rate limiter keys on the first value of `X-Forwarded-For`, which can be spoofed if the app runs behind a proxy that doesn't strip/overwrite this header. An attacker can rotate the `X-Forwarded-For` value to bypass rate limits entirely.

   ```typescript
   export function clientIp(request: Request): string {
     const fwd = request.headers.get("x-forwarded-for");
     return fwd?.split(",")[0]?.trim() || "local";
   }
   ```

3. **Memory leak:** The `hits` Map grows unboundedly with no eviction. Over time (on long-lived processes), this leaks memory.

**Impact:** Brute-force attacks on login, MFA verify, and password change endpoints are not effectively rate-limited.

---

### 7. MFA Pending Token Reuse / No Audience Restriction

**File:** `src/lib/server/mfa.ts` lines 104–133
**Severity:** HIGH

The MFA pending token is a JWT with a 10-minute lifetime but:
- No `jti` (JWT ID) for single-use enforcement
- No audience (`aud`) claim
- Shares the same signing key as session tokens
- Purpose check (`payload.purpose !== "mfa-pending"`) prevents cross-type use, but the token can be replayed within its 10-minute window

**Attack path:** If an attacker intercepts or obtains an `mfaToken` (e.g., via the response body of `/api/auth/login`), they can replay it multiple times within 10 minutes across different endpoints. The token is returned in the JSON response body (line 115-119 of `login/route.ts`), so it is visible in browser DevTools, proxy logs, and network captures.

**Mitigation present:** Token expiration (10 min) and purpose field.

---

### 8. Password Credentials Leaked in URL Query Parameters via `/go/` Routes

**File:** `src/proxy.ts` lines 206–212
**Severity:** HIGH

```typescript
const email = request.nextUrl.searchParams.get("email");
const password = request.nextUrl.searchParams.get("password");
...
if (email) url.searchParams.set("email", email);
if (password) url.searchParams.set("password", password);
```

**Attack path:** Beyond the superadmin route, all `/go/[tenant]` routes accept `email` and `password` as query parameters and forward them to the login page URL. These credentials appear in:
- Server access logs
- CDN/edge logs
- Browser history
- Referer headers sent to external resources
- Browser extensions that monitor URLs

**Impact:** Credential exposure for any user whose login is initiated via these demo/tenant URLs.

---

## MEDIUM Findings

### 9. Calendar Feed Tokens Have 2-Year Lifetime with No Revocation

**File:** `src/lib/server/calendar-feed.ts` lines 23–36
**Severity:** MEDIUM

```typescript
export async function createCalendarFeedToken(
  payload: CalendarFeedPayload,
): Promise<string> {
  return new SignJWT({...})
    .setExpirationTime("730d")
    .sign(getKey());
}
```

**Attack path:** Calendar feed tokens are valid for 730 days (2 years). If a token is leaked (URL sharing, email forwarding, browser history), the attacker has persistent read access to the user's calendar data. There is no mechanism to revoke individual tokens — the only way to invalidate all tokens is to rotate `AUTH_SECRET`, which invalidates all sessions and tokens globally.

**Impact:** Long-lived unauthorized access to user calendar data.

---

### 10. Session Tokens Not Invalidated on Password Change

**File:** `src/app/api/auth/change-password/route.ts`
**Severity:** MEDIUM

After a successful password change (line 47), the endpoint returns `{ ok: true }` but does not invalidate existing session tokens. Because sessions are stateless JWTs with a 7-day lifetime, an attacker who has compromised a session token retains access for up to 7 days after the user changes their password.

**Impact:** Compromised sessions survive password changes.

**Mitigation present:** None. No session revocation list or generation counter exists.

---

### 11. MFA Setup Endpoint Returns Secret in Response Body

**File:** `src/app/api/auth/mfa/setup/route.ts` lines 42–47
**Severity:** MEDIUM

```typescript
return NextResponse.json({
    setupToken,
    secret,
    otpauthUrl,
    qrDataUrl,
});
```

The raw TOTP `secret` is returned alongside the QR code and `otpauthUrl`. While this is somewhat standard (for manual entry), it means the secret is visible in:
- Browser DevTools network tab
- Any proxy/logging middleware
- Response caching layers

If an attacker captures this response, they can set up their own authenticator for the victim's account before the victim confirms enrollment.

---

### 12. MFA Disable Endpoint Has No Rate Limiting

**File:** `src/app/api/auth/mfa/disable/route.ts`
**Severity:** MEDIUM

Unlike the login (10 req/min) and MFA verify (15 req/min) endpoints, the MFA disable endpoint has no rate limiting. An attacker with a valid session could brute-force the TOTP code or recovery codes without being throttled.

**Impact:** Reduced time for brute-force attacks on the 6-digit TOTP code (1M possibilities).

**Mitigation present:** Requires the user's password AND a valid TOTP/recovery code, making brute-force harder but still possible without rate limiting.

---

### 13. Weak Password Policy

**File:** `src/app/api/auth/change-password/route.ts` line 35
**Severity:** MEDIUM

```typescript
if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
```

A 6-character minimum with no complexity requirements allows trivially weak passwords (e.g., `123456`, `qwerty`).

---

### 14. MFA Setup Token Contains TOTP Secret in JWT Payload

**File:** `src/lib/server/mfa.ts` lines 136–141
**Severity:** MEDIUM

```typescript
export async function createMfaSetupToken(userId: string, secret: string) {
  return new SignJWT({ purpose: "mfa-setup", sub: userId, secret })
    .setProtectedHeader({ alg: "HS256" })
    .sign(authKey());
}
```

The TOTP secret is embedded in the JWT payload. JWTs are signed but not encrypted — the payload is merely base64url-encoded and can be decoded by anyone who possesses the token. If the setup token is logged or intercepted, the TOTP secret is exposed.

---

### 15. OAuth State Cookie Not Cleared on Error Paths

**File:** `src/app/api/auth/oauth/[provider]/callback/route.ts` lines 174, 180–181
**Severity:** LOW-MEDIUM

When the OAuth callback returns an error (`url.searchParams.get("error")`), the response redirects to `/login?error=...` at line 174 but does not delete the state or provider cookies. These cookies persist for their full 600-second lifetime, potentially causing confusion on subsequent OAuth attempts.

---

## LOW Findings

### 16. Recovery Code Hash Uses SHA-256 (Not Key-Stretching)

**File:** `src/lib/server/mfa.ts` lines 50–51
**Severity:** LOW

```typescript
function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}
```

Recovery codes are hashed with a single SHA-256 pass. While recovery codes are random and have reasonable entropy (10 hex characters = ~40 bits), a key-stretching algorithm (bcrypt/scrypt) would provide better protection if the database is compromised.

---

### 17. Proxy Matcher Does Not Cover All API Routes Consistently

**File:** `src/proxy.ts` lines 223–253 and 310–407
**Severity:** LOW

The middleware matcher includes `/api/:path*` (line 406), but the internal logic only applies staging/auth checks to `/api/member/` and `/api/mobile/` prefixes (lines 236–253). Other API routes under `/api/` (e.g., `/api/auth/`, `/api/invites/`, custom routes) rely on individual endpoint-level auth checks rather than centralized middleware enforcement. This pattern is fragile — any new API endpoint without explicit auth checking would be unprotected.

---

### 18. No `Secure` Flag on Cookies in Development

**File:** `src/lib/server/auth.ts` line 120
**Severity:** LOW (development only)

```typescript
secure: process.env.NODE_ENV === "production",
```

In development (`NODE_ENV !== "production"`), cookies are sent over plain HTTP. This is expected behavior but worth noting that local development with HTTPS proxies still sends cookies insecurely.

---

## INFORMATIONAL

### 19. OAuth Mobile Deep Link Exposes JWT in URL

**File:** `src/app/api/auth/oauth/[provider]/callback/route.ts` lines 122–124
**Severity:** INFORMATIONAL

```typescript
const deep = new URL("plaza-oceanside://oauth");
deep.searchParams.set("token", token);
```

The session JWT is passed as a query parameter in the deep link URL. While deep links are generally not logged the same way HTTP URLs are, the token could appear in system logs or be intercepted by other apps registered for the same URL scheme.

### 20. Invite Code Returned in API Response

**File:** `src/app/api/invites/member/route.ts` lines 48–49

The community invite code is returned in the JSON response even when email is not configured. While this is intentional (for manual sharing), it means the invite code is exposed in client-side JavaScript and browser DevTools.

---

## Summary of Mitigations Already Present

| Control | Status |
|---|---|
| Session cookies `httpOnly` | ✅ Set |
| Session cookies `sameSite: lax` | ✅ Set |
| Session cookies `secure` in production | ✅ Set |
| OAuth state parameter validation | ✅ Implemented correctly for GET and POST callbacks |
| OAuth state stored in httpOnly cookie | ✅ Good practice |
| Rate limiting on login endpoint | ⚠️ In-memory only, easily bypassed |
| Rate limiting on MFA verify | ⚠️ In-memory only, easily bypassed |
| Rate limiting on password change | ⚠️ In-memory only, easily bypassed |
| TOTP verification with `otplib` | ✅ Uses standard library |
| Recovery code timing-safe comparison | ✅ Uses `timingSafeEqual` |
| Password hashing (scrypt) | ✅ For new/rehashed passwords |
| MFA requires password to disable | ✅ Good practice |
| JWT purpose field prevents cross-type use | ✅ Implemented |
| Frozen/pending account checks | ✅ Implemented in login and OAuth flows |
| Staging mode blocking | ✅ Implemented in proxy and login |

---

## Recommended Remediations (Priority Order)

1. **CRITICAL:** Remove hardcoded superadmin credentials from `proxy.ts` immediately. Replace with an admin-only authenticated setup flow.
2. **CRITICAL:** Remove plaintext password fallback in `password.ts`. Force-rehash all remaining plaintext passwords via a migration script.
3. **CRITICAL:** Ensure `mfa.ts` throws when `AUTH_SECRET` is unset in production (match `auth.ts` behavior).
4. **HIGH:** Verify Apple `id_token` signature using Apple's JWKS endpoint.
5. **HIGH:** Replace in-memory rate limiter with Redis/Upstash or Vercel KV for production.
6. **HIGH:** Add CSRF token validation or custom header checks on all state-changing POST endpoints.
7. **HIGH:** Stop passing credentials as URL query parameters in `/go/` routes.
8. **MEDIUM:** Invalidate sessions on password change (add a generation counter or token revocation list).
9. **MEDIUM:** Add calendar feed token revocation capability.
10. **MEDIUM:** Encrypt MFA secrets in the JWT setup token or use server-side storage.
11. **MEDIUM:** Strengthen password policy (minimum 8 characters, complexity rules or breach-check).
12. **MEDIUM:** Add rate limiting to the MFA disable endpoint.
