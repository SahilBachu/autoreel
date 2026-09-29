import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { getLogo, Logo } from "./logos";
import { Sheen } from "./fx";
import type { Scene } from "./scenes";
import type { Word } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// The opening HOOK (motion v3) — shared by both renderers.
// "no matter what i want the first couple seconds to be me speaking with the title."
// "I don't like the first intro page with just the text on top."
//
// So it's a COMPOSED CARD in the upper-middle of the frame (centre y520 — over his hair and
// forehead; eyes and mouth stay visible), not text pinned to the top edge. Near-opaque dark
// glass, so it reads on any background (his wall is near-white):
//   1. the card rises in with a focus pull (blur → sharp) and a light sweep across it
//   2. the subject's REAL logo pops in a tile with one accent ripple; it pulses again the
//      moment he SAYS the brand. The kicker decrypts in mono beside it.
//   3. the whole title lands within ~1s, dimmed, so it reads at a glance — then each word
//      lights up exactly as he says it (word timings from the transcript); the emphasis
//      word turns accent and an accent underline wipes under it on the beat
//   4. it breathes (slow push + float) and leaves with a lift + blur as the reel moves on
// No logo known → an accent dot before the kicker; no kicker either → just the title.
//
// planTitle: the title comes from the `title` prop, else from the first text scene
// (headline / decrypt / callout) the director put in the opening window — that scene is
// consumed and anything else starting inside the window is pushed after it. The hook holds
// until he has finished SAYING the title (≤4.8s), so it never leaves mid-sentence.
// ─────────────────────────────────────────────────────────────────────────────

export const TITLE_MS = 3200;
const MIN_MS = 2400;
const MAX_MS = 4800;
const TEXT_KINDS = new Set(["headline", "decrypt", "callout"]);

export type TitlePlan = { text: string; kicker?: string; emphasis?: string; endMs: number; brand?: string };
export type TitleOpts = { title?: string; titleKicker?: string; titleEmphasis?: string };

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const same = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const sx = x.replace(/s$/, "");
  const sy = y.replace(/s$/, "");
  return sx.length >= 3 && sx === sy;
};

/** for each title word: the transcript word he says it with (in order), or null */
export function matchTitleWords(title: string, words: Word[], limitMs = MAX_MS + 600): (Word | null)[] {
  const tw = title.split(/\s+/).filter(Boolean);
  const pool = words.filter((w) => w.startMs < limitMs);
  let k = 0;
  return tw.map((t) => {
    for (let j = k; j < Math.min(pool.length, k + 7); j++) {
      if (same(t, pool[j].text)) {
        k = j + 1;
        return pool[j];
      }
    }
    return null;
  });
}

// the hook's brand: kicker if it's a known logo, else a brand named by the plan's scenes
// that the title/kicker actually mentions (so we never guess a random mark)
function inferBrand(text: string, kicker: string | undefined, scenes: Scene[], consumed?: Scene): string | undefined {
  if (consumed?.brand && getLogo(consumed.brand)) return consumed.brand;
  if (kicker && getLogo(kicker)) return kicker;
  const hay = norm(`${text} ${kicker ?? ""}`);
  for (const s of scenes) {
    for (const c of [s.brand, s.kind === "logo" ? s.name : undefined, s.kind === "toolcard" ? s.name : undefined]) {
      if (typeof c === "string" && norm(c).length >= 3 && hay.includes(norm(c)) && getLogo(c)) return c;
    }
  }
  return undefined;
}

export function planTitle(scenes: Scene[], opts: TitleOpts, words: Word[] = []): { title: TitlePlan | null; scenes: Scene[] } {
  const consumed = scenes.find((s) => s.startMs < TITLE_MS && TEXT_KINDS.has(s.kind) && typeof s.text === "string");
  const text = (opts.title ?? consumed?.text)?.trim();
  if (!text) return { title: null, scenes };
  // sync the exit to the director's beat when it planned one of sane length…
  let endMs = consumed && consumed.endMs >= MIN_MS && consumed.endMs <= MAX_MS ? consumed.endMs : TITLE_MS;
  // …but never before he has finished saying the title
  const spoken = matchTitleWords(text, words).filter((w): w is Word => !!w);
  if (spoken.length >= 2 || (spoken.length === 1 && text.split(/\s+/).length <= 2)) {
    const last = Math.max(...spoken.map((w) => w.endMs));
    endMs = Math.max(MIN_MS, Math.min(MAX_MS, Math.max(endMs, last + 250)));
  }
  const rest: Scene[] = [];
  for (const s of scenes) {
    if (s === consumed) continue;
    if (s.startMs < endMs) {
      if (s.endMs - endMs < 400) continue; // nothing meaningful left of it
      rest.push({ ...s, startMs: endMs });
    } else rest.push(s);
  }
  const kicker = opts.titleKicker ?? consumed?.kicker;
  return {
    title: { text, kicker, emphasis: opts.titleEmphasis ?? consumed?.emphasis, endMs, brand: inferBrand(text, kicker, scenes, consumed) },
    scenes: rest,
  };
}

