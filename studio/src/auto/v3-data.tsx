import { Easing } from "remotion";
import { F2, T, useAccent } from "./theme";
import { Scene } from "./fx";
import { Chip, Float, LiveDot, LogoTile, Ripple, Roll, Spinner, Surface, Window, breathe, clamp01, focusIn, parseNum, pop, ramp, rise, schedule, slide, useT } from "./kit";

// ── v3 data vocabulary: json (an API response streaming in) · repo (a GitHub repo card
// with its real star count). Numbers come from props — never invented.

// JSON line → coloured tokens: "key": bright · "string" accent · numbers/bools bright · rest faint
const jsonToks = (line: string, hex: string) => {
  const out: { t: string; c: string; w?: number }[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d[\d.eE+-]*\b|\btrue\b|\bfalse\b|\bnull\b)|(\s+)|([^\s"]+?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1] && m[2]) out.push({ t: m[1], c: T.text, w: 500 }, { t: m[2], c: T.faint });
    else if (m[1]) out.push({ t: m[1], c: hex });
    else if (m[3]) out.push({ t: m[3], c: "#FFFFFF", w: 600 });
    else out.push({ t: m[0], c: T.faint });
  }
  return out;
};

// ── Json (kind "json") — an API call: method + path in the title bar, a spinner while it's
// in flight, the status pill lands, then the pretty-printed response STREAMS in line by line
// with syntax colour. `highlight` keys get an accent band that breathes through the hold.
export const Json: React.FC<{ title?: string; method?: string; status?: string; data: unknown; highlight?: string[] }> = ({ title, method, status, data, highlight = [] }) => {
  const a = useAccent();
  const { f, beat, sp } = useT();
  let text: string;
  if (typeof data === "string") {
    try {
      text = JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      text = data;
    }
  } else text = JSON.stringify(data ?? {}, null, 2);
  let lines = text.split("\n");
  if (lines.length > 16) lines = [...lines.slice(0, 15), "  …"];
  const RESP = 20;
  const at = schedule(lines.length, beat, { start: RESP + 4, fill: 0.42, min: 1.5, max: 5 });
  const allIn = (at[at.length - 1] ?? RESP) + 6;
  const hot = (l: string) => highlight.some((k) => l.includes(`"${k}"`));
  const e = sp(0);
  const ok = !status || /^2|ok|success/i.test(status);
  const right = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 999, flexShrink: 0, fontFamily: F2.mono, fontSize: 20, letterSpacing: "0.06em", background: f >= RESP ? (ok ? a.soft : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.05)", border: `1px solid ${f >= RESP ? (ok ? a.dim : T.borderBright) : T.border}`, color: f >= RESP ? (ok ? a.hex : T.text) : T.dim, ...(f >= RESP ? pop(sp(RESP, "bouncy"), 0.7) : {}) }}>
      {f >= RESP ? <LiveDot size={9} color={ok ? undefined : T.dim} /> : <Spinner size={16} />}
      {f >= RESP ? status ?? "response" : "sending"}
    </span>
  );
  return (
    <Scene bg="grid">
      <Float style={{ width: 930 }} seed={1.3} amp={4}>
        <div style={rise(e, 36, 0.96)}>
          <Window
            glow
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                {method ? <span style={{ fontFamily: F2.mono, fontWeight: 700, fontSize: 20, letterSpacing: "0.08em", color: T.bg, background: a.hex, padding: "4px 10px", borderRadius: 8 }}>{method.toUpperCase()}</span> : null}
                <span style={{ color: T.text }}>{title ?? "response.json"}</span>
              </span>
            }
            right={right}
            bodyStyle={{ position: "relative", padding: "24px 0 28px" }}
          >
            {f < RESP + 4 ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: F2.mono, fontSize: 24, color: T.faint, opacity: 1 - ramp(f, RESP, RESP + 4) }}>
                <Spinner size={26} />
                waiting for response
              </div>
            ) : null}
            {lines.map((l, i) => {
              const le = f >= at[i] ? sp(at[i], "snappy") : 0;
              const h = hot(l);
              const band = h ? ramp(f, allIn + i * 1.5, allIn + 12 + i * 1.5, 0, 1, Easing.out(Easing.cubic)) : 0;
              return (
                <div key={i} style={{ position: "relative", display: "flex", padding: "0 34px", opacity: clamp01(le * 1.4), transform: `translateX(${(1 - clamp01(le)) * -10}px)` }}>
                  {h ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${band * 100}%`, background: `linear-gradient(90deg, ${a.soft}, transparent)`, boxShadow: `inset 4px 0 0 ${a.hex}`, opacity: 0.75 + 0.25 * breathe(f, 80, i) }} /> : null}
                  <span style={{ position: "relative", width: 48, fontFamily: F2.mono, fontSize: 22, lineHeight: "42px", color: h && band > 0 ? a.hex : "rgba(250,250,250,0.22)", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ position: "relative", fontFamily: F2.mono, fontSize: 28, lineHeight: "42px", whiteSpace: "pre" }}>
                    {jsonToks(l, a.hex).map((k, j) => (
                      <span key={j} style={{ color: k.c, fontWeight: k.w }}>
                        {k.t}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
          </Window>
        </div>
      </Float>
    </Scene>
  );
};

// small GitHub-style icons
const StarIcon: React.FC<{ size: number; fill: string; stroke: string }> = ({ size, fill, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
  </svg>
);
const ForkIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2" strokeLinecap="round">
    <circle cx="6" cy="5" r="2.2" />
    <circle cx="18" cy="5" r="2.2" />
    <circle cx="12" cy="19" r="2.2" />
    <path d="M6 7.2v1.3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.2M12 11.5v5.3" />
  </svg>
);

// ── Repo (kind "repo") — a GitHub repo blowing up: owner/name, description, topics, then
// the ★ Star button gets CLICKED (fills, ripple) and the REAL star count rolls up like an
// odometer; forks + language beside it, an optional "+N today" trending chip and a star-
// history sparkline (real values) whose tip keeps pulsing through the hold.
export const Repo: React.FC<{ repo: string; description?: string; stars: string; forks?: string; language?: string; topics?: string[]; today?: string; spark?: number[] }> = ({
  repo,
  description,
  stars,
  forks,
  language,
  topics = [],
  today,
  spark,
}) => {
  const a = useAccent();
  const { f, sp } = useT();
  const [owner, name] = repo.includes("/") ? [repo.split("/")[0], repo.split("/").slice(1).join("/")] : ["", repo];
  const e = sp(0);
  const STAR = 30;
  const starred = f >= STAR;
  const press = f >= STAR - 3 && f < STAR + 5;
  const vals = spark && spark.length >= 2 ? spark : null;
  const SW = 860;
  const SH = 170;
  const draw = ramp(f, 40, 80, 0, 1, Easing.inOut(Easing.cubic));
  let d = "";
  let area = "";
  let tip = { x: 0, y: 0 };
  if (vals) {
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * SW, y: SH - 10 - ((v - mn) / Math.max(1e-6, mx - mn)) * (SH - 24) }));
    d = pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    area = `${d} L ${SW} ${SH} L 0 ${SH} Z`;
    tip = pts[pts.length - 1];
  }
  return (
    <Scene bg="shader">
      <Float style={{ width: 920 }} seed={2.1} amp={4}>
        <div style={rise(e, 40, 0.95)}>
          <Surface glow radius={32} style={{ padding: "40px 44px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <LogoTile brand="GitHub" size={66} radius={18} />
              <div style={{ flex: 1, minWidth: 0, fontFamily: F2.sans, fontSize: 44, letterSpacing: "-0.03em", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {owner ? <span style={{ color: T.dim, fontWeight: 500 }}>{owner} / </span> : null}
                <span style={{ color: T.text, fontWeight: 700 }}>{name}</span>
              </div>
              <span style={{ fontFamily: F2.mono, fontSize: 19, color: T.dim, border: `1px solid ${T.borderBright}`, borderRadius: 999, padding: "5px 14px", flexShrink: 0 }}>Public</span>
            </div>
            {description ? <div style={{ fontFamily: F2.sans, fontSize: 32, lineHeight: 1.35, color: T.dim, marginTop: 20, ...focusIn(sp(6, "snappy")) }}>{description}</div> : null}
            {topics.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                {topics.slice(0, 5).map((t, i) => (
                  <span key={i} style={{ fontFamily: F2.sans, fontWeight: 600, fontSize: 22, color: a.hex, background: a.soft, borderRadius: 999, padding: "6px 16px", ...pop(sp(10 + i * 3, "bouncy"), 0.6) }}>{t}</span>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 30, paddingTop: 28, borderTop: `1px solid ${T.border}` }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, padding: "14px 24px 14px 18px", borderRadius: 18, background: starred ? a.soft : "rgba(255,255,255,0.05)", border: `1px solid ${starred ? a.dim : T.borderBright}`, transform: `scale(${press ? 0.93 : 1})`, boxShadow: starred ? `0 0 ${26 + 14 * breathe(f, 80)}px -10px ${a.glow}` : "none" }}>
                <StarIcon size={40} fill={starred ? a.hex : "none"} stroke={starred ? a.hex : T.dim} />
                <span style={{ fontFamily: F2.sans, fontWeight: 700, fontSize: 58, letterSpacing: "-0.04em", color: T.text, lineHeight: 1 }}>{parseNum(stars) ? <Roll value={stars} start={STAR + 2} dur={34} stagger={3} /> : stars}</span>
                <Ripple x={38} y={42} at={STAR} size={130} />
              </div>
              {forks ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: F2.sans, fontWeight: 600, fontSize: 30, color: T.dim, ...slide(sp(STAR + 8, "snappy"), -12) }}>
                  <ForkIcon size={28} />
                  {forks}
                </span>
              ) : null}
              {language ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: F2.sans, fontWeight: 500, fontSize: 28, color: T.dim, ...slide(sp(STAR + 12, "snappy"), -12) }}>
                  <span style={{ width: 16, height: 16, borderRadius: 8, background: a.hex }} />
                  {language}
                </span>
              ) : null}
            </div>
            {today ? (
              <div style={{ marginTop: 22, ...pop(sp(STAR + 26, "bouncy"), 0.6), transformOrigin: "left center" }}>
                <Chip hero style={{ fontSize: 24, padding: "10px 20px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.hex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>
                  {today}
                </Chip>
              </div>
            ) : null}
            {vals ? (
              <div style={{ position: "relative", marginTop: 26, height: SH }}>
                <svg width={SW} height={SH} style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="repoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={a.hex} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={a.hex} stopOpacity="0" />
                    </linearGradient>
                    <clipPath id="repoClip">
                      <rect x="0" y="-20" width={draw * SW + 2} height={SH + 40} />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#repoClip)">
                    <path d={area} fill="url(#repoArea)" />
                    <path d={d} fill="none" stroke={a.hex} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${a.glow})` }} />
                  </g>
                </svg>
                {draw >= 1 ? (
                  <div style={{ position: "absolute", left: tip.x - 11, top: tip.y - 11, display: "flex" }}>
                    <LiveDot size={22} />
                  </div>
                ) : null}
                <div style={{ position: "absolute", left: 0, bottom: -30, fontFamily: F2.mono, fontSize: 18, letterSpacing: "0.16em", textTransform: "uppercase", color: T.faint }}>star history</div>
              </div>
            ) : null}
          </Surface>
        </div>
      </Float>
    </Scene>
  );
};
