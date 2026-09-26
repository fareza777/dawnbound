import {
  AbsoluteFill,
  Img,
  Audio,
  Sequence,
  staticFile,
  interpolate,
} from "remotion";
import { Backdrop } from "./Visuals";
import { PromoScene } from "./scenes/PromoScene";
import { Hook } from "./scenes/Hook";
import { Finale } from "./scenes/Finale";
export const cards = [
  [
    "FALL. RISE.",
    "RETURN STRONGER.",
    "A new descent. A stronger you.",
    "s4_combat.png",
    "#ffca70",
  ],
  [
    "ONE THUMB.",
    "ALL ACTION.",
    "Dash. Strike. Unleash your Flare.",
    "combat-fresh.png",
    "#ffae65",
  ],
  [
    "YOUR BUILD.",
    "YOUR RULES.",
    "Combine spirit boons. Find your synergy.",
    "s5_levelup.png",
    "#c4a0ff",
  ],
  [
    "FACE THE",
    "DEPTHS.",
    "Deadly bosses. No easy way through.",
    "s6_boss.png",
    "#ff9985",
  ],
  [
    "EVERY PATH",
    "IS A GAMBLE.",
    "Fight, rest, explore. Choose your descent.",
    "s3_map.png",
    "#aeb8ff",
  ],
  [
    "FOUR HEROES.",
    "FIND YOURS.",
    "Different weapons. Different ways to win.",
    "hero_rowan.png",
    "#87e0d2",
  ],
  [
    "CHASE THE",
    "PERFECT DROP.",
    "Loot. Equip. Forge your next advantage.",
    "s7_inventory.png",
    "#ffe19b",
  ],
  [
    "KEEP THE",
    "FLAME ALIVE.",
    "A village to return to. A dawn to reclaim.",
    "s2_dialogue.png",
    "#ffcd87",
  ],
];
const font = "Arial, sans-serif";
export const StoreCard = ({ index = 0 }: { index?: number }) => {
  const c = cards[index];
  return (
    <AbsoluteFill
      style={{ fontFamily: font, color: "#fff7e8", overflow: "hidden" }}
    >
      <Backdrop />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 66,
          fontSize: 23,
          letterSpacing: 5,
          color: "#d0bed8",
        }}
      >
        DAWNBOUND{" "}
        <span style={{ color: c[4] }}>
          {" "}
          / {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 145,
          left: 70,
          right: 55,
          fontSize: index === 0 ? 86 : 96,
          fontWeight: 900,
          lineHeight: 1.02,
          letterSpacing: -4,
        }}
      >
        {c[0]}
        <br />
        <span style={{ color: c[4] }}>{c[1]}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 76,
          top: 375,
          right: 60,
          fontSize: 31,
          color: "#ddd3e1",
        }}
      >
        {c[2]}
      </div>
      <div
        style={{
          position: "absolute",
          left: 180,
          top: 490,
          width: 720,
          height: 1280,
          boxShadow: `0 0 0 2px ${c[4]}70,0 28px 90px #000`,
          overflow: "hidden",
          borderRadius: 18,
        }}
      >
        <Img
          src={staticFile(c[3])}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#0b0c19",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          bottom: 60,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          letterSpacing: 3,
          color: "#a99fb6",
        }}
      >
        <span>PIXEL ACTION ROGUELITE</span>
        <span style={{ color: c[4] }}>THE LAST LANTERN</span>
      </div>
    </AbsoluteFill>
  );
};
export const Feature = () => (
  <AbsoluteFill style={{ background: "#090b1a" }}>
    <Img
      src={staticFile("key-art.png")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(90deg,rgba(5,7,20,.5),transparent 75%)",
      }}
    />
    <div style={{ position: "absolute", left: 58, top: 183 }}>
      <div
        style={{
          fontFamily: "Georgia,serif",
          fontSize: 63,
          color: "#ffe2a7",
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: "0 4px 18px #000",
        }}
      >
        DAWNBOUND
      </div>
      <div
        style={{
          fontFamily: font,
          color: "#e5d8ee",
          fontSize: 16,
          letterSpacing: 8,
          marginTop: 16,
        }}
      >
        THE LAST LANTERN
      </div>
    </div>
  </AbsoluteFill>
);
export const Icon = () => (
  <AbsoluteFill>
    <Img
      src={staticFile("icon-master.png")}
      style={{ width: "100%", height: "100%" }}
    />
  </AbsoluteFill>
);
export const Trailer = () => (
  <AbsoluteFill>
    <Audio
      src={staticFile("music.mp3")}
      volume={(f) =>
        interpolate(f, [0, 15, 780, 840], [0, 0.7, 0.7, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
    <Sequence durationInFrames={90}>
      <Hook />
    </Sequence>
    <Sequence from={90} durationInFrames={150}>
      <PromoScene
        headline="ONE THUMB."
        accent="ALL ACTION."
        sub="Dash through danger. Unleash your Flare."
        asset="combat.mp4"
        video
      />
    </Sequence>
    <Sequence from={240} durationInFrames={150}>
      <PromoScene
        headline="YOUR BUILD."
        accent="YOUR RULES."
        sub="Combine spirit boons. Discover your synergy."
        asset="s5_levelup.png"
      />
    </Sequence>
    <Sequence from={390} durationInFrames={120}>
      <PromoScene
        headline="FACE THE"
        accent="DEPTHS."
        sub="Deadly bosses stand between you and the dawn."
        asset="s6_boss.png"
      />
    </Sequence>
    <Sequence from={510} durationInFrames={150}>
      <PromoScene
        headline="EVERY PATH"
        accent="A NEW CHANCE."
        sub="Choose your route. Bring home your next upgrade."
        asset="s3_map.png"
      />
    </Sequence>
    <Sequence from={660} durationInFrames={180}>
      <Finale />
    </Sequence>
  </AbsoluteFill>
);
