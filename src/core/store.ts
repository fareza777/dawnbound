/**
 * Google Play one-time purchase: "Remove Ads". The entitlement is cached in the save (works offline) and re-checked
 * against the Play Store on every launch, so reinstalls and new devices restore it automatically.
 */
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { MONETIZATION } from '@/config/monetization';

export type PurchaseResult = 'ok' | 'cancelled' | 'error' | 'unavailable';

const SIMULATED = import.meta.env.DEV || import.meta.env.VITE_QA === '1';

export class Store {
  readonly native = Capacitor.isNativePlatform();
  /** Localized price from Google Play once loaded. */
  price: string = MONETIZATION.removeAdsFallbackPrice;
  private billing = false;

  /** @param onOwned called with the entitlement state whenever the store confirms it. */
  constructor(private onOwned: (owned: boolean) => void) {}

  /** Whether the purchase button should be offered. */
  get available(): boolean {
    return this.native ? this.billing : SIMULATED;
  }

  async init(): Promise<void> {
    if (!this.native) return;
    try {
      const { isBillingSupported } = await NativePurchases.isBillingSupported();
      this.billing = isBillingSupported;
      if (!isBillingSupported) return;
      const { products } = await NativePurchases.getProducts({ productIdentifiers: [MONETIZATION.removeAdsSku], productType: PURCHASE_TYPE.INAPP });
      if (products[0]?.priceString) this.price = products[0].priceString;
      // Purchases that complete later (e.g. pending cash payments) arrive here.
      void NativePurchases.addListener('transactionUpdated', (tx) => {
        if (tx.productIdentifier === MONETIZATION.removeAdsSku && (tx.purchaseState === undefined || tx.purchaseState === '1')) this.onOwned(true);
      });
      await this.refresh();
    } catch (err) {
      console.warn('[store] init', err);
    }
  }

  /** Ask Google Play which products this account owns. */
  async refresh(): Promise<boolean> {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    // On Android purchaseState "1" means PURCHASED ("2" is pending, e.g. cash payment not completed yet).
    const owned = purchases.some((p) => p.productIdentifier === MONETIZATION.removeAdsSku && (p.purchaseState === undefined || p.purchaseState === '1'));
    this.onOwned(owned);
    return owned;
  }

  async buyRemoveAds(): Promise<PurchaseResult> {
    if (!this.native) {
      if (!SIMULATED) return 'unavailable';
      this.onOwned(true);
      return 'ok';
    }
    if (!this.billing) return 'unavailable';
    try {
      const tx = await NativePurchases.purchaseProduct({ productIdentifier: MONETIZATION.removeAdsSku, productType: PURCHASE_TYPE.INAPP });
      if (tx.purchaseState !== undefined && tx.purchaseState !== '1') return 'error';
      this.onOwned(true);
      return 'ok';
    } catch (err) {
      const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
      if (msg.includes('cancel')) return 'cancelled';
      console.warn('[store] purchase', err);
      return 'error';
    }
  }

  async restore(): Promise<boolean> {
    if (!this.native) return false;
    try {
      await NativePurchases.restorePurchases();
      return await this.refresh();
    } catch (err) {
      console.warn('[store] restore', err);
      return false;
    }
  }
}
