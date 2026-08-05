# App Store / Play privacy questionnaire answers

Use these when filling Apple App Privacy and Google Data safety.

## Data collected

| Data | Collected? | Linked to identity? | Purpose |
|------|------------|---------------------|---------|
| Name | Yes | Yes | Account |
| Email | Yes | Yes | Account / auth |
| Unit number | Yes | Yes | HOA enrollment |
| Photos (if user uploads) | Yes | Yes | Profile / requests |
| Payment info | No (in-app) | — | HOA via ClickPay / Stripe web |
| Precise location | No by default | — | Optional features only |
| Device ID | No | — | — |
| Contacts | No | — | — |

## Tracking

- **Does not track** users across apps/websites for advertising.
- No third-party ad SDKs in this binary.

## Third parties

- Hosting / API: Easy Life (Vercel / future Azure)
- Payments: ClickPay / Stripe (opened in browser or web checkout)
- Optional SMS (Twilio) when configured on the server

## Privacy policy URL

https://easy-life-peach-two.vercel.app/privacy
