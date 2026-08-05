# The Plaza at Oceanside — Store publish guide

**App name:** The Plaza at Oceanside  
**Bundle / package:** `com.easylife.oceanside`  
**Scope:** Oceanside residents only  
**API:** `https://easy-life-peach-two.vercel.app`  
**Privacy:** https://easy-life-peach-two.vercel.app/privacy  

This folder is an Expo SDK 57 app. Native shell handles login/register; the authenticated portal loads in a WebView after `/api/mobile/bridge` sets session cookies.

---

## What is already done

- [x] Oceanside branding (icons, splash, navy `#002856`)
- [x] Bundle ID `com.easylife.oceanside` (iOS + Android)
- [x] Login / self-enroll (unit required) → pending approval
- [x] Mobile JWT login + session bridge APIs on Easy Life
- [x] Secure token storage (`expo-secure-store`)
- [x] External links (ClickPay etc.) open in system browser
- [x] Android back navigates WebView history
- [x] Privacy + support links on auth screens
- [x] `eas.json` production profiles (AAB + App Store IPA)

## What you must do once (accounts)

You need:

1. **Expo account** — `npx eas-cli login`
2. **Apple Developer** ($99/yr) — App Store Connect app with bundle `com.easylife.oceanside`
3. **Google Play Console** ($25 one-time) — app with package `com.easylife.oceanside`

### Link this project to EAS

```bash
cd plaza-oceanside
npx eas-cli login
npx eas-cli init
```

Copy the printed `projectId` into `app.json` → `expo.extra.eas.projectId`.

### Apple App Store Connect

1. Create app: **The Plaza at Oceanside**
2. Bundle ID: `com.easylife.oceanside`
3. Paste App Store Connect App ID into `eas.json` → `submit.production.ios.ascAppId`
4. Privacy Policy URL: `https://easy-life-peach-two.vercel.app/privacy`
5. Support URL / email: your Oceanside / Easy Life support contact

### Google Play Console

1. Create app: **The Plaza at Oceanside**
2. Package: `com.easylife.oceanside`
3. Complete Data safety form (account info, photos if uploaded, payments via web)
4. Privacy policy URL (same as above)
5. Upload screenshots + feature graphic

---

## Build (cloud — no local Mac required for iOS)

```bash
cd plaza-oceanside

# Android Play Bundle (.aab)
npm run build:android

# iOS App Store (.ipa) — builds on Expo Macs
npm run build:ios
```

Or both:

```bash
npx eas-cli build --platform all --profile production
```

## Submit

```bash
npm run submit:android
npm run submit:ios
```

Android submit needs a Google service account JSON linked in EAS.  
iOS submit needs App Store Connect API key or Apple ID in EAS credentials.

---

## Listing copy (ready to paste)

**Subtitle (iOS):** Resident portal for The Plaza at Oceanside  

**Short description (Play):** Resident app for The Plaza at Oceanside condo community.

**Full description:**

The Plaza at Oceanside resident app gives owners and residents one place to manage community life — sign in securely, book amenities, view announcements, message management, and open HOA payments.

Self-enroll with your unit number. Association management approves new accounts before directory access.

**Keywords:** oceanside, pompano, condo, hoa, resident, plaza, amenities

**Category:** Lifestyle / Productivity  

**Age rating:** 4+ / Everyone  

---

## Screenshots checklist

Capture from a device or simulator after login:

- [ ] Sign-in screen (wordmark)
- [ ] Home / member portal
- [ ] Bookings or calendar
- [ ] Payments (ClickPay CTA)
- [ ] Profile / account

Sizes: iPhone 6.7" (1290×2796), Android phone (1080×1920+)

---

## After Azure cutover

Update `app.json` → `extra.apiBaseUrl` to the Azure URL, bump `version`, rebuild + resubmit.

---

## Local smoke test

```bash
npx expo start
```

Use a real Oceanside approved account against production API. Pending registrants should land on “Pending approval”.
