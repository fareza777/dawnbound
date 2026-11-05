# Dawnbound — 30 TikTok cuts

Portrait 1080×1920 · 30 fps · 15–30 s · English copy · Remotion.

Every clip is built from **real gameplay** recorded out of the QA build of this repository, not from
mock-ups. The footage lives in `public/clips` (silent H.264) and `public/stills` (1080×1920 PNG),
and each video is plain data in `src/tiktoks.ts` / `src/tiktoks2.ts` rendered through the five
templates in `src/formats.tsx`.

## Re-running

```bash
npm run qa                      # in the repo root: builds dist-qa with the dev hooks
node scripts/capture.mjs        # records every scenario, ~25 min, overwrites public/clips
node scripts/render-all.mjs     # bundles once, renders all 30 to out/, ~1 h
node scripts/verify.mjs         # ffmpeg-probes out/: size, fps, length, audio peak
node scripts/deliver.mjs        # copies to D:\Video Games Upload\… and checks SHA256
node scripts/posting-sheet.mjs  # writes posting-sheet.md with hooks and hashtags
```

`node scripts/still.mjs <slugFilter> [seconds...]` renders single frames — the fast way to review
a layout before committing to a full render.

## Rules the layout obeys

- **Text safe box** (`TEXT` in `src/brand.ts`): 76–872 px horizontally, nothing below 1560 px.
  TikTok paints its action rail on the right and its own caption across the bottom.
- **No overlapping type.** The hook fades out before the first caption appears, and a beat that
  carries a callout ring never drifts (rings are pinned to `move: 'none'`).
- **Headlines are measured, not assumed.** `fitSize()` renders the string through the canvas metrics
  and shrinks it until the widest line fits the box, so a long hook can never run under the rail.
- **Audio is deliberately quiet**: the game's own music bed plays at 0.50 gain with fades (peaks near −10 dB), and
  `verify.mjs` fails any export whose peak exceeds −8 dB.
- Callout coordinates are source pixels measured against a 108×192 grid overlay on the matching
  still in `public/stills`. Move the still, re-measure the ring.

## Deliverables

`out/*.mp4` are the masters. `VALIDATION.json` (written by `verify.mjs`) records duration, frame
count, peak level and SHA256 per file; the delivery folder gets the same hashes in `SHA256.json`.
