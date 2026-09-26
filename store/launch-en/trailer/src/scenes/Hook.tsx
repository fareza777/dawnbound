import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Dust } from "../Visuals";
const font = "Arial, sans-serif";
export const Hook = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = height > width;
  const word = f < 24 ? "FALL." : f < 48 ? "RISE." : "RETURN STRONGER.";
  return (
    <AbsoluteFill
      style={{
        background: "#070914",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("key-art.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.55,
          scale: interpolate(f, [0, 90], [1, 1.12]),
        }}
      />
      <Dust />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(0deg,#080a19aa,transparent,#080a1999)",
        }}
      />
      <div
        style={{
          fontFamily: font,
          fontSize: p ? (f < 48 ? 188 : 130) : f < 48 ? 225 : 155,
          fontWeight: 900,
          lineHeight: 1,
          color: f < 24 ? "#fff5e5" : "#ffcb78",
          textAlign: "center",
          maxWidth: p ? 950 : 1750,
          letterSpacing: -5,
          scale: interpolate(f % 24, [0, 7, 23], [1.1, 1, 1]),
          textShadow: "0 6px 45px #000",
        }}
      >
        {word}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: p ? 240 : 170,
          fontSize: p ? 34 : 30,
          color: "#e1d8e9",
          fontFamily: font,
          letterSpacing: 5,
        }}
      >
        DEATH IS ONLY THE BEGINNING.
      </div>
    </AbsoluteFill>
  );
};
