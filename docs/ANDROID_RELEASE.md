# Dawnbound Android releases

Both release profiles use the normal `com.fajar.dawnbound` package, the existing upload key, English game copy, and the same consent and ad lifecycle code. Neither profile includes a Test Ads menu or development hooks.

| Profile | APK / AAB | Version | Ad units |
| --- | --- | --- | --- |
| Final closed test | `artifacts/Dawnbound-1.0.7-preview.apk` / `Dawnbound-1.0.7.aab` | 1.0.7, code 8 | Google demo units |
| Live release | `artifacts/Dawnbound-1.0.10-live.apk` / `Dawnbound-1.0.10-live.aab` | 1.0.10, code 11 | Registered Dawnbound units |

The live files have already been built and signed. Use the live AAB when proceeding to production. These files have not been uploaded by this change.

To rebuild the final closed-test files:

```powershell
npm run android:release
```

To rebuild with the real AdMob IDs:

```powershell
npm run android:live
```

`.env.production` selects demo units; `.env.live` selects live units. The live command switches all three formats together. Each profile also sets the Android version and the version shown in the game. Increase its version code before any later Play upload if that code has already been used.

The native publisher App ID stays `ca-app-pub-6279186647593327~3638656746` in both profiles. Demo testing goes through the published publisher consent configuration instead of bypassing consent.

| Format | Registered unit |
| --- | --- |
| Banner | `ca-app-pub-6279186647593327/1259905416` |
| Interstitial | `ca-app-pub-6279186647593327/7604898479` |
| Rewarded | `ca-app-pub-6279186647593327/3665653467` |

Real ad availability still depends on the app's AdMob review and serving status. At the last account check, Dawnbound required review and a supported public store listing. Link the public Play listing in AdMob when available and check that app review completes. [AdMob app readiness guidance](https://support.google.com/admob/answer/10037806?hl=en).

## Layout and player experience

Capacitor's native window handling reserves the Android navigation and display-cutout area. The banner sits inside that area with an additional 8 dp bottom gap. The game reserves banner height plus that gap and 4 dp clearance above it, keeping game controls away from the ad. The saved AdMob SDK patch preserves Capacitor's inset listener rather than replacing it.

Banners appear on the menu, path map, and results; they stay hidden in the village and combat. Interstitials follow normal breaks and pacing, including protection for new players and a gap after rewarded videos. Rewards require the native SDK reward callback and dismissal. Remove Ads still removes banners and interstitials; optional rewarded videos remain available. The existing `remove_ads` product and US$4.99 fallback price are unchanged.

## Verification, October 6, 2026

- Type checking and all 114 tests passed.
- Android 16 native testing passed with both three-button and gesture navigation.
- Three-button navigation: safe content ends at y=592; banner ends at y=584, leaving 8 dp.
- Gesture navigation: safe content ends at y=616; banner ends at y=608, leaving 8 dp.
- The signed customer APK reproduced the gesture layout and displayed a real SDK demo banner.
- The normal Results **Return to Village** button displayed a native interstitial. After dismissal the village opened, the banner was hidden, and the next interstitial loaded.
- The normal village **Daily Gift → Watch video** button displayed a native rewarded ad. The SDK confirmed one reward. After dismissal the normal game callback added exactly **100 gold and 25 embers**, marked the daily gift claimed, and reloaded the next rewarded ad.
- Automated fixtures seeded progress only in the separate `com.fajar.dawnbound.adtest` QA package. Customer APK/AAB archives contain no QA hooks or diagnostic menus.
- Both APKs passed APK Signature Scheme v2 verification. Both AABs are signed. Package, publisher App ID, safe-area configuration, version, and compiled ad selector were checked inside all four archives.

Archive verification can be repeated with:

```powershell
python tools/verify_ad_release.py closed artifacts/Dawnbound-1.0.7-preview.apk artifacts/Dawnbound-1.0.7.aab
python tools/verify_ad_release.py live artifacts/Dawnbound-1.0.8-live.apk artifacts/Dawnbound-1.0.8-live.aab
```

Evidence is saved under `artifacts/`: `dawnbound-1.0.7-three-buttons.png`, `dawnbound-1.0.7-gestures.png`, `dawnbound-1.0.7-release.png`, `dawnbound-1.0.7-interstitial.png`, `dawnbound-1.0.7-rewarded.png`, `dawnbound-1.0.7-gift-earned.png`, and the corresponding native status JSON and UI hierarchy files. Google marks demo creatives as **Test Ad** inside the ad; the game itself contains no testing interface. [Google's test-ad guidance](https://developers.google.com/admob/android/test-ads).
