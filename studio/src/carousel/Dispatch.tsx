import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { loadFont as loadBarlow } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadNewsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

// ─────────────────────────────────────────────────────────────────────────────
// THE DISPATCH — the news-carousel design system. Deliberately NOT the reels' look (dark glass,
// one neon accent): a risograph-printed broadsheet. Newsprint paper, exactly TWO spot inks per
// issue that overprint (multiply) where they cross, halftone-dot images, a hair of
// misregistration, condensed headline type over a newspaper serif. Printed, human, tactile —
// nothing about it says "AI dashboard".
//
// The whole carousel is ONE wide image (slides × 1080 by 1350) sliced into slides afterwards
// (bot/src/lib/carousel.ts), so things cross the seams on purpose: the cover's halftone spills
// into slide 2, and a "wire" runs along the bottom of every slide, station to station, so each
// swipe visibly continues the last one.
// ─────────────────────────────────────────────────────────────────────────────

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

const barlow = loadBarlow("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin"] }).fontFamily;
const news = loadNewsreader("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
const newsItalic = loadNewsreader("italic", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
const mono = loadSpaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#F1ECE0";

// real riso drum colours, in pairs that overprint well. One pair per issue (rotated by issue no).
export const INK_PAIRS: Record<string, { a: string; b: string; name: string }> = {
  pinkblue: { a: "#FF48B0", b: "#0078BF", name: "fluorescent pink + blue" },
  redteal: { a: "#FF665E", b: "#00838A", name: "bright red + teal" },
  orangefederal: { a: "#FF6C2F", b: "#3D5588", name: "orange + federal blue" },
  greenpink: { a: "#00A95C", b: "#FF48B0", name: "green + fluorescent pink" },
  yellowblue: { a: "#F7C200", b: "#0078BF", name: "sunflower + blue" },
};

export type Slide =
  | { type: "cover"; kicker: string; headline: string; deck: string; image?: string; imageCaption?: string; imageAspect?: number }
  | { type: "points"; title: string; points: string[] }
  | { type: "diagram"; title: string; flows: { label: string; steps: string[]; highlight?: boolean }[]; note?: string }
  | { type: "stat"; value: string; label: string; sub?: string }
  | { type: "split"; title: string; left: { label: string; text: string }; right: { label: string; text: string } }
  | { type: "quote"; text: string; who: string }
  | { type: "takeaways"; title: string; items: string[] }
  | { type: "cta"; handle: string; line: string; keyword: string; avatar?: string };

export type DispatchProps = {
  issue: number;
  date: string; // "OCT 25 2026"
  inks?: keyof typeof INK_PAIRS;
  station?: string[]; // one short label per slide for the wire ("THE NEWS", "HOW", ...)
  slides: Slide[];
};

type Ink = { a: string; b: string };
const Ctx = React.createContext<Ink>(INK_PAIRS.pinkblue);
const useInk = () => React.useContext(Ctx);

// ── print primitives ─────────────────────────────────────────────────────────

// newsprint: warm paper, fine grain, a few fibres — static, deterministic (fixed seeds)
const Paper: React.FC<{ w: number }> = ({ w }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    <svg width={w} height={SLIDE_H} style={{ position: "absolute", inset: 0 }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.55 0" />
      </filter>
      <rect width={w} height={SLIDE_H} filter="url(#grain)" opacity="0.32" />
      <filter id="fibre">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.44  0 0 0 0 0.33  0 0 0 0.9 -0.42" />
      </filter>
      <rect width={w} height={SLIDE_H} filter="url(#fibre)" opacity="0.5" />
    </svg>
  </AbsoluteFill>
);

// one ink layer: everything inside prints in `color`, overprints what's under it, and sits a
// hair off-register (riso drums never line up perfectly)
const InkLayer: React.FC<{ color: string; reg?: [number, number]; style?: React.CSSProperties; children: React.ReactNode }> = ({ color, reg = [0, 0], style, children }) => (
  <div style={{ color, mixBlendMode: "multiply", translate: `${reg[0]}px ${reg[1]}px`, ...style }}>{children}</div>
);

// halftone: an image re-screened as ink dots on a rotated grid (computed in the page, once)
export const Halftone: React.FC<{ src: string; ink: string; w: number; h: number; cell?: number; angle?: number; contrast?: number; style?: React.CSSProperties }> = ({
  src, ink, w, h, cell = 11, angle = 22, contrast = 1.25, style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender(`halftone ${src}`));
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = ref.current!;
      const g = c.getContext("2d")!;
      // object-fit: cover into a sampling canvas
      const s = document.createElement("canvas");
      s.width = w;
      s.height = h;
      const sg = s.getContext("2d")!;
      const k = Math.max(w / img.width, h / img.height);
      sg.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
      const px = sg.getImageData(0, 0, w, h).data;
      const lum = (x: number, y: number) => {
        const xi = Math.min(w - 1, Math.max(0, Math.round(x)));
        const yi = Math.min(h - 1, Math.max(0, Math.round(y)));
        const i = (yi * w + xi) * 4;
        return (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
      };
      g.clearRect(0, 0, w, h);
      g.fillStyle = ink;
      const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const R = Math.hypot(w, h);
      for (let u = -R; u < R; u += cell) {
        for (let v = -R; v < R; v += cell) {
          const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca;
          if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
          const d = Math.min(1, Math.max(0, (1 - lum(x, y) - 0.5) * contrast + 0.5));
          const r = (cell / 2) * Math.sqrt(d) * 1.12;
          if (r < 0.6) continue;
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = src.startsWith("http") ? src : staticFile(src);
  }, [src, ink, w, h, cell, angle, contrast, handle]);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block", mixBlendMode: "multiply", ...style }} />;
};

// ── type ─────────────────────────────────────────────────────────────────────
const T = {
  head: (size: number): React.CSSProperties => ({ fontFamily: barlow, fontWeight: 900, fontSize: size, lineHeight: 0.86, letterSpacing: "-0.01em", textTransform: "uppercase" }),
  sub: (size: number): React.CSSProperties => ({ fontFamily: barlow, fontWeight: 700, fontSize: size, lineHeight: 0.95, letterSpacing: "0.01em", textTransform: "uppercase" }),
  body: (size: number): React.CSSProperties => ({ fontFamily: news, fontWeight: 500, fontSize: size, lineHeight: 1.22, letterSpacing: "-0.005em" }),
  deck: (size: number): React.CSSProperties => ({ fontFamily: newsItalic, fontStyle: "italic", fontWeight: 400, fontSize: size, lineHeight: 1.16 }),
  mono: (size: number): React.CSSProperties => ({ fontFamily: mono, fontWeight: 700, fontSize: size, letterSpacing: "0.08em", textTransform: "uppercase" }),
};

// headline with the riso overprint trick: the words in ink A, a block of ink B behind the
// emphasised word, the overlap printing as a third colour
const Headline: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  const ink = useInk();
  // *word* marks the emphasis; default: the last word
  const parts = text.includes("*") ? text.split(/(\*[^*]+\*)/) : [text.replace(/(\S+)$/, ""), `*${text.split(/\s+/).pop()}*`];
  return (
    <div style={{ position: "relative", ...T.head(size) }}>
      {parts.filter(Boolean).map((p, i) =>
        p.startsWith("*") ? (
          <span key={i} style={{ position: "relative", whiteSpace: "nowrap" }}>
            <span style={{ position: "absolute", left: "-0.06em", right: "-0.06em", top: "0.16em", bottom: "0.02em", background: ink.b, mixBlendMode: "multiply", rotate: "-1.2deg" }} />
            <span style={{ position: "relative", color: ink.a, mixBlendMode: "multiply" }}>{p.slice(1, -1)}</span>
          </span>
        ) : (
          <span key={i} style={{ color: ink.a, mixBlendMode: "multiply" }}>{p}</span>
        ),
      )}
    </div>
  );
};

// top strip of every slide: masthead, issue, folio
const Masthead: React.FC<{ issue: number; date: string; n: number; total: number }> = ({ issue, date, n, total }) => {
  const ink = useInk();
  return (
    <InkLayer color={ink.b} style={{ position: "absolute", left: 72, right: 72, top: 64 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", ...T.mono(22) }}>
        <span>The 21st Century Dispatch</span>
        <span>№ {String(issue).padStart(3, "0")} · {date} · {String(n).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
      </div>
      <div style={{ height: 5, background: ink.b, marginTop: 16 }} />
      <div style={{ height: 2, background: ink.b, marginTop: 5 }} />
    </InkLayer>
  );
};

// every non-cover slide: the title at the top, the content centred in the room that's left
// every non-cover slide: the title at the top, the content centred in the room that's left
// every non-cover slide: the title at the top, the content centred in the room that's left
const Body: React.FC<{ title?: React.ReactNode; children: React.ReactNode; top?: number }> = ({ title, children, top = 186 }) => (
  <div style={{ position: "absolute", left: 72, right: 72, top, bottom: 200, display: "flex", flexDirection: "column" }}>
    {title ? <div style={{ marginBottom: 40 }}>{title}</div> : null}
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
  </div>
);

// ── slides ───────────────────────────────────────────────────────────────────
// The cover's picture is a "clipping": a halftoned crop of the real source (a page, a post), on
// a slip of lighter paper, taped down at an angle and running off the right edge into slide 2.
const Clipping: React.FC<{ src: string; caption?: string; aspect?: number }> = ({ src, caption, aspect = 4.8 }) => {
  const ink = useInk();
  // the crop keeps its shape: a wide headline strip stays a strip, a tall screenshot gets taller
  const h = Math.round(Math.max(150, Math.min(380, 1010 / aspect)));
  return (
    <div style={{ position: "relative", marginTop: 54, marginRight: -130, rotate: "-2deg" }}>
      <div style={{ background: "#FBF8F0", padding: "26px 28px 20px", boxShadow: "0 2px 0 rgba(60,40,20,0.08)" }}>
        <div style={{ position: "relative", height: h + 10 }}>
          <Halftone src={src} ink={ink.b} w={1010} h={h} cell={6} angle={15} contrast={1.5} />
        </div>
        {caption ? <InkLayer color={ink.b} style={{ ...T.mono(18), marginTop: 14 }}>{caption}</InkLayer> : null}
      </div>
      {/* tape */}
      <div style={{ position: "absolute", left: 60, top: -22, width: 150, height: 44, background: ink.a, opacity: 0.55, mixBlendMode: "multiply", rotate: "4deg" }} />
      <div style={{ position: "absolute", left: 640, top: -18, width: 130, height: 40, background: ink.a, opacity: 0.5, mixBlendMode: "multiply", rotate: "-3deg" }} />
    </div>
  );
};

const Cover: React.FC<{ s: Extract<Slide, { type: "cover" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <>
      <div style={{ position: "absolute", left: 72, right: 72, top: 176, bottom: 200, display: "flex", flexDirection: "column" }}>
        <InkLayer color={ink.b} style={{ ...T.mono(26), marginBottom: 28 }}>
          <span style={{ background: ink.b, color: PAPER, padding: "6px 14px" }}>{s.kicker}</span>
        </InkLayer>
        <Headline text={s.headline} size={s.headline.length > 34 ? 156 : 186} />
        <InkLayer color={ink.b} reg={[2, -1]} style={{ ...T.deck(52), marginTop: 34, maxWidth: 900 }}>
          {s.deck}
        </InkLayer>
        {s.image ? <Clipping src={s.image} caption={s.imageCaption} aspect={s.imageAspect} /> : null}
      </div>
      <InkLayer color={ink.a} style={{ position: "absolute", right: 30, top: 560, ...T.mono(26), writingMode: "vertical-rl" }}>swipe →</InkLayer>
    </>
  );
};

const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 128 }) => {
  const ink = useInk();
  return <InkLayer color={ink.b} style={{ ...T.head(size) }}>{children}</InkLayer>;
};

const Points: React.FC<{ s: Extract<Slide, { type: "points" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <Body title={<Title>{s.title}</Title>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 52 }}>
        {s.points.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 34, alignItems: "flex-start" }}>
            <InkLayer color={ink.a} style={{ ...T.head(150), width: 104, flex: "none", marginTop: -10 }}>{i + 1}</InkLayer>
            <InkLayer color={ink.b} style={{ ...T.body(52), paddingTop: 6 }}>{p}</InkLayer>
          </div>
        ))}
      </div>
    </Body>
  );
};

