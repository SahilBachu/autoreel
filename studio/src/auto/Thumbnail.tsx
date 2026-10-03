import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AccentProvider, resolveAccent, T, useAccent } from "./theme";
import { useGeistFonts } from "./fonts2";
import { Logo, getLogo } from "./logos";
import { planTitle } from "./title";
import type { AutoReelData } from "./AutoReel";

// THE COVER — one consistent look for every reel's thumbnail: a real frame of him, graded, with
// the hook's title set big over the top. Same title, emphasis word and logo as the video's intro
// (planTitle), so the cover and the first second match.
//
// Instagram shows the full 9:16 in the reels tab but crops the profile grid to the centre 3:4
// (y 240-1680), so the title and his face both live inside that band.

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

type Props = AutoReelData & { thumbSrc?: string };

const Cover: React.FC<Props> = ({ thumbSrc, scenes, title, titleKicker, titleEmphasis }) => {
  const a = useAccent();
  const { title: tp } = planTitle(scenes ?? [], { title, titleKicker, titleEmphasis });
  const text = (tp?.text ?? title ?? "").trim();
  const emphasis = (tp?.emphasis ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const brand = tp?.brand && getLogo(tp.brand) ? tp.brand : undefined;
  const kicker = tp?.kicker;

  const words = text.split(/\s+/).filter(Boolean);
  // big and blunt: fewer characters → bigger type, 2-3 lines inside the safe band
  const size = Math.round(Math.max(104, Math.min(168, 1500 / Math.max(10, text.length) * 1.55)));

  return (
    <AbsoluteFill style={{ background: T.bg }}>
      {thumbSrc ? (
        <Img
          src={asset(thumbSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.08) saturate(1.06) brightness(0.92)" }}
        />
      ) : null}
      {/* grade: the ceiling darkens behind the type, a soft vignette, a little floor */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.78) 22%, rgba(5,5,7,0.25) 42%, rgba(5,5,7,0) 55%, rgba(5,5,7,0) 72%, rgba(5,5,7,0.55) 100%)",
        }}
      />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 260px 40px rgba(0,0,0,0.55)" }} />

      <AbsoluteFill style={{ alignItems: "center", padding: "270px 64px 0" }}>
        {brand || kicker ? (
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
            {brand ? (
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 24,
                  background: "linear-gradient(180deg, #1C1C22, #101014)",
                  border: `1px solid ${T.border}`,
                  boxShadow: `0 18px 40px -16px rgba(0,0,0,0.9), 0 0 0 1px ${a.dim}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Logo name={brand} size={54} />
              </div>
            ) : null}
            {kicker ? (
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 34,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: a.hex,
                  textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                }}
              >
                {kicker}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            fontFamily: "Geist, sans-serif",
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
            color: "#FFFFFF",
            textAlign: "center",
            textWrap: "balance",
            textShadow: "0 6px 34px rgba(0,0,0,0.75)",
            maxWidth: 952,
          }}
        >
          {words.map((w, i) => {
            const hot = emphasis && w.toLowerCase().replace(/[^a-z0-9]/g, "") === emphasis;
            return (
              <React.Fragment key={i}>
                {hot ? (
                  <span
                    style={{
                      color: "#0A0A0C",
                      background: a.hex,
                      padding: "0 0.14em 0.04em",
                      borderRadius: "0.12em",
                      boxShadow: `0 10px 40px -10px ${a.glow}`,
                      textShadow: "none",
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                    }}
                  >
                    {w}
                  </span>
                ) : (
                  w
                )}
                {i < words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Thumbnail: React.FC<Props> = (p) => {
  useGeistFonts();
  return (
    <AccentProvider value={resolveAccent(p.accent)}>
      <Cover {...p} />
    </AccentProvider>
  );
};
