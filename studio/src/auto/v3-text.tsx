import { spring } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { SPRING, breathe, clamp01, focusIn, ramp, schedule, useT, wave, Kicker } from "./kit";

// ── Kinetic (kind "kinetic") — an emphasis line, word by word. Each word SLAMS in (scale
// down from 1.4 + blur-to-sharp + drop), timed across the first half of the beat so it
// lands with his voice; the `emphasis` word takes the accent, gets an underline that draws
// under it, and glows; afterwards every word keeps a tiny bob so the hold stays alive.
// Overlays his face (big type, dark shadow, no card).
export const Kinetic: React.FC<{ text: string; emphasis?: string; kicker?: string }> = ({ text, emphasis, kicker }) => {
  const a = useAccent();
  const { f, fps, beat } = useT();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = text.split(/\s+/).filter(Boolean).slice(0, 14);
  const emph = new Set((emphasis ?? "").split(/\s+/).map(norm).filter(Boolean));
  const size = Math.max(80, Math.min(156, Math.round(2300 / Math.max(text.length, 12))));
  const at = schedule(words.length, beat, { start: kicker ? 8 : 3, fill: 0.42, min: 3, max: 10 });
  const done = (at[at.length - 1] ?? 0) + 16;
  return (
    <Scene bg="shader" overlay>
      <div style={{ textAlign: "center", maxWidth: 980 }}>
        {kicker ? <div style={focusIn(clamp01(spring({ frame: f, fps, config: SPRING.snappy })))}><Kicker text={kicker} /></div> : null}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: size * 0.26, rowGap: size * 0.02, lineHeight: 1.04 }}>
          {words.map((w, i) => {
            const p = spring({ frame: f - at[i], fps, config: { damping: 14, stiffness: 240, mass: 0.6 } });
            if (f < at[i]) return <span key={i} style={{ fontFamily: F2.sans, fontWeight: 800, fontSize: size, letterSpacing: "-0.045em", opacity: 0 }}>{w}</span>;
            const hot = emph.has(norm(w));
            const bob = f > done ? wave(f, 120, i * 0.8) * 3 : 0;
            const u = hot ? ramp(f, at[i] + 6, at[i] + 18) : 0;
            return (
              <span
                key={i}
                style={{
                  position: "relative",
                  display: "inline-block",
                  fontFamily: F2.sans,
                  fontWeight: 800,
                  fontSize: size,
                  letterSpacing: "-0.045em",
                  color: hot ? a.hex : T.text,
                  textShadow: hot ? `0 0 ${34 + 20 * breathe(f, 80)}px ${a.glow}, 0 6px 30px rgba(0,0,0,0.55)` : "0 6px 30px rgba(0,0,0,0.6)",
                  opacity: clamp01(p * 1.6),
                  filter: p < 0.98 ? `blur(${Math.max(0, 1 - p) * 10}px)` : undefined,
                  transform: `translateY(${(1 - p) * -26 + bob}px) scale(${1.4 - 0.4 * Math.min(1.05, p)})`,
                }}
              >
                {w}
                {hot ? <span style={{ position: "absolute", left: "4%", bottom: -size * 0.06, height: Math.max(6, size * 0.07), width: `${u * 92}%`, borderRadius: 8, background: a.hex, boxShadow: `0 0 18px ${a.glow}` }} /> : null}
              </span>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};
