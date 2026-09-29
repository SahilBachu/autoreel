import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { getLogo } from "./logos";
import { Check, Edge, Float, LiveDot, Spinner, Surface, breathe, clamp01, pop, ramp, useT, type Pt } from "./kit";

// ─────────────────────────────────────────────────────────────────────────────
// flow — the n8n / Make workflow graph (THE signature "AI automation" visual).
// Nodes (real app logos, or a fitting glyph) pop onto a dotted canvas, the edges draw,
// then the workflow RUNS: a bright packet travels each edge in order and every node it
// reaches lights up with a check. After the run, data keeps flowing along every edge
// and a glow wave rolls through the nodes for the rest of the hold.
// Layout is automatic: levels left→right (≤4 levels), a snake over two rows beyond that;
// branches stack vertically. Edges default to a straight chain in node order.
// ─────────────────────────────────────────────────────────────────────────────

type FNode = { label: string; brand?: string; sub?: string };
type FEdge = [number | string, number | string];

// generic glyphs for nodes with no brand mark (lucide-style strokes)
const GLYPHS: [RegExp, React.ReactNode][] = [
  [/\b(ai|agent|llm|gpt|claude|model|summari[sz]e|classif|prompt)\b/i, <path key="s" d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" fill="currentColor" stroke="none" />],
  [/\b(schedule|cron|every|daily|timer|interval)\b/i, <g key="c"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>],
  [/\b(email|mail|inbox|send)\b/i, <g key="m"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></g>],
  [/\b(webhook|trigger|event|on )\b/i, <path key="b" d="M13 2L4 14h7l-1 8 9-12h-7z" />],
  [/\b(if|filter|switch|route|router|branch|condition)\b/i, <g key="r"><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M6 15.5V3M18 8.5a9 9 0 0 1-9 9" /></g>],
  [/\b(code|script|function|js|python)\b/i, <path key="k" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />],
  [/\b(http|api|request|fetch|scrape|web|url)\b/i, <g key="g"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></g>],
  [/\b(db|database|sheet|table|store|save|postgres|supabase|airtable)\b/i, <g key="d"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></g>],
  [/\b(doc|file|pdf|report|note)\b/i, <path key="f" d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />],
  [/\b(chat|message|reply|slack|dm|post)\b/i, <path key="h" d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />],
];

const NodeMark: React.FC<{ n: FNode; size: number }> = ({ n, size }) => {
  const ic = getLogo(n.brand ?? n.label);
  if (ic) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d={ic.path} />
      </svg>
    );
  }
  const g = GLYPHS.find(([re]) => re.test(`${n.label} ${n.sub ?? ""}`));
  if (g) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff" }}>
        {g[1]}
      </svg>
    );
  }
  return <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: size * 0.8, color: T.text }}>{n.label.trim().slice(0, 1).toUpperCase()}</span>;
};

