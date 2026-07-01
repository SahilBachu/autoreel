import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { DecryptText, Kicker, Scene, useEnter } from "./fx";

// ── text scenes — Geist, tight tracking, accent used sparingly ────────────────

const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// big hook headline; one word gets the accent (glowing text, no box)
export const Headline: React.FC<{ text: string; emphasis?: string; kicker?: string }> = ({ text, emphasis, kicker }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const size = Math.max(72, Math.min(148, Math.round(2000 / Math.max(text.length, 10))));
  return (
    <Scene bg="shader">
      <div style={{ textAlign: "center", maxWidth: 980 }}>
        {kicker ? <Kicker text={kicker} /> : null}
        <div style={{ lineHeight: 1.04 }}>
          {words.map((w, i) => {
            const e = spr(f, fps, 3 + i * 3, { damping: 18 });
            const emph = emphasis && norm(w) === norm(emphasis);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  margin: "4px 12px",
                  fontFamily: F2.sans,
                  fontWeight: 700,
                  fontSize: size,
                  letterSpacing: "-0.035em",
                  color: emph ? a.hex : T.text,
                  textShadow: emph ? `0 0 42px ${a.glow}` : "none",
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// scramble-reveal hero line (the encrypted-text effect)
export const Decrypt: React.FC<{ text: string; sub?: string; kicker?: string }> = ({ text, sub, kicker }) => {
  const size = Math.max(56, Math.min(110, Math.round(1500 / Math.max(text.length, 10))));
  return (
    <Scene bg="grid">
      <div style={{ maxWidth: 960, textAlign: "center" }}>
        {kicker ? <Kicker text={kicker} /> : null}
        <DecryptText text={text} size={size} />
        {sub ? <div style={{ fontFamily: F2.sans, fontSize: 40, color: T.dim, marginTop: 34 }}>{sub}</div> : null}
      </div>
    </Scene>
  );
};

// full-screen punch line, word-by-word pop
export const Callout: React.FC<{ text: string; emphasis?: string }> = ({ text, emphasis }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const size = Math.max(76, Math.min(124, Math.round(1700 / Math.max(text.length, 9))));
  return (
    <Scene bg="shader">
      <div style={{ textAlign: "center", maxWidth: 960 }}>
        {words.map((w, i) => {
          const e = spr(f, fps, 2 + i * 4, { damping: 15, stiffness: 170 });
          const emph = emphasis && norm(w) === norm(emphasis);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: "4px 12px",
                fontFamily: F2.sans,
                fontWeight: 700,
                fontSize: size,
                letterSpacing: "-0.03em",
                color: emph ? a.hex : T.text,
                textShadow: emph ? `0 0 40px ${a.glow}` : "none",
                opacity: e,
                transform: `scale(${interpolate(e, [0, 1], [0.55, 1])})`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </Scene>
  );
};

// dry aside with the key phrase in an accent chip
export const Quote: React.FC<{ pre: string; boxed: string; post?: string }> = ({ pre, boxed, post }) => {
  const a = useAccent();
  const e = useEnter(0);
  return (
    <Scene bg="plain">
      <div style={{ textAlign: "center", maxWidth: 950, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [26, 0])}px)` }}>
        <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 96, lineHeight: 1.16, letterSpacing: "-0.03em", color: T.text }}>
          {pre}{" "}
          <span
            style={{
              background: a.soft,
              border: `1px solid ${a.dim}`,
              color: a.hex,
              borderRadius: 18,
              padding: "0 22px",
              display: "inline-block",
              boxShadow: `0 0 60px -12px ${a.glow}`,
              whiteSpace: "nowrap",
            }}
          >
            {boxed}
          </span>
          {post ? ` ${post}` : ""}
        </span>
      </div>
    </Scene>
  );
};
