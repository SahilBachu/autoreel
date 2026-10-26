import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { F2 } from "../auto/theme";
import { X } from "./kit";
import { useGeistFonts } from "../auto/fonts2";

// THE EXPLAINER COVER — one look for the whole series so the grid reads as a set: the video's
// key 3D moment, the title big at the top with the key words in the same Figma-style selection
// box the captions use, and a small series tag. Everything that matters sits inside the 3:4
// centre band the profile grid shows (y ≈ 240-1680).
export type CoverProps = {
  title: string; // mark the key words with *asterisks*
  image: string; // a frame of the video (public/ path)
  kicker?: string;
  shift?: number; // px to push the frame down (so its own captions hide under the title band)
};

const Handles: React.FC = () => {
  const h = (pos: React.CSSProperties) => <div style={{ position: "absolute", width: 20, height: 20, background: "#fff", border: `4px solid ${X.select}`, borderRadius: 3, ...pos }} />;
  return (
    <>
      {h({ left: -12, top: -12 })}
      {h({ right: -12, top: -12 })}
      {h({ left: -12, bottom: -12 })}
      {h({ right: -12, bottom: -12 })}
    </>
  );
};

export const ExplainerCover: React.FC<CoverProps> = ({ title, image, kicker = "HOW IT ACTUALLY WORKS", shift = 260 }) => {
  useGeistFonts();
  const parts = title.split(/(\*[^*]+\*)/).filter(Boolean);
  const len = title.replace(/\*/g, "").length;
  // the boxed phrase never wraps: shrink the whole title until it fits on one line (~880 px)
  const emLen = Math.max(0, ...parts.filter((p) => p.startsWith("*")).map((p) => p.length - 2));
  const size = Math.min(len > 34 ? 112 : len > 24 ? 128 : 144, emLen ? Math.floor(860 / (emLen * 0.6)) : 999);
  return (
    <AbsoluteFill style={{ background: X.bg }}>
      <Img src={staticFile(image)} style={{ position: "absolute", left: 0, top: shift, width: 1080, height: 1920, objectFit: "cover" }} />
      {/* the title band: the frame fades into the studio black behind the words */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${X.bg} 0%, ${X.bg} 34%, rgba(10,11,14,0.75) 46%, rgba(10,11,14,0) 60%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 85% at 50% 60%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
      <div style={{ position: "absolute", left: 90, right: 90, top: 300, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F2.mono, fontSize: 30, letterSpacing: "0.14em", color: X.dim, marginBottom: 40 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: X.gold, boxShadow: `0 0 18px ${X.gold}` }} />
          {kicker}
        </div>
        <div style={{ fontFamily: F2.sans, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: "-0.03em", color: X.text }}>
          {parts.map((p, i) =>
            p.startsWith("*") ? (
              <span key={i} style={{ position: "relative", display: "inline-block", padding: "0 14px", margin: "6px 4px", whiteSpace: "nowrap" }}>
                <span style={{ position: "absolute", inset: 0, border: `5px solid ${X.select}`, background: "rgba(13,153,255,0.18)" }}>
                  <Handles />
                </span>
                <span style={{ position: "relative" }}>{p.slice(1, -1)}</span>
              </span>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
