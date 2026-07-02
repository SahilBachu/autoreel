import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F2, T, useAccent } from "../theme";
import { Panel, Scene } from "../fx";

// ─────────────────────────────────────────────────────────────────────────────
// CommandAmbiguity — a single shell command that reads innocent to a guard but
// de-obfuscates into something dangerous when bash actually runs it. One command
// up top splits down into two panels: GUARD READS (approved) vs BASH RUNS
// (executed). All motion frame-deterministic. reel-1782959613704.
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "#4ADE80";
const GREEN_GLOW = "rgba(74,222,128,0.5)";
const SCRAMBLE = "!@#$%^&*<>/\\|~-_=+[]{}absdfghjkmnpqrtvwxyz0123456789";

type Props = {
  command: string;
  guardReads: string;
  bashRuns: string;
  guardVerdict: string;
  bashVerdict: string;
};

// a wax-seal style verdict stamp, rotated and slammed on
const Stamp: React.FC<{
  text: string;
  color: string;
  glow: string;
  start: number;
  pulse?: boolean;
}> = ({ text, color, glow, start, pulse }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - start, fps, config: { damping: 9, stiffness: 220, mass: 0.7 } });
  if (f < start) return null;
  // slam-in scale (slight overshoot from the low-damping spring)
  const scale = interpolate(s, [0, 1], [1.55, 1]);
  // opening flash for APPROVED, continuous danger pulse for EXECUTED
  const local = f - start;
  const flash = interpolate(local, [0, 2, 5], [0, 1, 0], { extrapolateRight: "clamp" });
  const beat = pulse ? 0.5 + 0.5 * Math.sin(local / 6) : 0;
  const glowSize = pulse ? 34 + beat * 40 : 26;
  return (
    <div
      style={{
        transform: `rotate(-11deg) scale(${scale})`,
        opacity: s,
        border: `3px solid ${color}`,
        color,
        fontFamily: F2.sans,
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: "0.14em",
        padding: "10px 22px",
        borderRadius: 12,
        background: `rgba(0,0,0,0.28)`,
        textShadow: `0 0 22px ${glow}`,
        boxShadow: `0 0 ${glowSize}px ${glow}, inset 0 0 20px rgba(0,0,0,0.4)`,
        filter: `brightness(${1 + flash * 0.9})`,
      }}
    >
      {text}
    </div>
  );
};

const PanelLabel: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <div
    style={{
      fontFamily: F2.mono,
      fontSize: 22,
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      color,
      marginBottom: 22,
    }}
  >
    {text}
  </div>
);

const CommandAmbiguity: React.FC<Props> = ({
  command,
  guardReads,
  bashRuns,
  guardVerdict,
  bashVerdict,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();

  // 1) command types into the top card, frames 0-15
  const typed = Math.round(interpolate(f, [0, 15], [0, command.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cmdShown = command.slice(0, typed);
  const caretOn = f < 20 && Math.floor(f / 8) % 2 === 0;

  // 2) split connectors draw down into both panels, frames 18-30
  const split = interpolate(f, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 3) panels rise in
  const panelIn = spring({ frame: f - 24, fps, config: { damping: 24, stiffness: 130, mass: 0.9 } });

  // 4) right panel de-obfuscates: scramble/collapse → true bashRuns
  const revealStart = 34;
  const cps = 12;
  const revealed = Math.max(0, ((f - revealStart) / fps) * cps);

  return (
    <Scene bg="grid">
      <div style={{ width: 900, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* ── the ambiguous command ── */}
        <Panel glow style={{ padding: "26px 34px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: F2.mono, fontSize: 40, color: a.hex, textShadow: `0 0 20px ${a.glow}` }}>$</span>
            <span style={{ fontFamily: F2.mono, fontSize: 40, color: T.text, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
              {cmdShown}
              {caretOn ? <span style={{ color: a.hex }}>▌</span> : null}
            </span>
          </div>
        </Panel>

        {/* ── split connectors ── */}
        <svg width={900} height={90} style={{ display: "block" }}>
          {[
            { x: 900 * 0.28 }, // to left panel
            { x: 900 * 0.72 }, // to right panel
          ].map((t, i) => {
            const cx = 450;
            const d = `M ${cx} 0 C ${cx} 46, ${t.x} 44, ${t.x} 90`;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={i === 0 ? GREEN : a.hex}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - split}
                opacity={0.55}
                style={{ filter: `drop-shadow(0 0 6px ${i === 0 ? GREEN_GLOW : a.glow})` }}
              />
            );
          })}
        </svg>

        {/* ── the two readings ── */}
        <div style={{ display: "flex", gap: 26, width: "100%", opacity: panelIn }}>
          {/* GUARD READS — innocent surface */}
          <Panel
            style={{
              flex: 1,
              padding: "28px 30px 34px",
              transform: `translateY(${interpolate(panelIn, [0, 1], [26, 0])}px)`,
              position: "relative",
              minHeight: 260,
              borderColor: `rgba(74,222,128,0.28)`,
            }}
          >
            <PanelLabel text="Guard reads" color={GREEN} />
            <div style={{ fontFamily: F2.mono, fontSize: 34, color: T.text, letterSpacing: "-0.01em", wordBreak: "break-all", lineHeight: 1.35 }}>
              {guardReads}
            </div>
            <div style={{ fontFamily: F2.sans, fontSize: 20, color: T.faint, marginTop: 18 }}>
              looks harmless — a scoped temp cleanup
            </div>
            <div style={{ position: "absolute", right: 24, bottom: 26 }}>
              <Stamp text={guardVerdict} color={GREEN} glow={GREEN_GLOW} start={44} />
            </div>
          </Panel>

          {/* BASH RUNS — the de-obfuscated truth */}
          <Panel
            glow
            style={{
              flex: 1,
              padding: "28px 30px 34px",
              transform: `translateY(${interpolate(panelIn, [0, 1], [26, 0])}px)`,
              position: "relative",
              minHeight: 260,
              borderColor: a.dim,
            }}
          >
            <PanelLabel text="Bash runs" color={a.hex} />
            <div style={{ fontFamily: F2.mono, fontSize: 34, letterSpacing: "-0.01em", wordBreak: "break-all", lineHeight: 1.35 }}>
              {bashRuns.split("").map((ch, i) => {
                if (ch === " ") return <span key={i}> </span>;
                if (i < revealed) {
                  return (
                    <span key={i} style={{ color: a.hex, textShadow: `0 0 18px ${a.glow}` }}>
                      {ch}
                    </span>
                  );
                }
                if (i < revealed + 8 && f >= revealStart) {
                  const r = SCRAMBLE[Math.floor(random(`${i}:${Math.floor(f / 2)}`) * SCRAMBLE.length)];
                  return (
                    <span key={i} style={{ color: T.dim }}>
                      {r}
                    </span>
                  );
                }
                return <span key={i} style={{ color: T.faint, opacity: f >= revealStart ? 0.5 : 0 }}>·</span>;
              })}
            </div>
            <div style={{ fontFamily: F2.sans, fontSize: 20, color: a.dim, marginTop: 18 }}>
              quotes stripped — the scope is gone
            </div>
            <div style={{ position: "absolute", right: 24, bottom: 26 }}>
              <Stamp text={bashVerdict} color={a.hex} glow={a.glow} start={74} pulse />
            </div>
          </Panel>
        </div>
      </div>
    </Scene>
  );
};

export default CommandAmbiguity;
