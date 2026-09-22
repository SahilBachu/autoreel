import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import type { Scene } from "./scenes";

// ─────────────────────────────────────────────────────────────────────────────
// The opening: HIM, full frame and uncovered, with the video's title over him.
// "no matter what i want the first couple seconds to be me speaking with the title."
// Used by BOTH renderers. The title comes from the `title` prop, else from the first
// text scene (headline / decrypt / callout) the director put in the opening window —
// that scene is consumed (it would just repeat the title) and any other scene that
// starts inside the window is pushed to start after it. Nothing else covers the frame.
// ─────────────────────────────────────────────────────────────────────────────

export const TITLE_MS = 3200;
const TEXT_KINDS = new Set(["headline", "decrypt", "callout"]);

export type TitlePlan = { text: string; kicker?: string; emphasis?: string; endMs: number };
export type TitleOpts = { title?: string; titleKicker?: string; titleEmphasis?: string };

export function planTitle(scenes: Scene[], opts: TitleOpts): { title: TitlePlan | null; scenes: Scene[] } {
  const consumed = scenes.find((s) => s.startMs < TITLE_MS && TEXT_KINDS.has(s.kind) && typeof s.text === "string");
  const text = (opts.title ?? consumed?.text)?.trim();
  if (!text) return { title: null, scenes };
  // sync the title's exit to the director's beat when it planned one of sane length
  const endMs = consumed && consumed.endMs >= 2400 && consumed.endMs <= 4800 ? consumed.endMs : TITLE_MS;
  const rest: Scene[] = [];
  for (const s of scenes) {
    if (s === consumed) continue;
    if (s.startMs < endMs) {
      if (s.endMs - endMs < 400) continue; // nothing meaningful left of it
      rest.push({ ...s, startMs: endMs });
    } else rest.push(s);
  }
  return {
    title: { text, kicker: opts.titleKicker ?? consumed?.kicker, emphasis: opts.titleEmphasis ?? consumed?.emphasis, endMs },
    scenes: rest,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Sits in the upper third (the real clips have his hair from ~y480; captions from ~y1290).
// A top-down gradient darkens the ceiling behind the type only — it never reaches his face.
export const TitleOverlay: React.FC<{ text: string; kicker?: string; emphasis?: string; durF: number }> = ({ text, kicker, emphasis, durF }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/);
  const size = Math.max(64, Math.min(108, Math.round(1900 / Math.max(text.length, 12))));
  const out = interpolate(f, [durF - 11, durF - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ke = spring({ frame: f - 1, fps, config: { damping: 20, stiffness: 120 } });
  const bar = spring({ frame: f - 3, fps, config: { damping: 24, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ opacity: out, transform: `translateY(${(1 - out) * -22}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: "linear-gradient(180deg, rgba(5,5,7,0.78) 0%, rgba(5,5,7,0.52) 55%, rgba(5,5,7,0) 100%)" }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 128, textAlign: "center" }}>
        {kicker ? (
          <div style={{ fontFamily: F2.mono, fontSize: 25, letterSpacing: "0.28em", textTransform: "uppercase", color: a.hex, textShadow: `0 0 22px ${a.glow}`, marginBottom: 26, opacity: ke, transform: `translateY(${(1 - ke) * 12}px)` }}>
            {kicker}
          </div>
        ) : null}
        <div style={{ lineHeight: 1.02 }}>
          {words.map((w, i) => {
            const e = spring({ frame: f - (3 + i * 3), fps, config: { damping: 18, stiffness: 130, mass: 0.9 } });
            const emph = emphasis && norm(w) === norm(emphasis);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  margin: "2px 11px",
                  fontFamily: F2.sans,
                  fontWeight: 700,
                  fontSize: size,
                  letterSpacing: "-0.035em",
                  color: emph ? a.hex : T.text,
                  textShadow: emph ? `0 0 42px ${a.glow}, 0 2px 24px rgba(0,0,0,0.6)` : "0 2px 24px rgba(0,0,0,0.7)",
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {/* one accent hairline grows under the title — the brand's "one bright thing" */}
        <div style={{ margin: "30px auto 0", width: 120 * bar, height: 3, borderRadius: 2, background: a.hex, boxShadow: `0 0 18px ${a.glow}` }} />
      </div>
    </AbsoluteFill>
  );
};
