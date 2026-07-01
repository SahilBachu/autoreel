import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Kicker, Panel, Scene, useEnter } from "./fx";
import { Logo, hasLogo } from "./logos";

// ── media scenes — real assets in dark frames ─────────────────────────────────

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));
const spr = (frame: number, fps: number, delay = 0, cfg = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130, mass: 0.9, ...cfg } });

// dark-mode X post
export const TweetCard: React.FC<{ name: string; handle: string; text: string; brand?: string }> = ({ name, handle, text, brand }) => {
  const e = useEnter(0, { damping: 18 });
  const a = useAccent();
  return (
    <Scene bg="shader">
      <div
        style={{
          width: 880,
          background: "#101014",
          border: `1px solid ${T.borderBright}`,
          borderRadius: 30,
          padding: "42px 44px",
          boxShadow: `0 50px 120px -30px rgba(0,0,0,0.9), 0 0 80px -30px ${a.glow}`,
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) scale(${interpolate(e, [0, 1], [0.94, 1])})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 26 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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
        <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 44, lineHeight: 1.35, color: T.text }}>{text}</div>
      </div>
    </Scene>
  );
};

// terminal — accent prompt, types itself out
export const Terminal: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEnter(0, { damping: 18 });
  const CPS = 42;
  let budget = Math.floor((f / fps) * CPS);
  const rendered = lines.map((l) => {
    const take = Math.max(0, Math.min(l.length, budget));
    budget -= l.length + 1;
    return l.slice(0, take);
  });
  const active = rendered.findIndex((r, i) => r.length < lines[i].length);
  return (
    <Scene bg="plain">
      <div
        style={{
          width: 900,
          borderRadius: 26,
          overflow: "hidden",
          background: "#0C0C10",
          border: `1px solid ${T.borderBright}`,
          boxShadow: `0 50px 120px -30px rgba(0,0,0,0.9), 0 0 90px -40px ${a.glow}`,
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px) scale(${interpolate(e, [0, 1], [0.95, 1])})`,
        }}
      >
        <div style={{ height: 58, background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 11, padding: "0 24px" }}>
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#ff5f57" }} />
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#febc2e" }} />
          <div style={{ width: 15, height: 15, borderRadius: 8, background: "#28c840" }} />
          {title ? <span style={{ marginLeft: 16, fontFamily: F2.mono, fontSize: 23, color: T.faint }}>{title}</span> : null}
        </div>
        <div style={{ padding: "36px 40px", minHeight: 330 }}>
          {rendered.map((r, i) => (
            <div key={i} style={{ fontFamily: F2.mono, fontSize: 33, lineHeight: 1.65, color: i === 0 ? T.text : T.dim, whiteSpace: "pre-wrap" }}>
              <span style={{ color: a.hex }}>{i === 0 ? "❯ " : "  "}</span>
              {r}
              {i === active ? <span style={{ opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: a.hex }}>▋</span> : null}
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

// code block — line-by-line reveal, accent highlight lines
export const CodeBlock: React.FC<{ title?: string; lines: string[]; highlight?: number[] }> = ({ title, lines, highlight = [] }) => {
  const a = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEnter(0, { damping: 18 });
  const hi = new Set(highlight);
  return (
    <Scene bg="grid">
      <div
        style={{
          width: 920,
          borderRadius: 26,
          overflow: "hidden",
          background: "#0C0C10",
          border: `1px solid ${T.borderBright}`,
          boxShadow: "0 50px 120px -30px rgba(0,0,0,0.9)",
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [36, 0])}px)`,
        }}
      >
        {title ? (
          <div style={{ padding: "20px 34px", borderBottom: `1px solid ${T.border}`, fontFamily: F2.mono, fontSize: 24, color: T.faint }}>{title}</div>
        ) : null}
        <div style={{ padding: "32px 0" }}>
          {lines.slice(0, 12).map((l, i) => {
            const le = spr(f, fps, 5 + i * 4, { damping: 24 });
            const on = hi.has(i + 1);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  padding: "5px 34px",
                  background: on ? a.soft : "transparent",
                  boxShadow: on ? `inset 3px 0 0 ${a.hex}` : "none",
                  opacity: le,
                  transform: `translateX(${interpolate(le, [0, 1], [-16, 0])}px)`,
                }}
              >
                <span style={{ width: 64, fontFamily: F2.mono, fontSize: 28, color: T.faint, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontFamily: F2.mono, fontSize: 30, lineHeight: 1.5, color: on ? T.text : T.dim, whiteSpace: "pre" }}>{l}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// real screenshot in a dark browser frame
export const Browser: React.FC<{ src: string; label?: string }> = ({ src, label }) => {
  const a = useAccent();
  const e = useEnter(0, { damping: 200 });
  return (
    <Scene bg="shader">
      <div
        style={{
          width: 940,
          borderRadius: 28,
          overflow: "hidden",
          background: "#0C0C10",
          border: `1px solid ${T.borderBright}`,
          boxShadow: `0 60px 140px -30px rgba(0,0,0,0.95), 0 0 100px -40px ${a.glow}`,
          transform: `translateY(${interpolate(e, [0, 1], [44, 0])}px) scale(${interpolate(e, [0, 1], [0.93, 1])})`,
        }}
      >
        <div style={{ height: 62, background: "rgba(255,255,255,0.045)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 11, padding: "0 26px" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ff5f57" }} />
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#febc2e" }} />
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#28c840" }} />
          {label ? (
            <div style={{ marginLeft: 18, padding: "8px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, fontFamily: F2.mono, fontSize: 22, color: T.dim }}>{label}</div>
          ) : null}
        </div>
        <div style={{ height: 1010, overflow: "hidden", background: "#fff" }}>
          <Img src={asset(src)} style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </Scene>
  );
};

// screenshot in a phone
export const Phone: React.FC<{ src?: string; label?: string }> = ({ src, label }) => {
  const e = useEnter(0, { damping: 200 });
  const a = useAccent();
  return (
    <Scene bg="shader">
      <div style={{ transform: `translateY(${interpolate(e, [0, 1], [50, 0])}px) scale(${interpolate(e, [0, 1], [0.92, 1])})` }}>
        <div style={{ width: 500, height: 1020, borderRadius: 66, background: "#0A0A0D", padding: 15, border: `2px solid ${T.borderBright}`, boxShadow: `0 60px 150px -30px rgba(0,0,0,0.95), 0 0 110px -40px ${a.glow}` }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#111", position: "relative" }}>
            <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: 140, height: 32, background: "#000", borderRadius: 18, zIndex: 2 }} />
            {src ? <Img src={asset(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(170deg, ${T.bg2}, ${T.bg})` }} />}
          </div>
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontWeight: 500, fontSize: 32, color: T.dim, textAlign: "center", marginTop: 28 }}>{label}</div> : null}
      </div>
    </Scene>
  );
};

// brand logo hero with glow ring
export const LogoDrop: React.FC<{ name: string; tagline?: string; src?: string }> = ({ name, tagline, src }) => {
  const a = useAccent();
  const e = useEnter(0, { damping: 17 });
  const has = hasLogo(name);
  const size = Math.max(74, Math.min(150, Math.round(1400 / Math.max(name.length, 7))));
  return (
    <Scene bg="shader">
      <div style={{ textAlign: "center", opacity: e, transform: `scale(${interpolate(e, [0, 1], [0.8, 1])})` }}>
        {src || has ? (
          <div
            style={{
              width: 230,
              height: 230,
              margin: "0 auto 44px",
              borderRadius: 56,
              background: T.surface,
              border: `1px solid ${T.borderBright}`,
              boxShadow: `0 0 110px -20px ${a.glow}, inset 0 1px 0 ${T.borderBright}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {src ? <Img src={asset(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Logo name={name} size={130} color="#fff" />}
          </div>
        ) : null}
        <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size, letterSpacing: "-0.04em", color: T.text, whiteSpace: "nowrap" }}>{name}</div>
        {tagline ? <div style={{ fontFamily: F2.mono, fontSize: 34, color: a.hex, marginTop: 18, letterSpacing: "0.08em", textShadow: `0 0 22px ${a.glow}` }}>{tagline}</div> : null}
      </div>
    </Scene>
  );
};

// grid of real brand logos
export const LogoWall: React.FC<{ title?: string; brands: string[] }> = ({ title, brands }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = brands.length <= 4 ? 2 : 3;
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 900 }}>
        {title ? <Kicker text={title} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 26 }}>
          {brands.slice(0, 9).map((b, i) => {
            const e = spr(f, fps, 5 + i * 5, { damping: 16 });
            return (
              <Panel key={i} style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px) scale(${interpolate(e, [0, 1], [0.86, 1])})` }}>
                <Logo name={b} size={86} color="#fff" />
              </Panel>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

// head-to-head
export const Versus: React.FC<{ a: string; b: string; aNote?: string; bNote?: string }> = ({ a: A, b: B, aNote, bNote }) => {
  const acc = useAccent();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eA = spr(f, fps, 2, { damping: 18 });
  const eB = spr(f, fps, 8, { damping: 18 });
  const eV = spr(f, fps, 14, { damping: 12, stiffness: 190 });
  const card = (name: string, note: string | undefined, e: number, from: number, hero: boolean) => (
    <div style={{ flex: 1, opacity: e, transform: `translateX(${interpolate(e, [0, 1], [from, 0])}px)` }}>
      <Panel glow={hero} style={{ padding: "52px 24px", textAlign: "center" }}>
        {hasLogo(name) ? <div style={{ marginBottom: 24 }}><Logo name={name} size={120} color="#fff" /></div> : null}
        <div style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: hasLogo(name) ? 46 : 56, letterSpacing: "-0.02em", color: T.text }}>{name}</div>
        {note ? <div style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 38, color: hero ? acc.hex : T.dim, marginTop: 12, textShadow: hero ? `0 0 24px ${acc.glow}` : "none" }}>{note}</div> : null}
      </Panel>
    </div>
  );
  return (
    <Scene bg="plain">
      <div style={{ width: "100%", maxWidth: 950, display: "flex", alignItems: "center", gap: 24 }}>
        {card(A, aNote, eA, -70, true)}
        <div style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 60, color: T.faint, transform: `scale(${eV})`, flexShrink: 0 }}>vs</div>
        {card(B, bNote, eB, 70, false)}
      </div>
    </Scene>
  );
};
