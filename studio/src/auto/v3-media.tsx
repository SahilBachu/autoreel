import { Easing, Img, staticFile } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { Float, Lights, LogoDraw, LogoTile, Ripple, Surface, breathe, clamp01, pop, ramp, rise, schedule, useT } from "./kit";

// ── v3 media vocabulary: highlight (zoom into a REAL screenshot + mark the key line) ·
// logoorbit (a hub and everything it connects to). Real assets only.

const asset = (s: string) => (s.startsWith("http") || s.startsWith("data:") ? s : staticFile(s));

type Box = { x: number; y: number; w: number; h: number };

// ── Highlight (kind "highlight") — a REAL page in browser chrome. It loads, then the camera
// ZOOMS into `box` (fractions of the screenshot: x,y,w,h in 0..1), a highlighter box draws
// around it while the rest of the page dims, and the `note` chip pops beside it. The hold
// keeps a slow push-in on the spot and a breathing glow. style "underline" = a marker
// underline instead of a box. Screenshots from `url` are 1280×1600 (ratio 1.25).
export const Highlight: React.FC<{ src: string; label?: string; box?: Box; note?: string; style?: "box" | "underline"; ratio?: number }> = ({ src, label, box, note, style = "box", ratio = 1.25 }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const W = 940;
  const VH = 860;
  const IH = W * ratio;
  const b = {
    x: clamp01(box?.x ?? 0.06),
    y: clamp01(box?.y ?? 0.1),
    w: Math.max(0.05, Math.min(1, box?.w ?? 0.8)),
    h: Math.max(0.02, Math.min(1, box?.h ?? 0.14)),
  };
  const bx = b.x * W;
  const by = b.y * IH;
  const bw = b.w * W;
  const bh = b.h * IH;
  // target zoom: fill ~82% of the width (or ~45% of the height), never below 1.15 / above 2.6
  const Z1 = Math.max(1.15, Math.min(2.6, Math.min((W * 0.82) / bw, (VH * 0.45) / bh)));
  const ZA = 22;
  const ZB = 52;
  const zt = ramp(f, ZA, ZB, 0, 1, Easing.inOut(Easing.cubic));
  const push = ramp(f, ZB, Math.max(ZB + 60, beat + 40), 0, 1, Easing.out(Easing.quad));
  const Z = 1 + (Z1 - 1) * zt + Z1 * 0.05 * push;
  // camera: box centre → viewport centre (a little above), clamped to the page edges
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const clampX = (tx: number) => Math.max(W - W * Z, Math.min(0, tx));
  const clampY = (ty: number) => Math.max(VH - IH * Z, Math.min(0, ty));
  const tx = clampX(W / 2 - cx * Z) * zt;
  const ty = clampY(VH * 0.45 - cy * Z) * zt;
  // the box in viewport px (follows the camera, stroke stays crisp)
  const rx = bx * Z + tx;
  const ry = by * Z + ty;
  const rw = bw * Z;
  const rh = bh * Z;
  const markAt = ZB + 2;
  const draw = ramp(f, markAt, markAt + 16, 0, 1, Easing.out(Easing.cubic));
  const dim = ramp(f, markAt, markAt + 14) * 0.5;
  const glowK = f > markAt + 16 ? breathe(f, 70) : 0;
  const ne = sp(markAt + 12, "bouncy");
  const load = ramp(f, 2, 18, 0, 1, Easing.out(Easing.cubic));
  const e = sp(0);
  const noteBelow = ry + rh + 90 < VH;
  return (
    <Scene bg="shader">
      <div style={{ width: W, ...rise(e, 44, 0.94) }}>
        <Surface tone="solid" radius={28} glow style={{ border: `1px solid ${T.borderBright}` }}>
          <div style={{ position: "relative", height: 66, background: "rgba(255,255,255,0.045)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 18, padding: "0 24px" }}>
            <Lights size={15} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "9px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: 12, fontFamily: F2.mono, fontSize: 22, color: T.dim, minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2.6"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label ?? ""}</span>
            </div>
            <div style={{ width: 60 }} />
            <div style={{ position: "absolute", left: 0, bottom: -1, height: 3, width: `${load * 100}%`, background: a.hex, boxShadow: `0 0 12px ${a.glow}`, opacity: 1 - ramp(f, 18, 26) }} />
          </div>
          <div style={{ position: "relative", height: VH, overflow: "hidden", background: "#0E0E12" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: W, height: IH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${Z})` }}>
              <Img src={asset(src)} style={{ width: W, height: IH, objectFit: "cover", objectPosition: "top", display: "block", opacity: ramp(f, 4, 16) }} />
            </div>
            {/* spotlight: everything but the box dims */}
            {draw > 0 ? <div style={{ position: "absolute", left: rx, top: ry, width: rw, height: rh, borderRadius: 14, boxShadow: `0 0 0 3000px rgba(0,0,0,${dim})`, pointerEvents: "none" }} /> : null}
            {draw > 0 && style === "box" ? (
              <svg width={W} height={VH} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
                <rect x={rx - 8} y={ry - 8} width={rw + 16} height={rh + 16} rx={16} fill={a.soft} fillOpacity={0.35 * draw} stroke={a.hex} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 ${10 + 14 * glowK}px ${a.glow})` }} />
              </svg>
            ) : null}
            {draw > 0 && style === "underline" ? (
              <div style={{ position: "absolute", left: rx, top: ry + rh + 2, width: rw * draw, height: 10, borderRadius: 5, background: a.hex, boxShadow: `0 0 ${14 + 12 * glowK}px ${a.glow}` }} />
            ) : null}
            {note && f >= markAt + 10 ? (
              <div style={{ position: "absolute", left: Math.max(20, Math.min(W - 520, rx)), ...(noteBelow ? { top: ry + rh + 24 } : { top: Math.max(20, ry - 84) }), transformOrigin: "left center", ...pop(ne, 0.6) }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: F2.sans, fontWeight: 700, fontSize: 34, letterSpacing: "-0.015em", color: T.bg, background: a.hex, padding: "12px 22px", borderRadius: 16, whiteSpace: "nowrap", boxShadow: `0 14px 40px -10px ${a.glow}` }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={noteBelow ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M5 12l7 7 7-7"} /></svg>
                  {note}
                </span>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>
    </Scene>
  );
};

// ── LogoOrbit (kind "logoorbit") — a hub (center brand) and the tools it connects to on a
// slowly turning ring. The hub's mark draws, the ring draws, satellites pop in around it,
// spokes connect them, and packets keep pulsing out along the spokes during the hold.
export const LogoOrbit: React.FC<{ center: string; brands: string[]; label?: string }> = ({ center, brands, label }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const bs = brands.slice(0, 8);
  const n = bs.length;
  const S = 800;
  const C = S / 2;
  const R = 300;
  const TILE = 104;
  const ring = ramp(f, 6, 30, 0, 1, Easing.inOut(Easing.cubic));
  const appear = schedule(n, beat, { start: 18, fill: 0.3, min: 4, max: 10 });
  const spin = f * 0.1;
  const he = sp(2, "bouncy");
  const settled = (appear[n - 1] ?? 18) + 20;
  const pts = bs.map((_, i) => {
    const ang = ((i / Math.max(1, n)) * 360 - 90 + spin) * (Math.PI / 180);
    return { x: C + Math.cos(ang) * R, y: C + Math.sin(ang) * R };
  });
  return (
    <Scene bg="shader">
      <Float seed={3.6} amp={4}>
        <div style={{ position: "relative", width: S, height: S }}>
          <svg width={S} height={S} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <circle cx={C} cy={C} r={R} fill="none" stroke={T.borderBright} strokeWidth={1.5} strokeDasharray="6 10" pathLength={1} opacity={ring} transform={`rotate(${spin} ${C} ${C})`} />
            <circle cx={C} cy={C} r={R * 0.62} fill="none" stroke={T.border} strokeWidth={1} opacity={ring * 0.8} />
            {pts.map((p, i) => {
              const d = ramp(f, appear[i] + 4, appear[i] + 16);
              const x0 = C + (p.x - C) * 0.26;
              const y0 = C + (p.y - C) * 0.26;
              const x1 = C + (p.x - C) * (1 - (TILE / 2 + 10) / R);
              const y1 = C + (p.y - C) * (1 - (TILE / 2 + 10) / R);
              const period = 64;
              const t = f > settled ? (((f - settled + i * 9) % period) + period) % period / period : -1;
              return (
                <g key={i}>
                  <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * d} y2={y0 + (y1 - y0) * d} stroke={a.dim} strokeWidth={2} strokeOpacity={0.55} />
                  {t >= 0 ? <circle cx={x0 + (x1 - x0) * t} cy={y0 + (y1 - y0) * t} r={5} fill={a.hex} opacity={Math.sin(Math.PI * t)} style={{ filter: `drop-shadow(0 0 6px ${a.glow})` }} /> : null}
                </g>
              );
            })}
          </svg>
          {pts.map((p, i) => {
            const pe = sp(appear[i], "bouncy");
            const ping = f > settled ? breathe(f, 64, -i * ((Math.PI * 2) / Math.max(1, n))) : 0;
            return (
              <div key={i} style={{ position: "absolute", left: p.x - TILE / 2, top: p.y - TILE / 2, ...pop(pe, 0.2) }}>
                <LogoTile brand={bs[i]} letter={bs[i]} size={TILE} radius={30} glow={ping > 0.8} style={{ background: "linear-gradient(180deg, #202027, #131318)" }} />
              </div>
            );
          })}
          <div style={{ position: "absolute", left: C - 100, top: C - 100, width: 200, height: 200 }}>
            <Ripple x={100} y={100} at={4} size={420} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 56, background: "linear-gradient(180deg, #25252D, #141419)", border: `1.5px solid ${a.dim}`, boxShadow: `0 0 ${70 + 40 * breathe(f, 90)}px -14px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.16)`, display: "flex", alignItems: "center", justifyContent: "center", ...pop(he, 0.4) }}>
              <LogoDraw brand={center} size={110} start={4} dur={26} />
            </div>
          </div>
        </div>
        {label ? <div style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 42, letterSpacing: "-0.025em", color: T.text, textAlign: "center", marginTop: 6, textShadow: "0 4px 24px rgba(0,0,0,0.7)", opacity: ramp(f, settled - 10, settled + 4), transform: `translateY(${(1 - ramp(f, settled - 10, settled + 4)) * 12}px)` }}>{label}</div> : null}
      </Float>
    </Scene>
  );
};
