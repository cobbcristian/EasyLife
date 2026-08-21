# App Store resubmission — Aug 21, 2026 rejection

Submission `7903f84a-0726-4807-8719-13500d351914` · version **1.0 (22)** · iPad Air 11" (M3)

## 2.1(a) Microphone not responding — FIXED in code

**Cause:** Native shell (`plaza-oceanside`) had no `NSMicrophoneUsageDescription` / `NSSpeechRecognitionUsageDescription`. In WKWebView, mic/speech taps fail with **no UI feedback**. Assistant also hid errors on speech failure.

**Fixes shipped:**
1. `plaza-oceanside/app.json` — mic + speech usage strings; Android `RECORD_AUDIO`; build **23**
2. `plaza-oceanside/App.tsx` — `mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"`, inline media playback
3. `easy-life` assistant — always-visible mic, `getUserMedia` permission first, clear error banner + focus text field, “Listening…” state
4. Home mic → `/member/assistant?voice=1` (opens assistant and starts listen)

### Ship order (required)
1. **Deploy** `easy-life` web to Azure (`easylife-plaza-app.azurewebsites.net`) so the WebView loads the new assistant.
2. **EAS rebuild** iOS: `cd plaza-oceanside && npm run build:ios` (build 23+).
3. **TestFlight** on iPad: Login → tap home mic → allow mic if prompted → see Listening / transcript. Menu → Assistant → mic again.
4. Submit build **23+** with the resolution notes below.

### Resolution note for App Review (paste in ASC)
> Fixed Guideline 2.1(a): Microphone and speech recognition usage descriptions were missing from the iOS binary, so voice taps failed silently inside the in-app browser. Build 23+ adds those permissions, grants WebView media capture for our host, and the Assistant now shows a Listening state or a clear on-screen message (with text fallback) whenever voice cannot start. Please retest: after login, tap the microphone on Home, then Assistant → microphone, and allow microphone access when prompted.

## 2.3.3 Screenshots — YOU must update in App Store Connect

Upload **new** 6.5" iPhone and 13" iPad screenshots that match the **current** UI (not marketing/splash-only). Prefer logged-in product moments:

1. Member home / Today agenda  
2. Book amenity / spaces  
3. Assistant (with mic visible)  
4. Inbox / messages  
5. Packages or payments  

Avoid login-only or outdated Plaza chrome. In ASC: **Previews and Screenshots → View All Sizes in Media Manager**.

Capture on:
- iPhone 6.5" (e.g. 14 Plus / 15 Plus simulator)
- iPad 13" (e.g. iPad Pro 12.9 / 13" simulator)
