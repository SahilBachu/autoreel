import { Easing, Img, interpolate, staticFile } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { Logo, hasLogo } from "./logos";
import {
  Caret, Check, Counter, Float, Lights, LogoDraw, PushIn, Ripple, RevealText, Spinner, Surface, Window,
  breathe, clamp01, parseNum, pop, ramp, rise, schedule, slide, typed, useT, Kicker } from "./kit";

// ── media scenes — real assets in dark frames ─────────────────────────────────
// Built from kit.tsx: choreographed entrances paced to the beat, then hold-life.

const asset = (s: string) => (s.startsWith("http") || s.startsWith("data:") ? s : staticFile(s));

// ── syntax colouring (restrained: ONE accent family + greys) ──────────────────
type Tok = { t: string; c: string; w?: number; i?: boolean };
const KW = new Set(
  "const let var function return await async import from export default if else for while new class def self None True False null true false undefined type interface extends implements public private static in of as with try catch throw yield lambda pass elif print fn pub use mut impl struct enum match".split(" "),
);
// code tokens: keywords → accent, strings → accent dim, functions → bright, comments → faint
const tokenizeCode = (line: string, a: { hex: string; dim: string }): Tok[] => {
  const out: Tok[] = [];
  const re = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"'`]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ t: m[1], c: T.faint, i: true });
    else if (m[2]) out.push({ t: m[2], c: a.dim });
    else if (m[3]) out.push({ t: m[3], c: T.text });
    else if (m[4]) out.push({ t: m[4], c: KW.has(m[4]) ? a.hex : T.text, w: KW.has(m[4]) ? 500 : 600 });
    else if (m[5]) out.push({ t: m[5], c: KW.has(m[5]) ? a.hex : T.dim, w: KW.has(m[5]) ? 500 : 400 });
    else out.push({ t: m[0], c: T.faint });
  }
  return out;
};
// terminal output tokens: JSON-ish — "key": bright, "string" accent, numbers bright, rest dim
const tokenizeOut = (line: string, a: { hex: string; dim: string }): Tok[] => {
  const out: Tok[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\b\d[\d.,]*\b)|(\s+)|([^\s"\d]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1] && m[2]) out.push({ t: m[1], c: T.text }, { t: m[2], c: T.faint });
    else if (m[1]) out.push({ t: m[1], c: a.hex });
    else if (m[3]) out.push({ t: m[3], c: T.text });
    else out.push({ t: m[0], c: T.dim });
  }
  return out;
};
// first n characters of a token run (for typing coloured code)
const sliceToks = (toks: Tok[], n: number): Tok[] => {
  const out: Tok[] = [];
  let left = n;
  for (const k of toks) {
    if (left <= 0) break;
    out.push(k.t.length <= left ? k : { ...k, t: k.t.slice(0, left) });
    left -= k.t.length;
  }
  return out;
};
const Toks: React.FC<{ toks: Tok[] }> = ({ toks }) => (
  <>
    {toks.map((k, i) => (
      <span key={i} style={{ color: k.c, fontWeight: k.w, fontStyle: k.i ? "italic" : undefined }}>
        {k.t}
      </span>
    ))}
  </>
);

// dark-mode X post
export const TweetCard: React.FC<{ name: string; handle: string; text: string; brand?: string }> = ({ name, handle, text, brand }) => {
  const { sp } = useT();
  const e = sp(0);
  const a = useAccent();
  return (
    <Scene bg="shader">
      <Float style={{ width: 880 }} seed={0.9}>
        <div style={rise(e, 40, 0.94)}>
          <Surface tone="solid" sheen radius={30} style={{ padding: "42px 44px", border: `1px solid ${T.borderBright}`, boxShadow: `0 50px 120px -30px rgba(0,0,0,0.9), 0 0 80px -34px ${a.glow}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 26 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", ...pop(sp(4, "bouncy"), 0.5) }}>
                {brand && hasLogo(brand) ? <Logo name={brand} size={48} color="#fff" /> : <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 40, color: T.text }}>{name.slice(0, 1)}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 38, color: T.text }}>{name}</span>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.416-.164-.865-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.084.964.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.622 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
                </div>
                <span style={{ fontFamily: F2.sans, fontSize: 30, color: T.faint }}>@{handle}</span>
              </div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill={T.text}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </div>
            <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 44, lineHeight: 1.35, color: T.text }}>
              <RevealText text={text} start={8} step={1} />
            </div>
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── Terminal — commands TYPE (accent prompt), output STREAMS in line by line with JSON-ish
// colouring, a spinner between command and output, then a fresh prompt blinks. The first
// line (and any line starting "$ " / "❯ ") is a command; the rest is output.
export const Terminal: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => {
  const a = useAccent();
  const { f, fps, beat, sp } = useT();
  const e = sp(0);
  const ls = lines.slice(0, 14).map((l, i) => {
    const cmd = i === 0 || /^(\$|❯|>)\s/.test(l);
    return { cmd, text: cmd && i > 0 ? l.replace(/^(\$|❯|>)\s/, "") : l };
  });
  // schedule: commands type, output lines stream (stretched a little on long beats)
  const nOut = ls.filter((l) => !l.cmd).length;
  const typeTotal = ls.filter((l) => l.cmd).reduce((s, l) => s + (l.text.length / 30) * fps + 12, 0);
  const slack = Math.max(0, beat * 0.5 - 10 - typeTotal - nOut * 3);
  const outStep = Math.min(6, 3 + slack / Math.max(1, nOut * 2));
  const pause = Math.min(14, 8 + slack / 4);
  const sched: { at: number; done: number }[] = [];
  let cur = 10;
  let prevCmd = false;
  for (const l of ls) {
    if (l.cmd) {
      const d = Math.ceil((l.text.length / 30) * fps);
      sched.push({ at: cur, done: cur + d });
      cur += d;
      prevCmd = true;
    } else {
      if (prevCmd) cur += pause;
      sched.push({ at: cur, done: cur });
      cur += outStep;
      prevCmd = false;
    }
  }
  const end = cur + 4;
  const running = ls.findIndex((l, i) => l.cmd && f >= sched[i].done && i + 1 < ls.length && !ls[i + 1].cmd && f < sched[i + 1].at);
  return (
    <Scene bg="plain">
      <Float style={{ width: 920 }} seed={1.7} amp={4}>
        <div style={rise(e, 36, 0.95)}>
          <Window glow title={title ?? "zsh"} bodyStyle={{ padding: "30px 38px 34px" }}>
            {ls.map((l, i) => {
              const s = sched[i];
              if (f < s.at) return <div key={i} style={{ fontFamily: F2.mono, fontSize: 30, lineHeight: 1.6, visibility: "hidden" }}>.</div>;
              if (l.cmd) {
                const t = typed(l.text, f, s.at, 30, fps);
                return (
                  <div key={i} style={{ fontFamily: F2.mono, fontSize: 30, lineHeight: 1.6, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    <span style={{ color: a.hex, textShadow: `0 0 16px ${a.glow}` }}>❯ </span>
                    {t.shown}
                    {!t.done ? <Caret block solid /> : null}
                    {running === i ? <span style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 16 }}><Spinner size={24} /></span> : null}
                  </div>
                );
              }
              const le = sp(s.at, "snappy");
              const ok = /^(✓|✔|done|success)/i.test(l.text.trim());
              return (
                <div key={i} style={{ fontFamily: F2.mono, fontSize: 28, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", ...slide(le, -10) }}>
                  {ok ? <span style={{ color: a.hex }}>{l.text}</span> : <Toks toks={tokenizeOut(l.text, a)} />}
                </div>
              );
            })}
            <div style={{ fontFamily: F2.mono, fontSize: 30, lineHeight: 1.6, opacity: f >= end ? 1 : 0 }}>
              <span style={{ color: a.hex }}>❯ </span>
              <Caret block />
            </div>
          </Window>
        </div>
      </Float>
    </Scene>
  );
};

// ── CodeBlock — an editor: tab + line numbers, syntax colour, each line WRITES itself
// (a sweep with a caret at its head), highlight lines get an accent band that sweeps in
// and breathes; the caret parks on the last highlight line.
export const CodeBlock: React.FC<{ title?: string; lines: string[]; highlight?: number[] }> = ({ title, lines, highlight = [] }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const e = sp(0);
  const hi = new Set(highlight);
  const ls = lines.slice(0, 12);
  const at = schedule(ls.length, beat, { start: 8, fill: 0.4, min: 3, max: 9 });
  const LINE = 8;
  const allIn = (at[at.length - 1] ?? 0) + LINE;
  const caretLine = highlight.length ? Math.min(ls.length, Math.max(...highlight)) - 1 : ls.length - 1;
  const ext = (title ?? "").split(".").pop() || "ts";
  return (
    <Scene bg="grid">
      <Float style={{ width: 930 }} seed={2.6} amp={4}>
        <div style={rise(e, 36, 0.96)}>
          <Surface tone="solid" radius={26} glow style={{ border: `1px solid ${T.borderBright}` }}>
            <div style={{ height: 62, display: "flex", alignItems: "flex-end", gap: 18, padding: "0 22px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ alignSelf: "center" }}><Lights /></div>
              {title ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", marginLeft: 10, background: "#111116", border: `1px solid ${T.border}`, borderBottom: "none", borderRadius: "12px 12px 0 0", fontFamily: F2.mono, fontSize: 22, color: T.text }}>
                  <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 16, color: a.hex, letterSpacing: "0.04em" }}>{ext.toUpperCase().slice(0, 3)}</span>
                  {title}
                </div>
              ) : null}
            </div>
            <div style={{ padding: "26px 0 30px" }}>
              {ls.map((l, i) => {
                const on = hi.has(i + 1);
                const sweep = ramp(f, at[i], at[i] + LINE, 0, 100, Easing.linear);
                const band = on ? ramp(f, allIn + 4 + i * 2, allIn + 16 + i * 2, 0, 1, Easing.out(Easing.cubic)) : 0;
                const glowK = on && band >= 1 ? breathe(f, 80, i) : 0;
                const writing = f >= at[i] && sweep < 100;
                return (
                  <div key={i} style={{ position: "relative", display: "flex", padding: "4px 34px" }}>
                    {on ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${band * 100}%`, background: `linear-gradient(90deg, ${a.soft}, rgba(0,0,0,0))`, boxShadow: `inset 4px 0 0 ${a.hex}`, opacity: 0.8 + 0.2 * glowK }} /> : null}
                    <span style={{ position: "relative", width: 58, fontFamily: F2.mono, fontSize: 26, lineHeight: "44px", color: on && band > 0 ? a.hex : T.faint, flexShrink: 0, opacity: f >= at[i] ? 1 : 0.35 }}>{i + 1}</span>
                    <span style={{ position: "relative", fontFamily: F2.mono, fontSize: 29, lineHeight: "44px", whiteSpace: "pre" }}>
                      <Toks toks={sliceToks(tokenizeCode(l, a), Math.round((l.length * sweep) / 100))} />
                      {writing ? <Caret solid /> : null}
                      {i === caretLine && f >= allIn + 8 ? <Caret /> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};

// ── Browser — REAL screenshot in dark browser chrome. The page "loads" (bar fills, image
// focuses in), then during the hold it slowly scrolls + pushes in, like someone reading it.
export const Browser: React.FC<{ src: string; label?: string }> = ({ src, label }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const e = sp(0);
  const load = ramp(f, 2, 22, 0, 1, Easing.out(Easing.cubic));
  const img = ramp(f, 8, 22);
  const scroll = ramp(f, 34, Math.max(120, beat + 30), 0, 9, Easing.inOut(Easing.quad));
  return (
    <Scene bg="shader">
      <div style={{ width: 940, ...rise(e, 44, 0.93) }}>
        <Surface tone="solid" radius={28} style={{ border: `1px solid ${T.borderBright}`, boxShadow: `0 60px 140px -30px rgba(0,0,0,0.95), 0 0 100px -40px ${a.glow}` }}>
          <div style={{ position: "relative", height: 66, background: "rgba(255,255,255,0.045)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 18, padding: "0 24px" }}>
            <Lights size={15} />
            <svg width="44" height="22" viewBox="0 0 44 22" fill="none" stroke={T.faint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-6 6 6 6" /><path d="M32 5l6 6-6 6" opacity="0.5" /></svg>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "9px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: 12, fontFamily: F2.mono, fontSize: 22, color: T.dim, minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2.6"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label ?? ""}</span>
            </div>
            <div style={{ width: 44 }} />
            <div style={{ position: "absolute", left: 0, bottom: -1, height: 3, width: `${load * 100}%`, background: a.hex, boxShadow: `0 0 12px ${a.glow}`, opacity: 1 - ramp(f, 22, 30) }} />
          </div>
          <div style={{ height: 1010, overflow: "hidden", background: "#0E0E12" }}>
            <PushIn amount={0.035} from={30} origin="50% 0%">
              <Img src={asset(src)} style={{ width: "100%", display: "block", opacity: img, filter: img < 1 ? `blur(${(1 - img) * 10}px)` : undefined, transform: `translateY(-${scroll}%)` }} />
            </PushIn>
          </div>
        </Surface>
      </div>
    </Scene>
  );
};

// screenshot in a phone — rises in, then scrolls gently during the hold
export const Phone: React.FC<{ src?: string; label?: string }> = ({ src, label }) => {
  const { f, beat, sp } = useT();
  const e = sp(0);
  const a = useAccent();
  const scroll = ramp(f, 30, Math.max(120, beat + 30), 0, 12, Easing.inOut(Easing.quad));
  return (
    <Scene bg="shader">
      <Float seed={3.3} amp={5}>
        <div style={rise(e, 50, 0.92)}>
          <div style={{ width: 500, height: 1020, borderRadius: 66, background: "#0A0A0D", padding: 15, border: `2px solid ${T.borderBright}`, boxShadow: `0 60px 150px -30px rgba(0,0,0,0.95), 0 0 110px -40px ${a.glow}` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#111", position: "relative" }}>
              <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: 140, height: 32, background: "#000", borderRadius: 18, zIndex: 2 }} />
              {src ? <Img src={asset(src)} style={{ width: "100%", display: "block", transform: `translateY(-${scroll}%)` }} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />}
            </div>
          </div>
          {label ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 28 }}>{label}</div> : null}
        </div>
      </Float>
    </Scene>
  );
};

// ── LogoDrop — brand hero: the real mark DRAWS itself in a glowing tile, a ripple goes out,
// two thin orbit rings turn for the rest of the hold; the name rises, the tagline types.
export const LogoDrop: React.FC<{ name: string; tagline?: string; src?: string }> = ({ name, tagline, src }) => {
  const a = useAccent();
  const { f, fps, sp } = useT();
  const e = sp(0, "bouncy");
  const has = hasLogo(name);
  const size = Math.max(74, Math.min(150, Math.round(1400 / Math.max(name.length, 7))));
  const tg = tagline ? typed(tagline, f, 22, 30, fps) : null;
  const glowK = breathe(f, 90);
  return (
    <Scene bg="shader">
      <Float seed={4.4} amp={5}>
        <div style={{ textAlign: "center" }}>
          {src || has ? (
            <div style={{ position: "relative", width: 240, height: 240, margin: "0 auto 50px" }}>
              <div style={{ position: "absolute", inset: -44, borderRadius: "50%", border: `1.5px dashed ${a.dim}`, opacity: 0.4 * clamp01(e), transform: `rotate(${f * 0.4}deg)` }} />
              <div style={{ position: "absolute", inset: -84, borderRadius: "50%", border: `1px solid ${T.border}`, opacity: clamp01(e), transform: `rotate(${-f * 0.25}deg)` }}>
                <div style={{ position: "absolute", left: "50%", top: -5, width: 10, height: 10, borderRadius: 5, background: a.hex, boxShadow: `0 0 14px ${a.glow}` }} />
              </div>
              <Ripple x={120} y={120} at={6} size={360} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 60,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))",
                  border: `1px solid ${T.borderBright}`,
                  boxShadow: `0 0 ${100 + glowK * 50}px -20px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  ...pop(e, 0.5),
                }}
              >
                {src ? <Img src={asset(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <LogoDraw brand={name} size={132} start={4} dur={30} />}
              </div>
            </div>
          ) : null}
          <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size, letterSpacing: "-0.045em", color: T.text, whiteSpace: "nowrap", lineHeight: 1.05 }}>
            <RevealText text={name} start={12} step={3} center />
          </div>
          {tg ? (
            <div style={{ fontFamily: F2.mono, fontWeight: 500, fontSize: 42, color: a.hex, marginTop: 22, letterSpacing: "0.04em", textShadow: `0 0 22px ${a.glow}`, minHeight: 54 }}>
              {tg.shown}
              {!tg.done ? <Caret solid /> : null}
            </div>
          ) : null}
        </div>
      </Float>
    </Scene>
  );
};

// grid of real brand logos — tiles pop in, then a light wave keeps rolling across them
export const LogoWall: React.FC<{ title?: string; brands: string[] }> = ({ title, brands }) => {
  const a = useAccent();
  const { f, sp } = useT();
  const bs = brands.slice(0, 9);
  const cols = bs.length <= 4 ? 2 : 3;
  const settled = 8 + bs.length * 4 + 20;
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 900 }} seed={5.1} amp={4}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 24 }}>
          {bs.map((b, i) => {
            const e = sp(5 + i * 4, "bouncy");
            const col = i % cols;
            const row = Math.floor(i / cols);
            const lit = f > settled ? Math.max(0, wave01(f - settled - (col + row) * 8, 90)) : 0;
            return (
              <div key={i} style={{ ...rise(e, 30, 0.86) }}>
                <Surface hot={lit > 0.6} style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: lit > 0 ? `0 0 ${50 * lit}px -20px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.09)` : undefined }}>
                  <div style={{ transform: `scale(${1 + 0.06 * lit})` }}>
                    <Logo name={b} size={84} color="#fff" />
                  </div>
                </Surface>
              </div>
            );
          })}
        </div>
      </Float>
    </Scene>
  );
};
// a sharp pulse once per period (0..1), used for rolling "light waves" across grids
const wave01 = (f: number, period: number) => {
  const t = (((f % period) + period) % period) / period;
  return t < 0.25 ? Math.sin((t / 0.25) * Math.PI) : 0;
};

// ── Versus — head-to-head. Cards swing in from the sides, the VS badge SLAMS with a flash,
// `a` (the winner) lifts and glows with a beam + check badge, `b` settles back. Numeric
// notes count up.
export const Versus: React.FC<{ a: string; b: string; aNote?: string; bNote?: string }> = ({ a: A, b: B, aNote, bNote }) => {
  const acc = useAccent();
  const { f, sp } = useT();
  const eA = sp(2, "snappy");
  const eB = sp(7, "snappy");
  const VS = 16;
  const eV = sp(VS, "bouncy");
  const verdict = sp(VS + 10, "soft");
  const card = (name: string, note: string | undefined, e: number, from: number, hero: boolean) => (
    <div style={{ flex: 1, opacity: clamp01(e * 1.4) * (hero ? 1 : interpolate(verdict, [0, 1], [1, 0.72])), transform: `perspective(1400px) translateX(${(1 - e) * from}px) rotateY(${(1 - e) * (from > 0 ? -18 : 18)}deg) translateY(${hero ? -14 * verdict : 6 * verdict}px) scale(${hero ? 1 + 0.03 * verdict : 1 - 0.02 * verdict})` }}>
      <Surface glow={hero} beam={hero} style={{ padding: "54px 24px 50px", textAlign: "center", overflow: "visible" }}>
        {hero ? (
          <div style={{ position: "absolute", top: -22, left: "50%", transform: `translateX(-50%) scale(${clamp01(verdict)})`, width: 44, height: 44, borderRadius: 22, background: acc.hex, boxShadow: `0 0 26px ${acc.glow}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={24} color={T.bg} width={3.8} />
          </div>
        ) : null}
        {hasLogo(name) ? <div style={{ marginBottom: 26, display: "flex", justifyContent: "center" }}><LogoDraw brand={name} size={120} start={hero ? 4 : 9} dur={22} /></div> : null}
        <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: hasLogo(name) ? 46 : 58, letterSpacing: "-0.025em", color: T.text, lineHeight: 1.1 }}>{name}</div>
        {note ? (
          <div style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 40, color: hero ? acc.hex : T.dim, marginTop: 14, textShadow: hero ? `0 0 24px ${acc.glow}` : "none" }}>
            {parseNum(note) ? <Counter value={note} start={VS + 2} dur={30} /> : note}
          </div>
        ) : null}
      </Surface>
    </div>
  );
  return (
    <Scene bg="plain">
      <Float style={{ width: "100%", maxWidth: 960 }} seed={6.2} amp={4}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {card(A, aNote, eA, -90, true)}
          <div style={{ position: "relative", flexShrink: 0, width: 96, height: 96 }}>
            <Ripple x={48} y={48} at={VS + 2} size={220} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 48, background: "#0B0B0F", border: `1.5px solid ${acc.dim}`, boxShadow: `0 0 ${30 + 20 * breathe(f, 70)}px -6px ${acc.glow}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F2.mono, fontWeight: 700, fontSize: 36, color: T.text, opacity: clamp01(eV * 2), transform: `scale(${interpolate(eV, [0, 1], [2.2, 1])}) rotate(${interpolate(eV, [0, 1], [-20, 0])}deg)` }}>
              VS
            </div>
          </div>
          {card(B, bNote, eB, 90, false)}
        </div>
      </Float>
    </Scene>
  );
};
