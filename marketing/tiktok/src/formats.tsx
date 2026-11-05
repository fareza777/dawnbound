import { useEffect, useState } from 'react';
import { Audio, AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CTA_S, FONTS, HOOK_S, INK, TEXT, framesOf, type Beat, type Brief } from './brand';
import { fontsReady } from './fonts';

const full = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;

// Only the bands that carry type get darkened, so the gameplay itself stays bright.
const SCRIM =
  `linear-gradient(180deg, rgba(11,10,20,.90) 0%, rgba(11,10,20,.55) 12%, rgba(11,10,20,0) 24%, ` +
  `rgba(11,10,20,0) 58%, rgba(11,10,20,.40) 70%, rgba(11,10,20,.84) 82%, rgba(11,10,20,.94) 100%)`;

const fadeAt = (frame: number, inAt: number, outAt?: number) => {
  const rise = interpolate(frame, [0, inAt], [0, 1], { extrapolateLeft: 'clamp' });
  if (outAt === undefined) return rise;
  return rise * interpolate(frame, [outAt, outAt + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/** Splits `FACE THE *DEPTHS*` into dawn-coral and cream runs. */
const runs = (text: string) =>
  text.split(/(\*[^*]*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('*') && part.endsWith('*') ? { t: part.slice(1, -1), hot: true } : { t: part, hot: false },
  );

const OUTLINE = {
  paintOrder: 'stroke fill' as const,
  WebkitTextStroke: `5px ${INK.night}`,
  textShadow: `0 4px 0 rgba(11,10,20,.85), 0 10px 34px rgba(0,0,0,.75)`,
};

/**
 * Pixel display fonts are far wider than they look, so headline size is fitted to the safe box
 * instead of being hard-coded — a long line shrinks rather than running under TikTok's action rail.
 */
const ctxOf = (() => {
  let c: CanvasRenderingContext2D | null = null;
  return () => (c ??= document.createElement('canvas').getContext('2d'));
})();

const fitCache = new Map<string, number>();

const fitSize = (text: string, family: string, maxW: number, base: number, min: number) => {
  const key = `${family}|${maxW}|${base}|${min}|${text}`;
  const hit = fitCache.get(key);
  if (hit !== undefined) return hit;
  const c = ctxOf();
  if (!c) return base;
  c.font = `100px ${family}`;
  const widest = Math.max(...text.split('\n').map((line) => c.measureText(line).width), 1);
  const size = Math.max(min, Math.min(base, (maxW / widest) * 100));
  fitCache.set(key, size);
  return size;
};

/** Text metrics are only meaningful once the pixel faces are in document.fonts. */
const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void fontsReady.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
};

const Hook = ({ text, until }: { text: string; until: number }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const rise = spring({ frame, fps, config: { damping: 17, mass: 0.9 } });
  const size = fitSize(text, FONTS.display, TEXT.right - TEXT.left, 132, 74);
  return (
    <div style={{ opacity: fadeAt(frame, 8, until), position: 'absolute', left: TEXT.left, top: TEXT.hookTop, transform: `translateY(${(1 - rise) * 30}px)` }}>
      <div
        style={{
          display: 'inline-block',
          maxWidth: TEXT.right - TEXT.left,
          padding: '26px 34px 34px',
          background: 'rgba(11,10,20,.82)',
          borderLeft: `9px solid ${INK.coral}`,
          borderRadius: '0 10px 10px 0',
          fontFamily: FONTS.display,
          fontSize: size,
          lineHeight: 0.96,
          letterSpacing: 1,
          whiteSpace: 'pre-line',
          color: INK.cream,
          ...OUTLINE,
        }}
      >
        {runs(text).map((r, i) => (r.hot ? <span key={i} style={{ color: INK.coral }}>{r.t}</span> : r.t))}
      </div>
    </div>
  );
};

const Caption = ({ text, delay }: { text?: string; delay: number }) => {
  const frame = useCurrentFrame();
  const opacity = fadeAt(frame, 8 + delay);
  if (!text) return null;
  const size = fitSize(text, FONTS.body, TEXT.right - TEXT.left - 60, 62, 44);
  return (
    <div style={{ opacity, position: 'absolute', left: TEXT.left, top: TEXT.captionTop, right: 1080 - TEXT.right }}>
      <div
        style={{
          display: 'inline-block',
          padding: '10px 26px 16px',
          borderLeft: `7px solid ${INK.coral}`,
          borderRadius: '0 6px 6px 0',
          background: 'rgba(11,10,20,.58)',
          fontFamily: FONTS.body,
          fontSize: size,
          lineHeight: 1.02,
          color: INK.amber,
          textShadow: `0 3px 0 rgba(11,10,20,.9)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Clip = ({ beat }: { beat: Beat }) => (
  /* Every beat is shorter than its source clip, so nothing here needs to loop. */
  <OffthreadVideo src={staticFile(`clips/${beat.clip}.mp4`)} muted playbackRate={beat.rate ?? 1} style={full} />
);

const MOVE: Record<NonNullable<Beat['move']>, [number, number, number, number, number, number]> = {
  none: [1, 1, 0, 0, 0, 0],
  in: [1.02, 1.2, 0, 0, 1.4, -1.4],
  out: [1.2, 1.02, 0, 0, -1.4, 1.4],
  'pan-left': [1.18, 1.18, 3.2, -3.2, 0, 0],
  'pan-right': [1.18, 1.18, -3.2, 3.2, 0, 0],
};

const Still = ({ beat, children }: { beat: Beat; children?: React.ReactNode }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, beat.seconds * fps - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [z0, z1, x0, x1, y0, y1] = MOVE[beat.move ?? (beat.callout ? 'none' : 'in')];
  return (
    <div style={{ ...full, overflow: 'hidden' }}>
      <div
        style={{
          ...full,
          transform: `scale(${interpolate(p, [0, 1], [z0, z1])}) translate(${interpolate(p, [0, 1], [x0, x1])}%, ${interpolate(p, [0, 1], [y0, y1])}%)`,
        }}
      >
        <Img src={staticFile(`stills/${beat.still}.png`)} style={{ ...full, objectFit: 'cover' }} />
        {children}
      </div>
    </div>
  );
};

const Ring = ({ beat }: { beat: Beat }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  if (!beat.callout) return null;
  const { x, y, r, label } = beat.callout;
  const grow = spring({ frame, fps, config: { damping: 13, stiffness: 120 } });
  const size = r * 2;
  const flip = x > 540;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          border: `6px solid ${INK.amber}`,
          boxShadow: `0 0 40px rgba(255,211,144,.55), inset 0 0 30px rgba(255,211,144,.3)`,
          opacity: interpolate(frame, [100, 118], [1, 0], { extrapolateLeft: 'clamp' }),
          transform: `scale(${0.55 + grow * 0.45})`,
        }}
      />
      {label ? (
        <div
          style={{
            position: 'absolute',
            top: y - 26,
            left: flip ? undefined : x + size / 2 + 18,
            right: flip ? 1080 - (x - size / 2 - 18) : undefined,
            textAlign: flip ? 'right' : 'left',
            fontFamily: FONTS.label,
            fontSize: 30,
            letterSpacing: 1,
            color: INK.night,
            background: INK.amber,
            padding: '8px 16px',
            borderRadius: 4,
            opacity: fadeAt(frame, 14),
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
};

const Eyebrow = ({ text }: { text: string }) => (
  <div
    style={{
      position: 'absolute',
      left: TEXT.left,
      top: 560,
      fontFamily: FONTS.label,
      fontSize: 30,
      letterSpacing: 8,
      color: INK.violet,
    }}
  >
    {text}
  </div>
);

const Card = ({ brief }: { brief: Brief }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const rise = spring({ frame, fps, config: { damping: 16 } });
  const size = fitSize(brief.hook, FONTS.display, TEXT.right - TEXT.left, 148, 80);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(75% 42% at 50% 30%, rgba(255,138,107,.20), transparent 70%), ${INK.night}` }}>
      <Eyebrow text={brief.eyebrow ?? 'DAWNBOUND'} />
      <div
        style={{
          position: 'absolute',
          left: TEXT.left,
          right: 1080 - TEXT.right,
          top: 700,
          fontFamily: FONTS.display,
          fontSize: size,
          lineHeight: 0.96,
          textAlign: 'center',
          color: INK.cream,
          whiteSpace: 'pre-line',
          transform: `translateY(${(1 - rise) * 38}px)`,
          opacity: rise,
          ...OUTLINE,
        }}
      >
        {runs(brief.hook).map((r, i) => (r.hot ? <span key={i} style={{ color: INK.coral }}>{r.t}</span> : r.t))}
      </div>
    </AbsoluteFill>
  );
};

const Cta = ({ brief }: { brief: Brief }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const inAt = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const grow = interpolate(frame, [0, CTA_S * fps], [0.965, 1], { extrapolateRight: 'clamp' });
  const mark = fitSize('DAWNBOUND', FONTS.display, 940, 168, 90);
  const line = fitSize(brief.cta, FONTS.body, TEXT.right - TEXT.left, 64, 40);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(65% 38% at 50% 26%, rgba(255,211,144,.22), transparent 72%), ${INK.night}` }}>
      <div
        style={{
          position: 'absolute',
          left: 250,
          top: 230,
          width: 580,
          height: 580,
          borderRadius: 56,
          overflow: 'hidden',
          opacity: inAt,
          transform: `scale(${grow})`,
          boxShadow: `0 0 0 4px rgba(255,211,144,.35), 0 26px 90px rgba(255,138,107,.35)`,
        }}
      >
        <Img src={staticFile('images/icon-master.png')} style={full} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 900,
          textAlign: 'center',
          fontFamily: FONTS.display,
          fontSize: mark,
          lineHeight: 1,
          color: INK.cream,
          opacity: inAt,
          ...OUTLINE,
        }}
      >
        DAWNBOUND
      </div>
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1088,
          textAlign: 'center',
          fontFamily: FONTS.label,
          fontSize: 34,
          letterSpacing: 10,
          color: INK.violet,
          opacity: inAt,
        }}
      >
        PIXEL ACTION ROGUELITE
      </div>
      <div
        style={{
          position: 'absolute',
          left: TEXT.left,
          right: 1080 - TEXT.right,
          top: 1210,
          textAlign: 'center',
          fontFamily: FONTS.body,
          fontSize: line,
          lineHeight: 1.05,
          color: INK.amber,
          opacity: inAt,
          textShadow: '0 3px 0 rgba(11,10,20,.9)',
        }}
      >
        {brief.cta}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1420,
          textAlign: 'center',
          fontFamily: FONTS.label,
          fontSize: 28,
          letterSpacing: 6,
          color: INK.dim,
          opacity: fadeAt(frame, 16),
        }}
      >
        FREE ON GOOGLE PLAY
      </div>
    </AbsoluteFill>
  );
};

/** A single amber frame on the cut, so fast montages read as deliberate edits. */
const CutFlash = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: INK.amber,
        opacity: interpolate(frame, [0, 1, 5], [0, 0.28, 0], { extrapolateRight: 'clamp' }),
      }}
    />
  );
};

const BeatStage = ({ beat, captionDelay }: { beat: Beat; captionDelay: number }) => (
  <>
    {beat.still ? <Still beat={beat}><Ring beat={beat} /></Still> : <Clip beat={beat} />}
    <AbsoluteFill style={{ background: SCRIM }} />
    <Caption text={beat.caption} delay={captionDelay} />
  </>
);

export const Stage = ({ brief }: { brief: Brief }) => {
  const { fps } = useVideoConfig();
  const ready = useFontsReady();
  const isCard = brief.format === 'hook-card';
  const intro = isCard ? Math.round(HOOK_S * fps) : 0;
  const durations = brief.beats.map((b) => Math.round(b.seconds * fps));
  const offsets = durations.map((_, i) => durations.slice(0, i).reduce((s, d) => s + d, 0));
  const beatSpan = durations.reduce((s, d) => s + d, 0);
  const hookUntil = Math.round(HOOK_S * fps) + 20;
  if (!ready) return null;

  return (
    <>
      {isCard ? (
        <Sequence durationInFrames={intro} name="Hook card">
          <Card brief={brief} />
        </Sequence>
      ) : null}

      <Sequence from={intro} durationInFrames={beatSpan} name="Beats">
        <AbsoluteFill style={{ background: INK.night }} />
        {brief.beats.map((beat, i) => (
          <Sequence key={`${beat.clip ?? beat.still}-${i}`} from={offsets[i]} durationInFrames={durations[i]} name={`Beat ${i + 1}`}>
            <BeatStage beat={beat} captionDelay={isCard || i > 0 ? 0 : Math.max(0, hookUntil - 2)} />
          </Sequence>
        ))}
        {offsets.slice(1).map((o, i) => (
          <Sequence key={`flash-${i}`} from={o} durationInFrames={6} name={`Cut ${i + 2}`}>
            <CutFlash />
          </Sequence>
        ))}
      </Sequence>

      {isCard ? null : (
        <Sequence durationInFrames={hookUntil} name="Hook overlay">
          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <Hook text={brief.hook} until={hookUntil} />
          </AbsoluteFill>
        </Sequence>
      )}

      <Sequence from={intro + beatSpan} durationInFrames={Math.round(CTA_S * fps)} name="Call to action">
        <Cta brief={brief} />
      </Sequence>
    </>
  );
};

/**
 * Quiet by design: the bed sits under the TikTok mix instead of fighting it. 0.5 keeps peaks near -10 dB,
 * which is audible on a phone speaker without ever clipping.
 */
export const Soundtrack = ({ brief }: { brief: Brief }) => {
  const total = framesOf(brief);
  const gain = 0.5 * (brief.loud ?? 1);
  return (
    <Audio
      src={staticFile(`audio/${brief.audio}.mp3`)}
      volume={(f) => interpolate(f, [0, 12, total - 30, total - 1], [0, gain, gain * 0.75, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
    />
  );
};
