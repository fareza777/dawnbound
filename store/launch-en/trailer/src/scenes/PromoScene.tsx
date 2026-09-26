import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Backdrop, Brand } from "../Visuals";
const font = "Arial, sans-serif";
export const PromoScene = ({
  headline,
  accent,
  sub,
  asset,
  video = false,
}: {
  headline: string;
  accent: string;
  sub: string;
  asset: string;
  video?: boolean;
}) => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const p = height > width;
  const enter = spring({ frame: f, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill
      style={{ fontFamily: font, color: "#fff5e5", overflow: "hidden" }}
    >
      <Backdrop />
      <div
        style={{ position: "absolute", left: p ? 80 : 105, top: p ? 95 : 105 }}
      >
        <Brand />
      </div>
      <div
        style={{
          position: "absolute",
          left: p ? 80 : 105,
          top: p ? 230 : 320,
          width: p ? 940 : 970,
          translate: `0 ${(1 - enter) * 45}px`,
          opacity: enter,
        }}
      >
        <div
          style={{
            fontSize: p ? 98 : 105,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          {headline}
          <br />
          <span style={{ color: "#ffcb78" }}>{accent}</span>
        </div>
        <div
          style={{
            fontSize: p ? 38 : 36,
            lineHeight: 1.3,
            marginTop: 32,
            maxWidth: p ? 880 : 710,
            color: "#d3c7e0",
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          width: p ? 660 : 500,
          height: p ? 1173 : 889,
          left: p ? 210 : 1240,
          top: p ? 620 : 95,
          overflow: "hidden",
          borderRadius: 18,
          boxShadow: "0 0 0 2px #c7936444,0 20px 70px #000",
          scale: interpolate(f, [0, 150], [0.97, 1.02], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {video ? (
          <OffthreadVideo
            muted
            src={staticFile(asset)}
            startFrom={0}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Img
            src={staticFile(asset)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#090b1a",
            }}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: p ? 80 : 105,
          bottom: p ? 58 : 90,
          color: "#a99eb4",
          fontSize: p ? 24 : 22,
          letterSpacing: 4,
        }}
      >
        PIXEL ACTION ROGUELITE
      </div>
    </AbsoluteFill>
  );
};
