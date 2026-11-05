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
/** Breathing room above Android's native navigation area; system insets are handled by the native window. */
const BANNER_MARGIN_DP = 8;
/** Retry delays after a failed ad load (no fill / offline), capped at the last value. */
const RETRY_MS = [15_000, 30_000, 60_000, 120_000, 300_000];
type RetryKind = 'init' | 'banner' | 'interstitial' | 'rewarded';

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
  private sdkInitialized = false;
  private listenersRegistered = false;
  private initPromise?: Promise<void>;
  private bannerOperation: Promise<void> = Promise.resolve();
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
  private retries = { init: 0, banner: 0, interstitial: 0, rewarded: 0 };
  private retryTimers: Partial<Record<RetryKind, ReturnType<typeof setTimeout>>> = {};
  private status = { sdk: 'Starting', banner: 'Idle', interstitial: 'Idle', rewarded: 'Idle' };
  private lastError = '';
  private counts = { banner: 0, interstitial: 0, rewarded: 0, rewardsEarned: 0 };
  /** Interstitials shown this session (for the gentle Remove Ads hint). */
  private interstitialsShown = 0;
  /** Set by the game to show the Remove Ads hint (a toast) after some interstitials. */
  onRemoveAdsHint?: () => void;

  constructor(private save: () => SaveData, private audio: () => AudioManager | undefined) {}

  get noAds(): boolean {
    return this.save().shop.noAds;
  }

  /** Native SDK events available to automated QA; never shown in the game menu. */
  get diagnostics() {
    return { ...this.status, ...this.counts, bannerStatus: this.status.banner,
      interstitialStatus: this.status.interstitial, rewardedStatus: this.status.rewarded,
      lastError: this.lastError, native: this.native, testAds: MONETIZATION.useTestAds };
  }

  private setStatus(kind: keyof typeof this.status, status: string, err?: unknown): void {
    this.status[kind] = status;
    if (err) {
      const data = err as { message?: string; code?: number };
      this.lastError = `${kind}: ${data.code !== undefined ? `[${data.code}] ` : ''}${data.message ?? String(err)}`;
    }
  }

  async init(): Promise<void> {
    if (!this.native || this.ready) return;
    if (this.initPromise) return this.initPromise;
    this.cancelRetry('init');
    this.initPromise = this.initialize().finally(() => { this.initPromise = undefined; });
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    try {
      if (!this.sdkInitialized) {
        // Explicit Google demo unit IDs select demo creatives without changing the production consent flow.
        await AdMob.initialize({ initializeForTesting: false });
        this.sdkInitialized = true;
      }
      await this.registerListeners();
      this.setStatus('sdk', 'Waiting for consent');
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        try {
          info = await AdMob.showConsentForm();
        } catch (err) {
          if (!info.canRequestAds) throw err;
          console.warn('[ads] consent form', err);
        }
      }
      this.privacyRequired = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      if (!info.canRequestAds) {
        this.setStatus('sdk', 'Consent blocked');
        this.scheduleRetry('init');
        return;
      }
      this.ready = true;
      this.setStatus('sdk', 'Ready');
      this.retries.init = 0;
      void this.loadInterstitial();
      void this.loadRewarded();
      if (this.wantBanner) void this.showBanner();
    } catch (err) {
      this.setStatus('sdk', 'Failed', err);
      console.warn('[ads] init failed', err);
      this.scheduleRetry('init');
    }
  }

  private async registerListeners(): Promise<void> {
    if (this.listenersRegistered) return;
    await Promise.all([
      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.interstitialLoaded = !this.noAds;
        this.cancelRetry('interstitial'); this.retries.interstitial = 0;
        this.setStatus('interstitial', this.noAds ? 'Disabled' : 'Ready');
      }),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
        this.interstitialLoaded = false;
        this.setStatus('interstitial', 'Failed', err); this.scheduleRetry('interstitial');
      }),
      AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
        this.rewardedLoaded = true;
        this.cancelRetry('rewarded'); this.retries.rewarded = 0;
        this.setStatus('rewarded', 'Ready');
      }),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
        this.rewardedLoaded = false;
        this.setStatus('rewarded', 'Failed', err); this.scheduleRetry('rewarded');
      }),
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        this.bannerHeightDp = Math.max(0, size.height);
      }),
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        this.setStatus('banner', 'Ready'); this.counts.banner += 1;
        this.retries.banner = 0;
        this.cancelRetry('banner');
        if (!this.wantBanner || this.noAds) void this.hideBanner();
      }),
      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
        // The Android plugin destroys the failed AdView. Resume cannot restore it.
        this.bannerCreated = false;
        this.bannerVisible = false;
        this.bannerHeightDp = 0;
        this.setStatus('banner', 'Failed', err);
        console.warn('[ads] banner load failed', err);
        this.scheduleRetry('banner');
      }),
    ]);
    this.listenersRegistered = true;
  }

  /** Retry promptly when returning from an offline/background session. */
  async onResume(): Promise<void> {
    if (!this.ready) await this.init();
    else if (this.wantBanner) await this.showBanner();
  }

  // ------------------------------------------------------------------ banner
  /** Virtual pixels a scene should keep free at the bottom while it shows a banner. */
  bannerReserve(): number {
    // Reserved even before AdMob is ready so the layout does not jump when the banner arrives.
    if (!this.native || this.noAds) return 0;
    const heightDp = Math.max(this.bannerHeightDp, adaptiveBannerHeightDp(window.innerWidth));
    return Math.ceil((heightDp + BANNER_MARGIN_DP + BANNER_GAP_DP) / view.cssPerVirtual);
  }

  async showBanner(): Promise<void> {
    this.wantBanner = true;
    return this.queueBanner(async () => {
      if (!this.wantBanner || !this.native || !this.ready || this.noAds || this.bannerVisible) return;
      this.cancelRetry('banner');
      this.bannerVisible = true;
      this.setStatus('banner', this.bannerCreated ? 'Ready' : 'Loading');
      try {
        if (this.bannerCreated) await AdMob.resumeBanner();
        else {
          // Native events can arrive before this call resolves.
          this.bannerCreated = true;
          await AdMob.showBanner({
            adId: adUnitId('banner'), adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER,
            // Explicit demo IDs already select test creatives; do not let the plugin replace the adaptive demo ID.
            margin: BANNER_MARGIN_DP, isTesting: false,
          });
        }
      } catch (err) {
        this.bannerCreated = false;
        this.bannerVisible = false;
        this.setStatus('banner', 'Failed', err);
        console.warn('[ads] banner', err);
        this.scheduleRetry('banner');
      }
    });
  }

  private queueBanner(operation: () => Promise<void>): Promise<void> {
    // Screen changes can request hide/show while the native view is still being created.
    this.bannerOperation = this.bannerOperation.then(operation, operation);
    return this.bannerOperation;
  }

  async hideBanner(): Promise<void> {
    this.wantBanner = false;
    this.cancelRetry('banner');
    return this.queueBanner(async () => {
      if (this.wantBanner || (!this.bannerCreated && !this.bannerVisible)) return;
      this.bannerVisible = false;
      try {
        await AdMob.hideBanner();
        this.setStatus('banner', 'Hidden');
      } catch (err) {
        console.warn('[ads] hide banner', err);
      }
    });
  }

  // ------------------------------------------------------------------ loading
  private cancelRetry(kind: RetryKind): void {
    clearTimeout(this.retryTimers[kind]);
    this.retryTimers[kind] = undefined;
  }

  /** Failed requests recover after a growing delay, without showing banners over combat. */
  private scheduleRetry(kind: RetryKind): void {
    if (this.retryTimers[kind]) return;
    if (kind === 'banner' && (!this.wantBanner || this.noAds)) return;
    if (kind === 'interstitial' && this.noAds) return;
    const delay = RETRY_MS[Math.min(this.retries[kind], RETRY_MS.length - 1)];
    this.retries[kind] += 1;
    this.retryTimers[kind] = setTimeout(() => {
      this.retryTimers[kind] = undefined;
      switch (kind) {
        case 'init': void this.init(); break;
        case 'banner': if (this.wantBanner && !this.noAds) void this.showBanner(); break;
        case 'interstitial': void this.loadInterstitial(); break;
        case 'rewarded': void this.loadRewarded(); break;
      }
    }, delay);
  }

  // ------------------------------------------------------------------ interstitial
  private async loadInterstitial(): Promise<void> {
    if (!this.ready || this.noAds) return;
    this.setStatus('interstitial', 'Loading');
    try {
      await AdMob.prepareInterstitial({ adId: adUnitId('interstitial'), isTesting: false });
      this.interstitialLoaded = !this.noAds;
      this.setStatus('interstitial', this.noAds ? 'Disabled' : 'Ready');
      this.retries.interstitial = 0;
    } catch (err) {
      this.interstitialLoaded = false;
      this.setStatus('interstitial', 'Failed', err);
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
    await this.presentInterstitial(true);
  }

  private async presentInterstitial(countBreak: boolean): Promise<boolean> {
    this.showing = true;
    this.interstitialLoaded = false;
    this.audio()?.setPaused(true);
    try {
      const { displayed } = await this.playFullScreen('interstitial');
      if (displayed && countBreak) {
        this.save().shop.lastInterstitialAt = Date.now();
        this.interstitialsShown += 1;
        if (this.interstitialsShown % MONETIZATION.removeAdsHintEvery === 0) this.onRemoveAdsHint?.();
      }
      return displayed;
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
    this.setStatus('rewarded', 'Loading');
    try {
      await AdMob.prepareRewardVideoAd({ adId: adUnitId('rewarded'), isTesting: false });
      this.rewardedLoaded = true;
      this.setStatus('rewarded', 'Ready');
      this.retries.rewarded = 0;
    } catch (err) {
      this.rewardedLoaded = false;
      this.setStatus('rewarded', 'Failed', err);
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
    this.rewardedLoaded = false;
    this.audio()?.setPaused(true);
    let earned = false;
    let displayed = false;
    try {
      ({ earned, displayed } = await this.playFullScreen('rewarded'));
    } finally {
      this.showing = false;
      this.rewardedLoaded = false;
      // No full-screen ad straight after a video the player chose to watch.
      if (displayed) this.save().shop.lastInterstitialAt = Date.now();
      this.audio()?.setPaused(false);
      void this.loadRewarded();
    }
    return earned;
  }

  private async playFullScreen(kind: 'interstitial' | 'rewarded'): Promise<{ displayed: boolean; earned: boolean }> {
    let displayed = false;
    let earned = false;
    let finish!: () => void;
    const dismissed = new Promise<void>((resolve) => { finish = resolve; });
    const handles: PluginListenerHandle[] = [];
    const failed = (err: unknown) => {
      this.setStatus(kind, 'Failed', err);
      console.warn(`[ads] ${kind} show failed`, err);
      finish();
    };
    const showed = () => {
      displayed = true; this.counts[kind] += 1; this.setStatus(kind, 'Showing');
    };
    const closed = () => { this.setStatus(kind, 'Closed'); finish(); };
    try {
      handles.push(...await Promise.all([
        kind === 'interstitial' ? AdMob.addListener(InterstitialAdPluginEvents.Showed, showed) : AdMob.addListener(RewardAdPluginEvents.Showed, showed),
        kind === 'interstitial' ? AdMob.addListener(InterstitialAdPluginEvents.Dismissed, closed) : AdMob.addListener(RewardAdPluginEvents.Dismissed, closed),
        kind === 'interstitial' ? AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, failed) : AdMob.addListener(RewardAdPluginEvents.FailedToShow, failed),
        ...(kind === 'rewarded' ? [AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (!earned) this.counts.rewardsEarned += 1;
          earned = true;
        })] : []),
      ]));
      void (kind === 'interstitial' ? AdMob.showInterstitial() : AdMob.showRewardVideoAd()).catch(failed);
      await dismissed;
    } catch (err) {
      failed(err);
    } finally {
      await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
    }
    return { displayed, earned };
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
    this.cancelRetry('interstitial');
    void this.queueBanner(async () => {
      if (this.bannerCreated) await AdMob.removeBanner().catch(() => undefined);
      this.bannerCreated = false;
      this.bannerVisible = false;
    });
    this.interstitialLoaded = false;
  }
}
