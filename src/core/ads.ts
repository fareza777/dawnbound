/**
 * AdMob integration with player-friendly pacing:
 *  - Banners only on calm screens (menu, path map, results) and never in combat.
 *  - Interstitials only at natural breaks (run end, new floor/depth), never in the first runs, at most every few minutes
 *    and never right after a rewarded video.
 *  - Rewarded videos are always the player's choice (revive, double embers, extra reroll, daily gift, blessed rest,
 *    merchant's favour).
 * Remove Ads turns banners and interstitials off; rewarded videos stay available as an opt-in.
 * On the web (dev/QA builds) rewarded ads are simulated so the flows can be tested; production web shows none.
 */
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents, RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { MONETIZATION, adUnitId } from '@/config/monetization';
import { view } from './viewport';
import type { SaveData } from '@/data/types';
import type { AudioManager } from './audio';

export type RewardPlacement = 'revive' | 'double_embers' | 'reroll' | 'daily_gift' | 'blessed_rest' | 'merchant_favor';

/** Gap kept above the banner so no button sits right against it (accidental clicks). */
const BANNER_GAP_DP = 4;
/** Retry delays after a failed ad load (no fill / offline), capped at the last value. */
const RETRY_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

/**
 * Height of Google's anchored adaptive banner for a screen width (dp): about 15.6% of the width, clamped to 50..90.
 * Used to reserve space before the real size arrives from the SDK.
 */
export function adaptiveBannerHeightDp(widthDp: number): number {
  return Math.min(90, Math.max(50, Math.ceil(widthDp * 0.157)));
}
const SIMULATED = import.meta.env.DEV || import.meta.env.VITE_QA === '1';

/**
 * Interstitial pacing rule (pure, unit-tested): never for Remove Ads owners, never in the first runs, never twice
 * within the minimum gap, and only on every Nth natural break.
 */
export interface InterstitialPacing {
  minRuns: number;
  minGapSec: number;
  everyNthBreak: number;
}

export function interstitialAllowed(shop: SaveData['shop'], runs: number, now: number, cfg: InterstitialPacing = MONETIZATION.interstitial): boolean {
  return !shop.noAds
    && runs >= cfg.minRuns
    && now - shop.lastInterstitialAt >= cfg.minGapSec * 1000
    && shop.adBreaks % cfg.everyNthBreak === 0;
}

export class Ads {
  readonly native = Capacitor.isNativePlatform();
  private ready = false;
  private interstitialLoaded = false;
  private rewardedLoaded = false;
  private bannerCreated = false;
  private bannerVisible = false;
  /** A screen asked for a banner (it may arrive before AdMob finished starting). */
  private wantBanner = false;
  private privacyRequired = false;
  private showing = false;
  /** Real banner height reported by the SDK (dp); 0 until the first banner loaded. */
  private bannerHeightDp = 0;
  private retries = { interstitial: 0, rewarded: 0 };
  private retryTimers: Partial<Record<'interstitial' | 'rewarded', ReturnType<typeof setTimeout>>> = {};
  /** Interstitials shown this session (for the gentle Remove Ads hint). */
  private interstitialsShown = 0;
  /** Set by the game to show the Remove Ads hint (a toast) after some interstitials. */
  onRemoveAdsHint?: () => void;

  constructor(private save: () => SaveData, private audio: () => AudioManager | undefined) {}

  get noAds(): boolean {
    return this.save().shop.noAds;
  }

