/**
 * Ads and in-app purchase configuration.
 *
 * BEFORE RELEASE:
 *  1. Create the app in AdMob, then paste your ad unit ids below and set `useTestAds` to false.
 *  2. Put your AdMob *App ID* in android/app/src/main/res/values/strings.xml (`admob_app_id`).
 *  3. In Google Play Console create a one-time in-app product with id `remove_ads`, priced at US$4.99.
 *
 * Until then the game shows Google's official test ads, which are safe to click during development.
 */
export const MONETIZATION = {
  /** Google's test ads (always safe). Must be false for the Play Store release with real ids below. */
  useTestAds: true,
  /** Real ad unit ids from your AdMob account (format ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN). */
  production: {
    banner: '',
    interstitial: '',
    rewarded: '',
  },
  /** Google's documented test ad unit ids. */
  test: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  /** One-time Play Store product that removes banners and interstitials. */
  removeAdsSku: 'remove_ads',
  /** Shown until the store returns the localized price. */
  removeAdsFallbackPrice: 'US$4.99',
  /** Interstitial pacing: never in the first runs, never twice within this many seconds. */
  interstitial: { minRuns: 3, minGapSec: 180, everyNthBreak: 2 },
} as const;

export type AdUnit = 'banner' | 'interstitial' | 'rewarded';

export function adUnitId(unit: AdUnit): string {
  const prod = MONETIZATION.production[unit];
  return MONETIZATION.useTestAds || !prod ? MONETIZATION.test[unit] : prod;
}
