import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import { F2, T, useAccent } from "../theme";
import { Scene } from "../fx";

// ─────────────────────────────────────────────────────────────────────────────
// WatermelonModel — a premium AI-model badge for a model literally named
// "Watermelon". A dark glassy panel with a hairline border sits on the near-black
// base; inside, a stylized watermelon slice (green rind arc, accent-tinted flesh,
// dark seeds) floats like a product hero icon over an accent glow, with a drifting
// scanline + grain. Below: the name in Geist bold + a muted "frontier model?" tag.
// All motion is frame-deterministic (useCurrentFrame + spring/interpolate +
// remotion random(seed)). reel-1783086351425.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  name: string;
  tag: string;
};

// watermelon slice geometry (local coords inside a 360-wide hero box)
const R = 150; // slice radius
const SEED_COUNT = 7;

const WatermelonModel: React.FC<Props> = ({ name, tag }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useAccent();

  // panel springs up in scale + opacity on entry
  const enter = spring({ frame: f, fps, config: { damping: 20, stiffness: 120, mass: 0.9 } });
  const panelScale = interpolate(enter, [0, 1], [0.82, 1]);
  const panelLift = interpolate(enter, [0, 1], [46, 0]);

  // hero icon lands a beat after the panel
  const iconIn = spring({ frame: f - 8, fps, config: { damping: 14, stiffness: 140, mass: 0.8 } });

  // slow bob/float on a sine of the frame
  const bob = Math.sin(f / 26) * 12;
  const tilt = Math.sin(f / 34 + 0.6) * 2.2;

  // seeds: deterministic positions across the flesh, staggered twinkle
  const seeds = useMemo(() => {
    const out: { x: number; y: number; rot: number; phase: number }[] = [];
    for (let i = 0; i < SEED_COUNT; i++) {
      // spread across the lower fan of the slice (flesh region)
      const spread = -0.72 + (i / (SEED_COUNT - 1)) * 1.44; // -0.72..0.72 rad from vertical
      const ang = Math.PI / 2 + spread; // measured from +x, downward fan
      const rr = R * (0.42 + random(`sr:${i}`) * 0.32);
      const jitter = (random(`sj:${i}`) - 0.5) * 10;
      out.push({
        x: Math.cos(ang) * rr + jitter,
        y: Math.sin(ang) * rr,
        rot: (random(`srot:${i}`) - 0.5) * 40,
        phase: random(`sp:${i}`) * Math.PI * 2,
      });
    }
    return out;
  }, []);

  // drifting scanline over the glow (0..1 sweep top→bottom of the hero box)
  const scan = ((f % 150) / 150);

  const RIND = 22; // rind band thickness

  return (
    <Scene bg="shader">
      <div
        style={{
          transform: `translateY(${panelLift}px) scale(${panelScale})`,
          opacity: interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            width: 720,
            padding: "88px 72px 72px",
            borderRadius: 40,
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: `0 0 130px -30px ${a.glow}, inset 0 1px 0 ${T.borderBright}`,
            backdropFilter: "blur(14px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ── hero icon zone ── */}
          <div style={{ position: "relative", width: 360, height: 360, marginBottom: 56 }}>
            {/* accent glow behind the slice */}
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: `radial-gradient(circle at 50% 52%, ${a.glow}, transparent 62%)`,
                filter: "blur(26px)",
                opacity: 0.6 * iconIn,
              }}
            />

            {/* the watermelon slice */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateY(${bob}px) rotate(${tilt}deg) scale(${interpolate(iconIn, [0, 1], [0.7, 1])})`,
                opacity: iconIn,
              }}
            >
              <svg width={360} height={360} viewBox="-180 -180 360 360" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="wm-flesh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.hex} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={a.hex} stopOpacity={0.62} />
                  </linearGradient>
                  <clipPath id="wm-clip">
                    <path d={`M ${-R} 0 A ${R} ${R} 0 0 0 ${R} 0 Z`} />
                  </clipPath>
                </defs>

                {/* flesh (semicircle fan pointing down) */}
                <path
                  d={`M ${-R} 0 A ${R} ${R} 0 0 0 ${R} 0 Z`}
                  fill="url(#wm-flesh)"
                  style={{ filter: `drop-shadow(0 0 34px ${a.glow})` }}
                />

                {/* pale inner rim between flesh and rind */}
                <path
                  d={`M ${-R} 0 A ${R} ${R} 0 0 0 ${R} 0`}
                  fill="none"
                  stroke="rgba(255,255,255,0.20)"
                  strokeWidth={6}
                  clipPath="url(#wm-clip)"
                />

                {/* green rind band along the curved edge */}
                <path
                  d={`M ${-(R + RIND / 2)} 0 A ${R + RIND / 2} ${R + RIND / 2} 0 0 0 ${R + RIND / 2} 0`}
                  fill="none"
                  stroke="#3FB950"
                  strokeWidth={RIND}
                  strokeLinecap="round"
                />
                {/* dark rind outline */}
                <path
                  d={`M ${-(R + RIND)} 0 A ${R + RIND} ${R + RIND} 0 0 0 ${R + RIND} 0`}
                  fill="none"
                  stroke="rgba(20,60,28,0.9)"
                  strokeWidth={4}
                  strokeLinecap="round"
                />

                {/* flat top edge highlight */}
                <line x1={-R} y1={0} x2={R} y2={0} stroke="rgba(255,255,255,0.16)" strokeWidth={3} />

                {/* seeds — staggered twinkle */}
                {seeds.map((s, i) => {
                  const tw = 0.55 + 0.45 * Math.sin(f / 9 + s.phase);
                  return (
                    <ellipse
                      key={i}
                      cx={s.x}
                      cy={s.y}
                      rx={5.5}
                      ry={9}
                      transform={`rotate(${s.rot} ${s.x} ${s.y})`}
                      fill="#0B0B0E"
                      opacity={tw * iconIn}
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={1}
                    />
                  );
                })}
              </svg>
            </div>

            {/* drifting scanline over the glow */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${scan * 100}%`,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${a.hex}, transparent)`,
                opacity: 0.35 * iconIn,
                filter: `blur(1px)`,
              }}
            />
            {/* fine scanline texture + grain */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)`,
                opacity: 0.5 * iconIn,
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* ── name ── */}
          <div
            style={{
              fontFamily: F2.sans,
              fontWeight: 700,
              fontSize: 82,
              letterSpacing: "-0.03em",
              color: T.text,
              lineHeight: 1,
              textAlign: "center",
              opacity: interpolate(f, [16, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(f, [16, 28], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              textShadow: `0 0 44px ${a.glow}`,
            }}
          >
            {name}
          </div>

          {/* ── muted tag ── */}
          <div
            style={{
              marginTop: 26,
              padding: "10px 22px",
              borderRadius: 999,
              background: T.surface2,
              border: `1px solid ${T.border}`,
              fontFamily: F2.mono,
              fontSize: 26,
              letterSpacing: "0.04em",
              color: T.dim,
              opacity: interpolate(f, [24, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {tag}
          </div>
        </div>
      </div>
    </Scene>
  );
};

export default WatermelonModel;