export const Flow: React.FC<{ title?: string; nodes: FNode[]; edges?: FEdge[] }> = ({ title, nodes, edges }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  const ns = (nodes ?? []).slice(0, 7);
  const N = ns.length;
  const idx = (v: number | string) => (typeof v === "number" ? v : ns.findIndex((n) => n.label.toLowerCase() === String(v).toLowerCase()));
  const es: [number, number][] = (edges && edges.length ? edges.map(([x, y]) => [idx(x), idx(y)] as [number, number]) : ns.slice(1).map((_, i) => [i, i + 1] as [number, number])).filter(
    ([x, y]) => x >= 0 && y >= 0 && x < N && y < N && x !== y,
  );

  // levels = longest path from a source (cycle-safe: bounded passes)
  const lvl = new Array(N).fill(0);
  for (let it = 0; it < N; it++) for (const [x, y] of es) if (lvl[y] < lvl[x] + 1 && lvl[x] + 1 < N) lvl[y] = lvl[x] + 1;
  const L = N ? Math.max(...lvl) + 1 : 1;
  const snake = L > 4;
  const perRow = snake ? Math.ceil(L / 2) : L;
  const rows = snake ? 2 : 1;
  const byLvl: number[][] = Array.from({ length: L }, () => []);
  ns.forEach((_, i) => byLvl[lvl[i]].push(i));

  // geometry (canvas px)
  const W = 960;
  const INSET = 44;
  const TILE = 124;
  const PITCH = 232;
  const PAD = 26;
  const bandH = (r: number) => Math.max(1, ...byLvl.filter((_, c) => Math.floor(c / perRow) === r).map((g) => g.length)) * PITCH;
  const bandTop = (r: number) => (r === 0 ? 0 : bandH(0));
  const H = Array.from({ length: rows }, (_, r) => bandH(r)).reduce((s, x) => s + x, 0) + PAD * 2;
  const colW = (W - INSET * 2) / perRow;
  const pos = ns.map((_, i) => {
    const c = lvl[i];
    const r = Math.floor(c / perRow);
    const p = c % perRow;
    const col = r % 2 === 0 ? p : perRow - 1 - p;
    const g = byLvl[c];
    const k = g.indexOf(i);
    const top = PAD + bandTop(r) + (bandH(r) - g.length * PITCH) / 2 + k * PITCH;
    return { x: INSET + colW * (col + 0.5), y: top + 22 + TILE / 2, row: r, rtl: r % 2 === 1 };
  });
  const hasIn = ns.map((_, i) => es.some(([, y]) => y === i));
  const hasOut = ns.map((_, i) => es.some(([x]) => x === i));

  // timeline: nodes pop (by level), edges draw, then the run walks the graph
  const order = ns.map((_, i) => i).sort((p, q) => lvl[p] - lvl[q] || p - q);
  const step = Math.max(4, Math.min(9, (beat * 0.2) / Math.max(1, N)));
  const appear: number[] = [];
  order.forEach((i, k) => (appear[i] = Math.round(6 + k * step)));
  const edgeAt = es.map(([x, y]) => Math.max(appear[x], appear[y]) + 5);
  const buildEnd = Math.max(0, ...edgeAt.map((s) => s + 14), ...appear) + 6;
  const hop = Math.max(12, Math.min(28, (beat * 0.62 - buildEnd) / Math.max(1, L - 1)));
  const exec = new Array(N).fill(buildEnd);
  for (const i of order) for (const [x, y] of es) if (y === i) exec[i] = Math.max(exec[i], exec[x] + hop);
  const runEnd = Math.max(buildEnd, ...exec) + 10;

  const ports = (x: number, y: number) => {
    const o = pos[x];
    const t = pos[y];
    const h = TILE / 2 + 7;
    if (o.row === t.row) {
      const dir = t.x >= o.x ? 1 : -1;
      return { from: { x: o.x + dir * h, y: o.y }, to: { x: t.x - dir * h, y: t.y }, via: undefined as [Pt, Pt] | undefined };
    }
    // row change: a U-turn down the outer side (right edge for a left→right first row)
    const side = o.rtl ? -1 : 1;
    const from = { x: o.x + side * h, y: o.y };
    const to = { x: t.x + side * h, y: t.y };
    const out = side > 0 ? Math.max(from.x, to.x) + 70 : Math.min(from.x, to.x) - 70;
    return { from, to, via: [{ x: out, y: from.y }, { x: out, y: to.y }] as [Pt, Pt] };
  };

  const e = sp(0);
  const status = f < buildEnd ? "ready" : f < runEnd ? "running" : "success";
  return (
    <Scene bg="grid">
      <Float style={{ width: W }} seed={0.7} amp={4}>
        <div style={{ transform: `translateY(${(1 - e) * 36}px) scale(${0.96 + 0.04 * e})`, opacity: clamp01(e * 1.3) }}>
          <Surface glow radius={32}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 30px", borderBottom: `1px solid ${T.border}` }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="6" height="6" rx="1.5" />
                <rect x="16" y="15" width="6" height="6" rx="1.5" />
                <path d="M8 6h4a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2" />
              </svg>
              <span style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 32, letterSpacing: "-0.02em", color: T.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title ?? "workflow"}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: status === "success" ? a.soft : "rgba(255,255,255,0.05)", border: `1px solid ${status === "success" ? a.dim : T.border}`, fontFamily: F2.mono, fontSize: 20, letterSpacing: "0.08em", color: status === "ready" ? T.faint : status === "running" ? T.dim : a.hex }}>
                {status === "running" ? <Spinner size={18} /> : status === "success" ? <Check size={18} width={3.4} /> : <LiveDot size={9} color={T.faint} />}
                {status}
              </span>
            </div>
            <div style={{ position: "relative", height: H, backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 1.3px, transparent 1.4px)", backgroundSize: "30px 30px", backgroundPosition: "15px 15px" }}>
              <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {es.map(([x, y], k) => {
                  const pr = ports(x, y);
                  const hot = ramp(f, exec[x] + hop * 0.85, exec[x] + hop + 2);
                  return <Edge key={k} from={pr.from} to={pr.to} via={pr.via} start={edgeAt[k]} dur={14} hot={hot} pulseAt={exec[x]} pulseDur={hop} flowFrom={runEnd + (k % 3) * 5} packets={2} period={48} width={3} />;
                })}
                {ns.map((_, i) => {
                  const p = pos[i];
                  const o = clamp01(ramp(f, appear[i] + 2, appear[i] + 10));
                  const lit = f >= exec[i];
                  const h = TILE / 2 + 7;
                  const inX = p.rtl ? p.x + h : p.x - h;
                  const outX = p.rtl ? p.x - h : p.x + h;
                  return (
                    <g key={`p${i}`} opacity={o}>
                      {hasIn[i] ? <circle cx={inX} cy={p.y} r={7} fill="#0E0E12" stroke={lit ? a.hex : T.borderBright} strokeWidth={2.5} /> : null}
                      {hasOut[i] ? <circle cx={outX} cy={p.y} r={7} fill={lit ? a.hex : "#2A2A31"} stroke={lit ? a.hex : T.borderBright} strokeWidth={2.5} /> : null}
                    </g>
                  );
                })}
              </svg>
              {ns.map((n, i) => {
                const p = pos[i];
                const pe = sp(appear[i], "bouncy");
                const lit = f >= exec[i];
                const bump = lit ? 0.09 * (1 - ramp(f, exec[i], exec[i] + 12)) : 0;
                const ce = sp(exec[i], "bouncy");
                const trigger = !hasIn[i] && hasOut[i];
                const wave = f > runEnd ? breathe(f, 96, -lvl[i] * 0.9) : 1;
                const R = 30;
                return (
                  <div key={i} style={{ position: "absolute", left: p.x - 115, top: p.y - TILE / 2, width: 230, display: "flex", flexDirection: "column", alignItems: "center", ...pop(pe, 0.5) }}>
                    <div
                      style={{
                        position: "relative",
                        width: TILE,
                        height: TILE,
                        borderRadius: trigger ? (p.rtl ? `${R}px ${TILE / 2}px ${TILE / 2}px ${R}px` : `${TILE / 2}px ${R}px ${R}px ${TILE / 2}px`) : R,
                        background: "linear-gradient(180deg, #1D1D24, #121217)",
                        border: `2px solid ${lit ? a.hex : T.borderBright}`,
                        boxShadow: lit ? `0 0 ${24 + 26 * wave}px -6px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.12)` : "0 18px 40px -18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.10)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `scale(${1 + bump})`,
                      }}
                    >
                      <NodeMark n={n} size={58} />
                      {lit ? (
                        <div style={{ position: "absolute", top: -12, right: -12, width: 38, height: 38, borderRadius: 19, background: a.hex, border: `3px solid #0E0E12`, display: "flex", alignItems: "center", justifyContent: "center", ...pop(ce, 0.2) }}>
                          <Check size={20} color={T.bg} width={3.8} />
                        </div>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 14, fontFamily: F2.sans, fontWeight: 600, fontSize: 27, letterSpacing: "-0.015em", lineHeight: 1.15, color: lit ? T.text : T.dim, textAlign: "center", maxWidth: 226, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.label}</div>
                    {n.sub ? <div style={{ marginTop: 4, fontFamily: F2.mono, fontSize: 19, color: T.faint, textAlign: "center", maxWidth: 226, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div> : null}
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
