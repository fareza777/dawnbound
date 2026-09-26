/** Accessibility switches from Settings, read live so changes apply without a restart. */
import { services } from './services';

export const a11y = {
  /** No screen shake, softer hurt flash, no dash trails. */
  get reduceMotion(): boolean {
    return !!services.save?.data.settings.reduceMotion;
  },
  /** Poison shown in blue-violet instead of green, so it never reads like burn for red-green colour blindness. */
  get colorblind(): boolean {
    return !!services.save?.data.settings.colorblind;
  },
};