// flows drawn as stacked columns (uses the slide's height instead of one cramped row)
const Diagram: React.FC<{ s: Extract<Slide, { type: "diagram" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <Body title={<Title size={118}>{s.title}</Title>}>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {s.flows.map((f, i) => {
          const c = f.highlight ? ink.a : ink.b;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <InkLayer color={c} style={{ ...T.mono(26), marginBottom: 18, minHeight: 64 }}>{f.label}</InkLayer>
              {f.steps.map((st, j) => (
                <React.Fragment key={j}>
                  <InkLayer color={c} style={{ border: `6px solid ${c}`, padding: "12px 18px", textAlign: "center", ...T.sub(40), background: f.highlight && j === 1 ? `${c}2A` : "transparent" }}>{st}</InkLayer>
                  {j < f.steps.length - 1 ? <InkLayer color={c} style={{ ...T.head(44), textAlign: "center", lineHeight: 1.05 }}>↓</InkLayer> : null}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
      {s.note ? <InkLayer color={ink.b} style={{ ...T.deck(42), marginTop: 40 }}>{s.note}</InkLayer> : null}
    </Body>
  );
};

const Stat: React.FC<{ s: Extract<Slide, { type: "stat" }> }> = ({ s }) => {
  const ink = useInk();
  const size = s.value.length > 6 ? 270 : 380;
  return (
    <Body title={<InkLayer color={ink.b} style={{ ...T.mono(30) }}>{s.label}</InkLayer>}>
      <div style={{ position: "relative" }}>
        <InkLayer color={ink.b} reg={[6, 5]} style={{ ...T.head(size), position: "absolute", inset: 0 }}>{s.value}</InkLayer>
        <InkLayer color={ink.a} style={{ ...T.head(size) }}>{s.value}</InkLayer>
      </div>
      {s.sub ? <InkLayer color={ink.b} style={{ ...T.body(54), marginTop: 40 }}>{s.sub}</InkLayer> : null}
    </Body>
  );
};

const Split: React.FC<{ s: Extract<Slide, { type: "split" }> }> = ({ s }) => {
  const ink = useInk();
  const col = (side: { label: string; text: string }, c: string) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
      <InkLayer color={c} style={{ ...T.sub(60), border: `7px solid ${c}`, padding: "12px 18px", alignSelf: "flex-start", rotate: c === ink.a ? "-2deg" : "1.5deg" }}>{side.label}</InkLayer>
      <InkLayer color={ink.b} style={{ ...T.body(48) }}>{side.text}</InkLayer>
    </div>
  );
  return (
    <Body title={<Title>{s.title}</Title>}>
      <div style={{ display: "flex", gap: 46 }}>
        {col(s.left, ink.b)}
        <div style={{ width: 5, background: ink.b, mixBlendMode: "multiply" }} />
        {col(s.right, ink.a)}
      </div>
    </Body>
  );
};

const Quote: React.FC<{ s: Extract<Slide, { type: "quote" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <Body>
      <InkLayer color={ink.a} style={{ ...T.head(360), height: 210, marginBottom: 6 }}>“</InkLayer>
      <InkLayer color={ink.b} style={{ ...T.deck(s.text.length > 140 ? 66 : 82) }}>{s.text}</InkLayer>
      <InkLayer color={ink.a} style={{ ...T.mono(28), marginTop: 46 }}>— {s.who}</InkLayer>
    </Body>
  );
};

const Takeaways: React.FC<{ s: Extract<Slide, { type: "takeaways" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <Body title={<Title>{s.title}</Title>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 46 }}>
        {s.items.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
            <InkLayer color={ink.a} style={{ width: 62, height: 62, border: `7px solid ${ink.a}`, flex: "none", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", ...T.head(58) }}>✓</InkLayer>
            <InkLayer color={ink.b} style={{ ...T.body(52) }}>{t}</InkLayer>
          </div>
        ))}
      </div>
    </Body>
  );
};

const Cta: React.FC<{ s: Extract<Slide, { type: "cta" }> }> = ({ s }) => {
  const ink = useInk();
  return (
    <Body>
      {s.avatar ? (
        <div style={{ width: 280, height: 280, borderRadius: "50%", overflow: "hidden", position: "relative", marginBottom: 44 }}>
          <Halftone src={s.avatar} ink={ink.b} w={280} h={280} cell={7} angle={30} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `7px solid ${ink.a}`, mixBlendMode: "multiply" }} />
        </div>
      ) : null}
      <Headline text={`Follow *${s.handle}*`} size={s.handle.length > 16 ? 108 : 128} />
      <InkLayer color={ink.b} style={{ ...T.deck(54), marginTop: 34, maxWidth: 900 }}>{s.line}</InkLayer>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 60 }}>
        <InkLayer color={ink.b} style={{ ...T.sub(60) }}>
          comment <span style={{ background: ink.a, color: PAPER, padding: "0 12px", mixBlendMode: "multiply" }}>{s.keyword}</span> → the full story in your DMs
        </InkLayer>
        <InkLayer color={ink.b} style={{ ...T.mono(28) }}>or tap the link in bio</InkLayer>
      </div>
    </Body>
  );
};

