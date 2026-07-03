import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import { F2, T, useAccent } from "../theme";
import { Scene } from "../fx";

// ─────────────────────────────────────────────────────────────────────────────
// CodebaseGraph — a force-directed knowledge graph of a codebase assembling on a
// near-black canvas. Glassy node pills labelled with real filenames, hairline
// accent edges that draw in once both endpoints exist, then a glowing "agent"
// dot walks a path (auth → session → db), lighting each node it touches. Layout
// is deterministic via remotion random(seed); the whole graph breathes with a
// subtle drift. All motion frame-deterministic. reel-1783000899739.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  nodes: string[];
  edges: [string, string][];
  agentPath: string[];
};

// canvas the graph is laid out in (fits within ~950px content width)
const W = 900;
const H = 1040;
const CX = W / 2;
const CY = H / 2;

// timeline (frames @ 30fps)
const NODE_START = 8;
const NODE_STAGGER = 7;
const EDGE_DRAW = 15;
const AGENT_LEAD = 26; // pause after last edge before the agent walks
const SEG_FRAMES = 30; // per hop of the agent path

// deterministic organic layout: golden-angle spiral spread + seeded jitter
function layout(nodes: string[]) {
  const n = nodes.length;
  const maxR = 360;
  return nodes.map((name, i) => {
    const ang = i * 2.399963229; // golden angle
    const r = maxR * Math.sqrt((i + 0.55) / n);
    const jx = (random(`x:${name}`) - 0.5) * 96;
    const jy = (random(`y:${name}`) - 0.5) * 96;
    return { name, bx: CX + Math.cos(ang) * r + jx, by: CY + Math.sin(ang) * r + jy };
  });
}

const CodebaseGraph: React.FC<Props> = ({ nodes, edges, agentPath }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();

  const base = useMemo(() => layout(nodes), [nodes]);
  const idxOf = useMemo(() => {
    const m: Record<string, number> = {};
    nodes.forEach((nm, i) => (m[nm] = i));
    return m;
  }, [nodes]);

  const nodeDelay = (i: number) => NODE_START + i * NODE_STAGGER;
  const lastNodeIn = NODE_START + (nodes.length - 1) * NODE_STAGGER;
  const edgeStart = (e: [string, string]) =>
    Math.max(nodeDelay(idxOf[e[0]]), nodeDelay(idxOf[e[1]])) + 6;
  const lastEdgeDone = Math.max(...edges.map((e) => edgeStart(e) + EDGE_DRAW), lastNodeIn);
  const agentStart = lastEdgeDone + AGENT_LEAD;

  // active edges = consecutive pairs of the agent path (either direction)
  const activeEdges = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < agentPath.length - 1; i++) {
      const [u, v] = [agentPath[i], agentPath[i + 1]];
      s.add(`${u}|${v}`);
      s.add(`${v}|${u}`);
    }
    return s;
  }, [agentPath]);

  // live positions: base + a slow breathing drift, unique per node
  const pts = base.map((p, i) => ({
    ...p,
    x: p.bx + Math.sin(f / 92 + i * 1.7) * 7,
    y: p.by + Math.cos(f / 104 + i * 1.3) * 7,
  }));

  // agent walk param p ∈ [0, len-1]; integer p sits on agentPath[p]
  const walked = interpolate(f, [agentStart, agentStart + SEG_FRAMES * (agentPath.length - 1)], [0, agentPath.length - 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const agentActive = f >= agentStart;

  // agent screen position, sliding along the drifted node polyline
  const seg = Math.min(agentPath.length - 2, Math.floor(walked));
  const local = walked - seg;
  const pA = pts[idxOf[agentPath[seg]]];
  const pB = pts[idxOf[agentPath[Math.min(agentPath.length - 1, seg + 1)]]];
  const agentX = pA.x + (pB.x - pA.x) * local;
  const agentY = pA.y + (pB.y - pA.y) * local;

  // how lit a node is: 0 until the agent reaches it, then eases to 1 and stays
  const litOf = (name: string) => {
    const order = agentPath.indexOf(name);
    if (order < 0 || !agentActive) return 0;
    const arrive = agentStart + order * SEG_FRAMES;
    return interpolate(f, [arrive - 4, arrive + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };

  return (
    <Scene bg="shader">
      <div style={{ position: "relative", width: W, height: H }}>
        {/* ── edges + agent glow (beneath the pills) ── */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {edges.map((e, i) => {
            const s = edgeStart(e);
            const draw = interpolate(f, [s, s + EDGE_DRAW], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            if (draw <= 0) return null;
            const p1 = pts[idxOf[e[0]]];
            const p2 = pts[idxOf[e[1]]];
            const active = activeEdges.has(`${e[0]}|${e[1]}`);
            // active edge lights up as the agent crosses it
            const lit = active ? Math.min(litOf(e[0]), litOf(e[1])) : 0;
            const dim = `rgba(255,255,255,0.10)`;
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={active ? a.hex : dim}
                strokeWidth={active ? 2 + lit * 1.6 : 1.25}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
                opacity={active ? 0.4 + lit * 0.6 : 0.5}
                strokeLinecap="round"
                style={active ? { filter: `drop-shadow(0 0 ${5 + lit * 12}px ${a.glow})` } : undefined}
              />
            );
          })}
        </svg>

        {/* ── the traveling agent dot ── */}
        {agentActive ? (
          <div
            style={{
              position: "absolute",
              left: agentX,
              top: agentY,
              width: 22,
              height: 22,
              marginLeft: -11,
              marginTop: -11,
              borderRadius: "50%",
              background: a.hex,
              boxShadow: `0 0 10px 3px ${a.hex}, 0 0 42px 10px ${a.glow}`,
            }}
          />
        ) : null}

        {/* ── node pills ── */}
        {pts.map((p, i) => {
          const d = nodeDelay(i);
          const s = spring({ frame: f - d, fps, config: { damping: 20, stiffness: 150, mass: 0.8 } });
          if (s <= 0.001) return null;
          const lit = litOf(p.name);
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          return (
            <div
              key={p.name}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: s,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 14,
                background: T.surface,
                border: `1px solid ${lit > 0.02 ? a.dim : T.border}`,
                backdropFilter: "blur(10px)",
                boxShadow: lit > 0.02
                  ? `0 0 ${20 + lit * 46}px -8px ${a.glow}, inset 0 1px 0 ${T.borderBright}`
                  : `inset 0 1px 0 ${T.border}`,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flex: "none",
                  background: a.hex,
                  opacity: 0.35 + lit * 0.65,
                  boxShadow: lit > 0.02 ? `0 0 12px ${a.glow}` : "none",
                }}
              />
              <span
                style={{
                  fontFamily: F2.mono,
                  fontSize: 27,
                  letterSpacing: "-0.01em",
                  color: lit > 0.4 ? T.text : T.dim,
                  textShadow: lit > 0.02 ? `0 0 18px ${a.glow}` : "none",
                }}
              >
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

export default CodebaseGraph;
