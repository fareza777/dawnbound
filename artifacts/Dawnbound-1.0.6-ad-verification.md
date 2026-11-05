# Dawnbound 1.0.6: Android ad verification

Verified on October 6, 2026, using Android API 36 in a real Android emulator.

## Dedicated Google demo-ad APK

- File: `Dawnbound-1.0.6-google-test-ads.apk`
- Package: `com.fajar.dawnbound.adtest`
- Launcher name: **Dawnbound Ads Test**
- Version: `1.0.6-adtest`, version code `7`
- SHA-256: `96B95AA697D18B5502CE24F7CCFAF5AFFFF7A1109D8BCF694AB8EA6D77C9F020`
- Signature verified with Android apksigner (v2).
- Google sample App ID: `ca-app-pub-3940256099942544~3347511713`
- Adaptive banner: `ca-app-pub-3940256099942544/9214589741`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

Install this APK alongside the normal Dawnbound app. It keeps a separate save. Skip or complete onboarding, then choose **Test Ads** on the menu.

| Format | Native Android result | Evidence |
| --- | --- | --- |
| Adaptive banner | Google Test Ad visible in the menu and test screen | `dawnbound-adtest-menu.png`, `dawnbound-adtest-ready.png` |
| Interstitial | Google Test Ad displayed; dismissing it resumed the test screen and preloaded another ad | `dawnbound-adtest-interstitial.png`, `dawnbound-adtest-interstitial-done.png` |
| Rewarded | Google Test Ad displayed; completed video showed Reward granted; SDK reward callback confirmed before returning success | `dawnbound-adtest-rewarded.png`, `dawnbound-adtest-rewarded-done.png` |

These are native Google Mobile Ads SDK results, not web placeholders. Final test-screen status was Ready for all three formats, with no operation left busy.

## Production configuration

The original production APK logged a UMP publisher-configuration error: no consent form existed for App ID `ca-app-pub-6279186647593327~3638656746`. That prevented every format from reaching its ad request.

The **Dawnbound — European consent** message is now **Published** in AdMob, in English, for Dawnbound only. It includes Consent, Manage options, and Do not consent choices. Its privacy policy URL is:

https://fareza777.github.io/dawnbound/privacy-policy.html

Publication evidence: `admob-dawnbound-consent-published.png`.

After publication, the production SDK successfully received consent information and an adaptive banner using the publisher's registered banner unit appeared in the Android emulator (`dawnbound-production-menu.png`). The emulator is automatically a Google test device, so this does not establish real-device production ad availability.

All three registered AdMob units were checked against the code:

| Format | Registered production unit |
| --- | --- |
| Banner | `ca-app-pub-6279186647593327/1259905416` |
| Interstitial | `ca-app-pub-6279186647593327/7604898479` |
| Rewarded | `ca-app-pub-6279186647593327/3665653467` |

The AdMob app currently reports **Requires review / Limited ad serving / Add store to lift limit**, with no linked store package. A production request also returned SDK error 3 (no fill). Production availability remains limited; a successful demo-ad test does not remove this account-side limitation. Google requires an Android app to be publicly available in a supported store before it can be linked for app review.

## Code and build checks

- 112 tests passed across 16 files, including 14 native ad lifecycle regression tests.
- TypeScript checks and both Android builds passed.
- A failed interstitial display no longer counts as a successful impression or starts its pacing cooldown.
- Full-screen ads wait for native dismissal; rewarded succeeds only after the SDK reward event.
- Banner transitions are serialized and failed ad loads retry with backoff.
- Normal builds retain production IDs and UMP consent requirements.
- Android rejects a release build when synced web assets are in demo-ad mode; this guard was exercised and rejected the mismatch as expected.
- Production assets were restored after building the demo APK. The normal APK and AAB contain `testAds: false` and do not include the Test Ads screen.
- Separate normal artifacts are available locally: `Dawnbound-1.0.6-preview.apk` and `Dawnbound-1.0.6.aab`. No demo-ad build was uploaded to Google Play.

## Google references

- [Official demo ad units](https://developers.google.com/admob/android/test-ads)
- [UMP privacy integration](https://developers.google.com/admob/android/privacy)
- [Linking an app to a supported store](https://support.google.com/admob/answer/10037806?hl=en)
- [SDK error 3 / no fill](https://developers.google.com/admob/android/reference/com/google/android/gms/ads/AdRequest)