// ── the hook ─────────────────────────────────────────────────────────────────

/** vertical centre of the hook card (screen px) — upper-middle; its bottom edge stops just above his eyes (~y730) */
export const HOOK_CY = 520;

const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>*";

const KickerDecrypt: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();
  const shown = Math.max(0, ((f - delay) / fps) * 34);
  const chars = text.toUpperCase().split("");
  return (
    <span style={{ fontFamily: F2.mono, fontWeight: 600, fontSize: 26, letterSpacing: "0.3em", color: a.hex, textShadow: `0 0 20px ${a.glow}`, whiteSpace: "nowrap" }}>
      {chars.map((ch, i) => {
        if (ch === " ") return <span key={i}> </span>;
        if (i < shown) return <span key={i}>{ch}</span>;
        if (i < shown + 6) return <span key={i} style={{ color: T.faint }}>{SCRAMBLE[Math.floor(random(`k${i}:${Math.floor(f / 2)}`) * SCRAMBLE.length)]}</span>;
        return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
      })}
    </span>
  );
};

export const TitleOverlay: React.FC<{
  text: string;
  kicker?: string;
  emphasis?: string;
  durF: number;
  /** the transcript — title words light up as he says them */
  words?: Word[];
  /** a brand with a real logo (planTitle infers it) */
  brand?: string;
}> = ({ text, kicker, emphasis, durF, words = [], brand }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tw = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const size = Math.max(72, Math.min(108, Math.round(3300 / Math.max(text.length, 14))));
  const hasLogo = !!(brand && getLogo(brand));
  const emphIdx = emphasis ? tw.findIndex((w) => norm(w) === norm(emphasis)) : -1;

  // frame each title word is SPOKEN (matched to the transcript; gaps interpolated;
  // no match at all → a quick cascade). Everything is lit ≥14 frames before the exit.
  const litAt = useMemo(() => {
    const m = matchTitleWords(text, words).map((w) => (w ? Math.round((w.startMs / 1000) * fps) - 2 : null));
    const known = m.map((v, i) => [i, v] as const).filter(([, v]) => v !== null) as [number, number][];
    const out = m.map((v, i) => {
      if (v !== null) return v;
      if (!known.length) return 16 + i * 4;
      const before = [...known].reverse().find(([j]) => j < i);
      const after = known.find(([j]) => j > i);
      if (before && after) return Math.round(before[1] + ((after[1] - before[1]) * (i - before[0])) / (after[0] - before[0]));
      if (before) return before[1] + (i - before[0]) * 5;
      return Math.max(8, after![1] - (after![0] - i) * 5);
    });
    return out.map((v) => Math.max(8, Math.min(durF - 14, v)));
  }, [text, words, fps, durF]);

  // the moment he says the brand → the logo tile pulses
  const brandAt = useMemo(() => {
    if (!brand) return -1;
    const w = words.find((x) => x.startMs < MAX_MS && same(x.text, brand));
    return w ? Math.round((w.startMs / 1000) * fps) : -1;
  }, [brand, words, fps]);

  const sp = (d: number, cfg: object) => spring({ frame: f - d, fps, config: { damping: 20, stiffness: 150, mass: 0.8, ...cfg } });
  const card = sp(0, { damping: 18, stiffness: 140, mass: 0.9 });
  const tile = sp(4, { damping: 13, stiffness: 170 });
  const row = sp(7, {});
  const ripple = interpolate(f, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pulse = brandAt >= 0 ? interpolate(f - brandAt, [0, 4, 16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const breathe = 1 + 0.02 * Math.min(1, f / Math.max(1, durF));
  const floatY = Math.sin((f / fps) * 1.3) * 3 * Math.min(1, f / 20);
  const exit = interpolate(f, [durF - 10, durF - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const blur = Math.max(0, 1 - card) * 10 + exit * 10;
  const cardOp = Math.min(1, card * 1.4) * (1 - exit);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* a soft contact shadow under the card so it sits ON him, not pasted flat */}
      <div
        style={{
          position: "absolute",
          left: 150,
          right: 150,
          top: HOOK_CY - 150,
          height: 340,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.28)",
          boxShadow: "0 0 120px 70px rgba(0,0,0,0.28)",
          opacity: cardOp,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: HOOK_CY,
          opacity: cardOp,
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
          transform: `translateY(-50%) translateY(${((1 - card) * 64 - 40 * exit + floatY).toFixed(2)}px) scale(${((0.93 + 0.07 * card) * (breathe + 0.03 * exit)).toFixed(4)})`,
        }}
      >
        {/* the card: near-opaque dark glass, hairline, top-lit edge, layered shadow */}
        <div
          style={{
            position: "relative",
            padding: hasLogo || kicker ? "38px 46px 46px" : "44px 46px 48px",
            borderRadius: 38,
            background: "linear-gradient(180deg, rgba(29,29,35,0.95) 0%, rgba(13,13,16,0.96) 100%)",
            border: "1px solid rgba(255,255,255,0.11)",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4), 0 44px 90px -34px rgba(0,0,0,0.9), 0 14px 30px -14px rgba(0,0,0,0.6), 0 0 90px -46px ${a.glow}`,
          }}
        >
          {hasLogo || kicker ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 30 }}>
              {hasLogo ? (
                <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
                  {/* one accent ripple as it lands */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 27,
                      border: `2px solid ${a.hex}`,
                      opacity: 0.55 * (1 - ripple) * Math.min(1, tile),
                      transform: `scale(${1 + 0.9 * ripple})`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 27,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(180deg, rgba(52,52,60,0.95) 0%, rgba(24,24,29,0.97) 100%)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 26px -10px rgba(0,0,0,0.7), 0 0 ${34 + 40 * pulse}px -${10 - 4 * pulse}px ${a.glow}`,
                      opacity: Math.min(1, tile * 1.6),
                      transform: `scale(${((0.5 + 0.5 * tile) * (1 + 0.08 * pulse)).toFixed(4)})`,
                    }}
                  >
                    <Logo name={brand!} size={58} color="#fff" />
                  </div>
                </div>
              ) : (
                <span style={{ width: 12, height: 12, borderRadius: 6, flexShrink: 0, background: a.hex, boxShadow: `0 0 14px ${a.glow}`, opacity: row }} />
              )}
              {kicker ? (
                <div style={{ opacity: row, transform: `translateX(${(1 - row) * -14}px)` }}>
                  <KickerDecrypt text={kicker} delay={8} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ lineHeight: 1.05, textAlign: "left", marginLeft: -6 }}>
            {tw.map((w, i) => {
              const enter = sp(6 + i * 2.5, { damping: 19, stiffness: 170 });
              const lit = Math.min(1, Math.max(0, sp(litAt[i], { damping: 15, stiffness: 190, mass: 0.7 })));
              const pop = interpolate(f - litAt[i], [0, 4, 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const emph = i === emphIdx;
              const on = emph && lit > 0.5;
              return (
                <span
                  key={i}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    margin: "0 6px",
                    fontFamily: F2.sans,
                    fontWeight: 700,
                    fontSize: size,
                    letterSpacing: "-0.04em",
                    color: on ? a.hex : T.text,
                    opacity: Math.min(1, enter) * (0.3 + 0.7 * lit),
                    textShadow: on ? `0 0 36px ${a.glow}` : undefined,
                    transform: `translateY(${((1 - enter) * 26).toFixed(2)}px) scale(${(1 + 0.04 * pop).toFixed(4)})`,
                    transformOrigin: "50% 70%",
                  }}
                >
                  {w}
                  {emph ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 2,
                        right: 2,
                        bottom: -2,
                        height: 6,
                        borderRadius: 3,
                        background: a.hex,
                        boxShadow: `0 0 16px ${a.glow}`,
                        transformOrigin: "0 50%",
                        transform: `scaleX(${lit.toFixed(4)})`,
                      }}
                    />
                  ) : null}
                </span>
              );
            })}
          </div>
          <Sheen first={10} every={10_000} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
