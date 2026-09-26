import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Dust, Brand } from "../Visuals";
const font = "Arial, sans-serif";
export const Finale = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = height > width;
  return (
    <AbsoluteFill
      style={{
        background: "#080a19",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff2db",
      }}
    >
      <Img
        src={staticFile("key-art.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.48,
          scale: interpolate(f, [0, 180], [1.02, 1.09]),
        }}
      />
      <Dust />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          marginTop: p ? -80 : 0,
        }}
      >
        <Img
          src={staticFile("icon-master.png")}
          style={{
            width: p ? 280 : 170,
            height: p ? 280 : 170,
            borderRadius: 36,
            marginBottom: p ? 55 : 30,
            boxShadow: "0 0 90px #ff9c3933",
          }}
        />
        <Brand large />
        <div style={{ fontFamily: font, fontSize: p ? 44 : 36, marginTop: 60 }}>
          Carry the flame. Reclaim the dawn.
        </div>
        <div
          style={{
            display: "inline-block",
            fontFamily: font,
            fontSize: p ? 33 : 27,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#ffd395",
            borderBottom: "2px solid #ffd395",
            padding: "22px 4px",
            marginTop: 25,
          }}
        >
          BEGIN YOUR DESCENT
        </div>
        <div
          style={{
            fontFamily: font,
            fontSize: p ? 26 : 22,
            color: "#d1c2db",
            letterSpacing: 3,
            marginTop: 35,
          }}
        >
          ANDROID · PLAY OFFLINE
        </div>
      </div>
    </AbsoluteFill>
  );
};
