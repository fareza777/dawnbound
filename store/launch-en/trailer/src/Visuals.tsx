import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
const font = "Arial, sans-serif";
export const Dust = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 37) % 100}%`,
            top: `${(i * 23 - f * (0.025 + (i % 3) * 0.012) + 100) % 100}%`,
            width: (i % 3) + 2,
            height: (i % 3) + 2,
            background: i % 2 ? "#ffc978" : "#ac8cff",
            opacity: 0.22 + (i % 3) * 0.15,
            boxShadow: "0 0 12px #ffa83c",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
export const Backdrop = () => (
  <>
    <AbsoluteFill style={{ background: "#080a19" }} />
    <Img
      src={staticFile("key-art.png")}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 0.38,
      }}
    />
    <AbsoluteFill
      style={{ background: "linear-gradient(180deg,rgba(8,10,25,.2),#080a19)" }}
    />
    <Dust />
  </>
);
export const Brand = ({ large = false }: { large?: boolean }) => (
  <div
    style={{
      fontFamily: "Georgia,serif",
      fontWeight: 700,
      color: "#ffe0a2",
      letterSpacing: large ? 5 : 3,
      fontSize: large ? 96 : 32,
      textShadow: "0 3px 20px #000",
    }}
  >
    DAWNBOUND
    <div
      style={{
        fontFamily: font,
        fontWeight: 400,
        fontSize: large ? 25 : 12,
        letterSpacing: large ? 10 : 5,
        marginTop: 12,
        color: "#e2d9dc",
      }}
    >
      THE LAST LANTERN
    </div>
  </div>
);
