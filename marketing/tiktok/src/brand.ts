export const FPS = 30;
export const W = 1080;
export const H = 1920;

/**
 * TikTok paints its own action rail down the right edge and its caption/description across the bottom,
 * so every word we draw has to live inside this box. `bottom` is the hard floor for text, not a margin.
 */
export const TEXT = { left: 76, right: 872, top: 150, hookTop: 168, captionTop: 1292, bottom: 1560 };

export const HOOK_S = 2.2;
export const CTA_S = 3.4;

/** Night indigo, lantern amber, dawn coral — the launch-pack palette. */
export const INK = {
  night: '#0b0a14',
  deep: '#141026',
  cream: '#f9efdc',
  amber: '#ffd390',
  coral: '#ff8a6b',
  violet: '#bc9fe9',
  dim: '#b9a8cf',
};

export const FONTS = {
  display: "'DawnDisplay', monospace",
  body: "'DawnTerminal', monospace",
  label: "'DawnLabel', monospace",
};

export type Format = 'hook-card' | 'montage' | 'ken-burns' | 'callout' | 'ambient-loop';

export type Callout = { x: number; y: number; r: number; label?: string };

export type Beat = {
  clip?: string;
  still?: string;
  seconds: number;
  rate?: number;
  move?: 'none' | 'in' | 'out' | 'pan-left' | 'pan-right';
  caption?: string;
  callout?: Callout;
};

export type Brief = {
  id: string;
  slug: string;
  name: string;
  format: Format;
  /** `*accent*` spans render in dawn coral. */
  hook: string;
  audio: string;
  /** Gain multiplier for this cut; the mix is deliberately low, see Soundtrack. */
  loud?: number;
  beats: Beat[];
  cta: string;
  eyebrow?: string;
};

export const seconds = (b: Brief) =>
  (b.format === 'hook-card' ? HOOK_S : 0) + b.beats.reduce((s, x) => s + x.seconds, 0) + CTA_S;

export const framesOf = (b: Brief) => Math.round(seconds(b) * FPS);
