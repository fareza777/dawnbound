import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData } from '@/data/types';
import { newSave } from '@/core/save';

// Only the native SDK boundary is replaced; all consent, retry and screen-transition logic is real.
const sdk = vi.hoisted(() => ({
  initialize: vi.fn(), requestConsentInfo: vi.fn(), showConsentForm: vi.fn(),
  showBanner: vi.fn(), resumeBanner: vi.fn(), hideBanner: vi.fn(), removeBanner: vi.fn(),
  prepareInterstitial: vi.fn(), prepareRewardVideoAd: vi.fn(),
  showInterstitial: vi.fn(), showRewardVideoAd: vi.fn(),
  listeners: new Map<string, (data?: unknown) => void>(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: {} }));
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    ...sdk,
    addListener: vi.fn(async (event: string, handler: (data?: unknown) => void) => {
      sdk.listeners.set(event, handler);
      return { remove: async () => { sdk.listeners.delete(event); } };
    }),
  },
  AdmobConsentStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED', OBTAINED: 'OBTAINED' },
  BannerAdPluginEvents: { Loaded: 'bannerAdLoaded', FailedToLoad: 'bannerAdFailedToLoad', SizeChanged: 'bannerAdSizeChanged' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' }, BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  InterstitialAdPluginEvents: { Loaded: 'interstitialAdLoaded', FailedToLoad: 'interstitialAdFailedToLoad',
    Showed: 'interstitialAdShowed', FailedToShow: 'interstitialAdFailedToShow', Dismissed: 'interstitialAdDismissed' },
  RewardAdPluginEvents: { Loaded: 'onRewardedVideoAdLoaded', FailedToLoad: 'onRewardedVideoAdFailedToLoad',
    Showed: 'onRewardedVideoAdShowed', FailedToShow: 'onRewardedVideoAdFailedToShow',
    Dismissed: 'onRewardedVideoAdDismissed', Rewarded: 'onRewardedVideoAdReward' },
}));
const { Ads } = await import('@/core/ads');
const allowed = {
  status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true,
  privacyOptionsRequirementStatus: 'NOT_REQUIRED',
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
let save: SaveData;
let ads: InstanceType<typeof Ads>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  sdk.listeners.clear();
  for (const fn of [sdk.initialize, sdk.showBanner, sdk.resumeBanner, sdk.hideBanner, sdk.removeBanner,
    sdk.prepareInterstitial, sdk.prepareRewardVideoAd, sdk.showInterstitial, sdk.showRewardVideoAd]) fn.mockResolvedValue(undefined);
  sdk.requestConsentInfo.mockResolvedValue({ ...allowed });
  sdk.showConsentForm.mockResolvedValue({ ...allowed, status: 'OBTAINED' });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  save = newSave(); save.stats.runs = 5;
  ads = new Ads(() => save, () => undefined);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('native AdMob lifecycle', () => {
  it('creates a fresh banner after the SDK destroys a failed banner', async () => {
    await ads.init();
    await ads.showBanner();
    sdk.listeners.get('bannerAdFailedToLoad')?.({ code: 3, message: 'No fill' });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(sdk.showBanner).toHaveBeenCalledTimes(2);
    expect(sdk.resumeBanner).not.toHaveBeenCalled();
    expect(sdk.showBanner).toHaveBeenLastCalledWith(expect.objectContaining({
      adId: 'ca-app-pub-6279186647593327/1259905416', isTesting: false,
      adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER',
    }));
  });

  it('does not retry a failed banner after leaving a banner screen', async () => {
    await ads.init(); await ads.showBanner();
    sdk.listeners.get('bannerAdFailedToLoad')?.({ code: 2, message: 'Offline' });
    await ads.hideBanner();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(sdk.showBanner).toHaveBeenCalledTimes(1);
  });

  it('keeps paid owners free of banners and interstitials', async () => {
    save.shop.noAds = true;
    await ads.init(); await ads.showBanner();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(sdk.showBanner).not.toHaveBeenCalled();
    expect(sdk.prepareInterstitial).not.toHaveBeenCalled();
    expect(sdk.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
  });

  it('updates consent once per startup, including concurrent initialization', async () => {
    await Promise.all([ads.init(), ads.init()]);
    await ads.init();
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
    expect(sdk.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(sdk.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
  });

  it('uses the consent form result without a second network request', async () => {
    sdk.requestConsentInfo.mockResolvedValueOnce({ ...allowed, status: 'REQUIRED',
      isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' });
    sdk.showConsentForm.mockResolvedValueOnce({ status: 'OBTAINED', canRequestAds: true,
      privacyOptionsRequirementStatus: 'REQUIRED' });
    await ads.init(); await ads.showBanner();
    expect(sdk.showConsentForm).toHaveBeenCalledTimes(1);
    expect(sdk.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(sdk.showBanner).toHaveBeenCalledTimes(1);
    expect(ads.privacyOptionsRequired).toBe(true);
  });

  it('waits for SDK permission before requesting any ads', async () => {
    sdk.requestConsentInfo.mockResolvedValue({ ...allowed, status: 'REQUIRED', canRequestAds: false });
    await ads.init(); await ads.showBanner();
    expect(sdk.showBanner).not.toHaveBeenCalled();
    expect(sdk.prepareInterstitial).not.toHaveBeenCalled();
    expect(sdk.prepareRewardVideoAd).not.toHaveBeenCalled();
  });

  it('recovers a requested banner after the initial consent request fails offline', async () => {
    sdk.requestConsentInfo.mockRejectedValueOnce(new Error('Offline'));
    await ads.showBanner(); await ads.init();
    await vi.advanceTimersByTimeAsync(15_000); await flush();
    expect(sdk.showBanner).toHaveBeenCalledTimes(1);
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
    expect(sdk.requestConsentInfo).toHaveBeenCalledTimes(2);
  });

  it('does not hide a newly requested banner while the previous creation is pending', async () => {
    await ads.init();
    let finish!: () => void;
    sdk.showBanner.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const creating = ads.showBanner(); await flush();
    const hiding = ads.hideBanner();
    const showing = ads.showBanner();
    finish(); await Promise.all([creating, hiding, showing]);
    expect(sdk.showBanner).toHaveBeenCalledTimes(1);
    expect(sdk.hideBanner).not.toHaveBeenCalled();
  });

  it('does not count a failed interstitial display as an impression or spend its pacing interval', async () => {
    await ads.init();
    const pending = ads.naturalBreak(); await flush();
    sdk.listeners.get('interstitialAdFailedToShow')?.({ code: 0, message: 'Activity unavailable' });
    await pending;
    expect(sdk.showInterstitial).toHaveBeenCalledTimes(1);
    expect(save.shop.lastInterstitialAt).toBe(0);
  });

  it('waits for full-screen dismissal before resuming the game and preloads the next interstitial', async () => {
    await ads.init();
    let finished = false;
    const pending = ads.naturalBreak().then(() => { finished = true; }); await flush();
    sdk.listeners.get('interstitialAdShowed')?.(); await flush();
    expect(finished).toBe(false);
    sdk.listeners.get('interstitialAdDismissed')?.(); await pending;
    expect(save.shop.lastInterstitialAt).toBeGreaterThan(0);
    expect(sdk.prepareInterstitial).toHaveBeenCalledTimes(2);
  });

  it('does not grant a reward when the video closes before the reward event', async () => {
    await ads.init();
    const pending = ads.showRewarded('daily_gift'); await flush();
    sdk.listeners.get('onRewardedVideoAdDismissed')?.();
    expect(await pending).toBe(false);
    expect(sdk.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
  });

  it('grants a reward only after the SDK reward event and waits for dismissal', async () => {
    await ads.init();
    let finished = false;
    const pending = ads.showRewarded('daily_gift').then((earned) => { finished = true; return earned; }); await flush();
    sdk.listeners.get('onRewardedVideoAdReward')?.({ type: 'coins', amount: 1 }); await flush();
    expect(finished).toBe(false);
    sdk.listeners.get('onRewardedVideoAdDismissed')?.();
    expect(await pending).toBe(true);
  });

  it('retries rewarded and interstitial loading after an SDK failure', async () => {
    sdk.prepareInterstitial.mockRejectedValueOnce(new Error('Offline'));
    sdk.prepareRewardVideoAd.mockRejectedValueOnce(new Error('Offline'));
    await ads.init(); await flush();
    expect(ads.canReward()).toBe(false);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(sdk.prepareInterstitial).toHaveBeenCalledTimes(2);
    expect(sdk.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
    expect(ads.canReward()).toBe(true);
  });

  it('keeps room for the banner margin so game controls stay above the ad', async () => {
    vi.stubGlobal('window', { innerWidth: 320 });
    await ads.init(); await ads.showBanner();
    sdk.listeners.get('bannerAdSizeChanged')?.({ width: 320, height: 50 });
    expect(sdk.showBanner).toHaveBeenCalledWith(expect.objectContaining({ margin: 8 }));
    // The adaptive estimate can reserve one more pixel; it must always cover the real banner and both gaps.
    expect(ads.bannerReserve()).toBeGreaterThanOrEqual(62);
  });

  it('uses demo IDs for all three formats while keeping the real consent flow', async () => {
    vi.stubEnv('VITE_AD_TEST', '1'); vi.resetModules();
    const { Ads: TestAds } = await import('@/core/ads');
    const testAds = new TestAds(() => save, () => undefined);
    await testAds.init(); await testAds.showBanner();
    expect(sdk.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(sdk.showBanner).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-3940256099942544/9214589741' }));
    expect(sdk.prepareInterstitial).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-3940256099942544/1033173712' }));
    expect(sdk.prepareRewardVideoAd).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-3940256099942544/5224354917' }));
  });

  it('does not request demo ads when consent still blocks ad requests', async () => {
    vi.stubEnv('VITE_AD_TEST', '1'); vi.resetModules();
    const { Ads: TestAds } = await import('@/core/ads');
    const testAds = new TestAds(() => save, () => undefined);
    sdk.requestConsentInfo.mockResolvedValue({ ...allowed, status: 'REQUIRED', canRequestAds: false });
    await testAds.init(); await testAds.showBanner();
    expect(sdk.showBanner).not.toHaveBeenCalled();
    expect(sdk.prepareInterstitial).not.toHaveBeenCalled();
    expect(sdk.prepareRewardVideoAd).not.toHaveBeenCalled();
  });
});