  async init(): Promise<void> {
    if (!this.native) return;
    try {
      await AdMob.initialize({ initializeForTesting: MONETIZATION.useTestAds });
      // GDPR / UMP consent: shows Google's form only where it is legally required.
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
      const after = await AdMob.requestConsentInfo();
      // The enum is not exported by the plugin; its REQUIRED value is the string below.
      this.privacyRequired = String(after.privacyOptionsRequirementStatus) === 'REQUIRED';
      this.ready = true;
      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => (this.interstitialLoaded = true));
      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => (this.interstitialLoaded = false));
      AdMob.addListener(RewardAdPluginEvents.Loaded, () => (this.rewardedLoaded = true));
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => (this.rewardedLoaded = false));
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        if (size.height > 0) this.bannerHeightDp = size.height;
      });
      void this.loadInterstitial();
      void this.loadRewarded();
      if (this.wantBanner) void this.showBanner();
    } catch (err) {
      console.warn('[ads] init failed', err);
    }
  }

  // ------------------------------------------------------------------ banner
  /** Virtual pixels a scene should keep free at the bottom while it shows a banner. */
  bannerReserve(): number {
    // Reserved even before AdMob is ready so the layout does not jump when the banner arrives.
    if (!this.native || this.noAds) return 0;
    const heightDp = Math.max(this.bannerHeightDp, adaptiveBannerHeightDp(window.innerWidth));
    return Math.ceil((heightDp + BANNER_GAP_DP) / view.cssPerVirtual);
  }

  async showBanner(): Promise<void> {
    this.wantBanner = true;
    if (!this.native || !this.ready || this.noAds || this.bannerVisible) return;
    this.bannerVisible = true;
    try {
      if (this.bannerCreated) await AdMob.resumeBanner();
      else {
        await AdMob.showBanner({
          adId: adUnitId('banner'), adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0, isTesting: MONETIZATION.useTestAds,
        });
        this.bannerCreated = true;
      }
    } catch (err) {
      this.bannerVisible = false;
      console.warn('[ads] banner', err);
    }
  }

  async hideBanner(): Promise<void> {
    this.wantBanner = false;
    if (!this.bannerVisible) return;
    this.bannerVisible = false;
    try {
      await AdMob.hideBanner();
    } catch (err) {
      console.warn('[ads] hide banner', err);
    }
  }

  // ------------------------------------------------------------------ loading
  /** After a failed load (no fill, offline) try again later with a growing delay, so buttons come back by themselves. */
  private scheduleRetry(kind: 'interstitial' | 'rewarded'): void {
    if (this.retryTimers[kind]) return;
    const delay = RETRY_MS[Math.min(this.retries[kind], RETRY_MS.length - 1)];
    this.retries[kind] += 1;
    this.retryTimers[kind] = setTimeout(() => {
      this.retryTimers[kind] = undefined;
      void (kind === 'interstitial' ? this.loadInterstitial() : this.loadRewarded());
    }, delay);
  }

  // ------------------------------------------------------------------ interstitial
  private async loadInterstitial(): Promise<void> {
    if (!this.ready || this.noAds) return;
    try {
      await AdMob.prepareInterstitial({ adId: adUnitId('interstitial'), isTesting: MONETIZATION.useTestAds });
      this.interstitialLoaded = true;
      this.retries.interstitial = 0;
    } catch (err) {
      this.interstitialLoaded = false;
      console.warn('[ads] interstitial load', err);
      this.scheduleRetry('interstitial');
    }
  }

  /**
   * A natural break (run ended, new floor or depth). Shows an interstitial only if pacing allows; resolves when the
   * game may continue (immediately when no ad is shown).
   */
  async naturalBreak(): Promise<void> {
    const s = this.save();
    s.shop.adBreaks += 1;
    const allowed = this.native && this.ready && !this.showing && this.interstitialLoaded
      && interstitialAllowed(s.shop, s.stats.runs ?? 0, Date.now());
    if (!allowed) return;
    this.showing = true;
    this.audio()?.setPaused(true);
    try {
      await new Promise<void>((resolve) => {
        const handles: Promise<PluginListenerHandle>[] = [];
        const done = () => {
          handles.forEach((h) => void h.then((x) => x.remove()));
          resolve();
        };
        handles.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, done));
        handles.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, done));
        AdMob.showInterstitial().catch(done);
      });
      s.shop.lastInterstitialAt = Date.now();
      this.interstitialsShown += 1;
      // Every few interstitials, a quiet reminder that they can be switched off for good.
      if (this.interstitialsShown % MONETIZATION.removeAdsHintEvery === 0) this.onRemoveAdsHint?.();
    } finally {
      this.showing = false;
      this.interstitialLoaded = false;
      this.audio()?.setPaused(false);
      void this.loadInterstitial();
    }
  }

  // ------------------------------------------------------------------ rewarded
  private async loadRewarded(): Promise<void> {
    if (!this.ready) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: adUnitId('rewarded'), isTesting: MONETIZATION.useTestAds });
      this.rewardedLoaded = true;
      this.retries.rewarded = 0;
    } catch (err) {
      this.rewardedLoaded = false;
      console.warn('[ads] rewarded load', err);
      this.scheduleRetry('rewarded');
    }
  }

  /** Whether a rewarded video can be offered right now (hide the button otherwise). */
  canReward(): boolean {
    if (!this.native) return SIMULATED;
    return this.ready && this.rewardedLoaded && !this.showing;
  }

  /** Plays a rewarded video. Resolves true only if the player earned the reward. */
  async showRewarded(_placement: RewardPlacement): Promise<boolean> {
    if (!this.native) {
      if (!SIMULATED) return false;
      await new Promise((r) => setTimeout(r, 500));
      return true;
    }
    if (!this.canReward()) {
      void this.loadRewarded();
      return false;
    }
    this.showing = true;
    this.audio()?.setPaused(true);
    let earned = false;
    try {
      await new Promise<void>((resolve) => {
        const handles: Promise<PluginListenerHandle>[] = [];
        const done = () => {
          handles.forEach((h) => void h.then((x) => x.remove()));
          resolve();
        };
        handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (earned = true)));
        handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, done));
        handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, done));
        AdMob.showRewardVideoAd().catch(done);
      });
    } finally {
      this.showing = false;
      this.rewardedLoaded = false;
      // No full-screen ad straight after a video the player chose to watch.
      this.save().shop.lastInterstitialAt = Date.now();
      this.audio()?.setPaused(false);
      void this.loadRewarded();
    }
    return earned;
  }

  // ------------------------------------------------------------------ privacy
  /** True where regulations require an "Ad privacy" entry in settings (e.g. EEA/UK). */
  get privacyOptionsRequired(): boolean {
    return this.privacyRequired;
  }

  async showPrivacyOptions(): Promise<void> {
    if (!this.native) return;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch (err) {
      console.warn('[ads] privacy form', err);
    }
  }

  /** Called when Remove Ads is purchased: drop the banner and stop preloading interstitials. */
  onAdsRemoved(): void {
    void this.hideBanner();
    if (this.bannerCreated) void AdMob.removeBanner().catch(() => undefined);
    this.bannerCreated = false;
    this.interstitialLoaded = false;
  }
}
