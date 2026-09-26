import { describe, expect, it, vi } from 'vitest';

// The Capacitor plugins are native-only; the pacing rule under test is pure.
vi.mock('@capacitor-community/admob', () => ({ AdMob: {}, AdmobConsentStatus: {}, BannerAdPosition: {}, BannerAdSize: {}, InterstitialAdPluginEvents: {}, RewardAdPluginEvents: {} }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const { interstitialAllowed } = await import('@/core/ads');
const cfg = { minRuns: 3, minGapSec: 180, everyNthBreak: 2 };
const shop = (o: Partial<{ noAds: boolean; adBreaks: number; lastInterstitialAt: number; giftDay: number }> = {}) =>
  ({ noAds: false, adBreaks: 2, lastInterstitialAt: 0, giftDay: 0, ...o });
const NOW = 10_000_000;

describe('interstitial pacing', () => {
  it('shows on an eligible break', () => {
    expect(interstitialAllowed(shop(), 5, NOW, cfg)).toBe(true);
  });
  it('never shows after Remove Ads was purchased', () => {
    expect(interstitialAllowed(shop({ noAds: true }), 50, NOW, cfg)).toBe(false);
  });
  it('spares new players their first runs', () => {
    expect(interstitialAllowed(shop(), 2, NOW, cfg)).toBe(false);
  });
  it('respects the minimum gap between interstitials', () => {
    expect(interstitialAllowed(shop({ lastInterstitialAt: NOW - 60_000 }), 5, NOW, cfg)).toBe(false);
    expect(interstitialAllowed(shop({ lastInterstitialAt: NOW - 181_000 }), 5, NOW, cfg)).toBe(true);
  });
  it('only uses every Nth natural break', () => {
    expect(interstitialAllowed(shop({ adBreaks: 3 }), 5, NOW, cfg)).toBe(false);
    expect(interstitialAllowed(shop({ adBreaks: 4 }), 5, NOW, cfg)).toBe(true);
  });
});