// the wire: one line along the bottom of the whole strip, a station per slide
const Wire: React.FC<{ n: number; labels: string[] }> = ({ n, labels }) => {
  const ink = useInk();
  const y = SLIDE_H - 112;
  return (
    <svg width={n * SLIDE_W} height={SLIDE_H} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}>
      <line x1={72} x2={n * SLIDE_W - 72} y1={y} y2={y} stroke={ink.b} strokeWidth={6} />
      {Array.from({ length: n }, (_, i) => {
        const x = i * SLIDE_W + 72;
        return (
          <g key={i}>
            <circle cx={x + 16} cy={y} r={16} fill={i === 0 ? ink.a : PAPER} stroke={ink.b} strokeWidth={6} />
            <text x={x + 48} y={y + 52} fill={ink.b} style={{ ...T.mono(22) } as any}>{labels[i] ?? ""}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const Dispatch: React.FC<DispatchProps> = ({ issue, date, inks, station, slides }) => {
  const ink = INK_PAIRS[inks ?? Object.keys(INK_PAIRS)[issue % Object.keys(INK_PAIRS).length]] ?? INK_PAIRS.pinkblue;
  const n = slides.length;
  const labels = station ?? slides.map((s) => s.type);
  return (
    <Ctx.Provider value={ink}>
      <AbsoluteFill style={{ width: n * SLIDE_W, height: SLIDE_H, overflow: "hidden" }}>
        <Paper w={n * SLIDE_W} />
        <Wire n={n} labels={labels} />
        {slides.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: i * SLIDE_W, top: 0, width: SLIDE_W, height: SLIDE_H }}>
            <Masthead issue={issue} date={date} n={i + 1} total={n} />
            {s.type === "cover" ? <Cover s={s} /> : null}
            {s.type === "points" ? <Points s={s} /> : null}
            {s.type === "diagram" ? <Diagram s={s} /> : null}
            {s.type === "stat" ? <Stat s={s} /> : null}
            {s.type === "split" ? <Split s={s} /> : null}
            {s.type === "quote" ? <Quote s={s} /> : null}
            {s.type === "takeaways" ? <Takeaways s={s} /> : null}
            {s.type === "cta" ? <Cta s={s} /> : null}
          </div>
        ))}
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
