/**
 * Ads and in-app purchase configuration.
 *
 * Production IDs are registered in the Dawnbound AdMob account. The Play Console
 * one-time `remove_ads` product still needs to be created before billing is live.
 */
export const MONETIZATION = {
  /** Keep false in Play builds; switch on only for local development/testing. */
  useTestAds: false,
  /** Real ad unit ids from your AdMob account (format ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN). */
  production: {
    banner: 'ca-app-pub-6279186647593327/1259905416',
    interstitial: 'ca-app-pub-6279186647593327/7604898479',
    rewarded: 'ca-app-pub-6279186647593327/3665653467',
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
