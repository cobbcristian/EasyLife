# Wake up — The Plaza at Oceanside

**Status as of overnight grind**

| Item | Status |
|------|--------|
| Expo CLI login | Done (`cristian.cobb`) |
| EAS project | Linked: https://expo.dev/accounts/cristian.cobb/projects/plaza-oceanside |
| Android production build | Started — see `STATUS.md` + Expo build link below |
| Apple Developer | Pending enrollment — **do not** build iOS until Active |
| Play Console app | Created (fix name Plaze → Plaza if still wrong) |
| App code / APIs / branding | Ready |

## Android build — DONE

- Status: **FINISHED**
- Download AAB: https://expo.dev/artifacts/eas/rF5RTOEZU0m0bR0xr1Q0ONIf28pPPT4mnX2h-VCurVA.aab
- Build page: https://expo.dev/accounts/cristian.cobb/projects/plaza-oceanside/builds/77d21a2d-8c6b-4a8d-92fc-a897e77f6ba4

### Upload to Play (your click)

1. Play Console → **The Plaza at Oceanside** → Testing → **Internal testing**
2. Create release → upload the `.aab` above
3. Add yourself as tester → open the opt-in link on your phone

## iOS (only after Apple email says Active)

1. App Store Connect → New App → bundle `com.easylife.oceanside`
2. ```powershell
   npm run build:ios
   npm run submit:ios
   ```

## Privacy / listing

- Privacy: https://easy-life-peach-two.vercel.app/privacy
- Feature graphic: `assets/play-feature-graphic.png`
- Copy: `STORE.md` · questionnaire: `PRIVACY_NUTRITION.md`
