import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, F } from "./tokens";
import { Chip, LetterBadge, GreenCheck, Window, FacePlaceholder } from "./components";

const useEnter = (
  delay = 0,
  config: { damping: number; stiffness: number; mass: number } = {
    damping: 20,
    stiffness: 120,
    mass: 0.9,
  },
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

// ── 1. Split: code editor (top) + face (bottom) ──────────────────────────────
export const SceneCodeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = Math.floor(frame / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{ flexDirection: "column", background: C.black }}>
      <div style={{ height: "54%", padding: 54, fontFamily: F.mono, color: C.whiteDim }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
          {[C.rust, "#3a3a40", "#3a3a40"].map((c, i) => (
            <div key={i} style={{ width: i === 0 ? 120 : 90, height: 30, borderRadius: 8, background: c, opacity: i === 0 ? 1 : 0.5 }} />
          ))}
        </div>
        <div style={{ fontSize: 30, lineHeight: 2, color: "rgba(255,255,255,0.28)" }}>
          <div>import &#123; agent &#125; from "claude"</div>
          <div>const app = await agent.build(&#123;</div>
        </div>
        <div style={{ fontSize: 34, color: C.white, marginTop: 26 }}>
          Build an MVP for my food delivery
          <span style={{ opacity: cursor ? 1 : 0, color: C.rust }}>▋</span>
        </div>
      </div>
      <div style={{ height: "46%", position: "relative" }}>
        <FacePlaceholder />
      </div>
    </AbsoluteFill>
  );
};

// ── 2. Title card (cream) + face bottom ──────────────────────────────────────
export const SceneTitle: React.FC = () => {
  const e = useEnter(2);
  const chip = useEnter(12, { damping: 14, stiffness: 160, mass: 0.9 });
  return (
    <AbsoluteFill style={{ flexDirection: "column" }}>
      <div
        style={{
          height: "60%",
          background: C.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 70,
          gap: 44,
        }}
      >
        <div
          style={{
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.rust,
            opacity: e,
            transform: `translateY(${interpolate(e, [0, 1], [20, 0])}px)`,
          }}
        >
          #1 Claude Skill
        </div>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: 116,
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
            color: C.ink,
            textAlign: "center",
            opacity: e,
            transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px)`,
          }}
        >
          The One Skill
          <br />
          You&rsquo;re <span style={{ color: C.rust }}>Missing</span>
        </div>
        <div style={{ transform: `scale(${interpolate(chip, [0, 1], [0.8, 1])})`, opacity: chip }}>
          <Chip label="find-skills" />
        </div>
      </div>
      <div style={{ height: "40%", position: "relative" }}>
        <FacePlaceholder />
      </div>
    </AbsoluteFill>
  );
};

// ── 3. Vercel logo cutaway (black) ───────────────────────────────────────────
export const SceneVercel: React.FC = () => {
  const e = useEnter(0, { damping: 16, stiffness: 130, mass: 1 });
  return (
    <AbsoluteFill style={{ background: C.black, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "62px solid transparent",
            borderRight: "62px solid transparent",
            borderBottom: `108px solid ${C.white}`,
          }}
        />
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 128, color: C.white, letterSpacing: "-0.03em" }}>
          Vercel
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── 4. GitHub file view (dark) ───────────────────────────────────────────────
export const SceneFileView: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [0, -40], { extrapolateRight: "clamp" });
  const e = useEnter(0);
  return (
    <AbsoluteFill style={{ background: C.ghBg }}>
      <div style={{ padding: "80px 70px", fontFamily: F.body, opacity: e, transform: `translateY(${drift}px)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, color: C.ghMuted, marginBottom: 40 }}>
          skills / skills / find-skills / <span style={{ color: C.ghText }}>SKILL.md</span>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 80, color: C.ghText, marginBottom: 34 }}>
          Find Skills
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.55, color: C.ghText, marginBottom: 48 }}>
          This skill helps you{" "}
          <span style={{ background: "rgba(88,166,255,0.22)", borderRadius: 4, padding: "2px 6px" }}>
            discover and install skills from the open agent skills ecosystem.
          </span>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 52, color: C.ghText, marginBottom: 30 }}>
          When to Use This Skill
        </div>
        {[
          'Asks "how do I do X" where X might be a common task',
          'Says "find a skill for X" or "is there a skill for X"',
          "Wants to search for tools, templates, or workflows",
          "Mentions they wish they had help with a domain",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 20, fontSize: 38, color: C.ghText, marginBottom: 22 }}>
            <span style={{ color: C.ghMuted }}>•</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 5. Skill list (cream) ────────────────────────────────────────────────────
const skills = [
  { letter: "A", name: "app-ui-design" },
  { letter: "M", name: "make-interfaces-feel-better" },
  { letter: "F", name: "frontend-design" },
];
export const SceneSkillList: React.FC = () => {
  const head = useEnter(0);
  return (
    <AbsoluteFill style={{ background: C.cream, justifyContent: "center", alignItems: "center", padding: 70 }}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div
          style={{
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.rust,
            opacity: head,
          }}
        >
          Skills Needed For
        </div>
        <div style={{ opacity: head, transform: `translateY(${interpolate(head, [0, 1], [16, 0])}px)` }}>
          <Chip label="Mobile App Design" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: head, marginTop: 6 }}>
          <GreenCheck size={40} />
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, color: C.ink }}>3 Skills Found</span>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 22, marginTop: 14 }}>
          {skills.map((s, i) => (
            <Row key={s.letter} letter={s.letter} name={s.name} delay={12 + i * 8} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
const Row: React.FC<{ letter: string; name: string; delay: number }> = ({ letter, name, delay }) => {
  const e = useEnter(delay, { damping: 18, stiffness: 140, mass: 0.9 });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        background: C.creamCard,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 22,
        padding: "26px 30px",
        boxShadow: "0 16px 40px -22px rgba(32,29,26,0.4)",
        opacity: e,
        transform: `translateX(${interpolate(e, [0, 1], [40, 0])}px)`,
      }}
    >
      <LetterBadge letter={letter} />
      <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 44, color: C.ink }}>{name}</span>
      <div style={{ marginLeft: "auto" }}>
        <GreenCheck size={46} />
      </div>
    </div>
  );
};

// ── 6. Terminal on terracotta ────────────────────────────────────────────────
export const SceneTerminal: React.FC = () => {
  const e = useEnter(0, { damping: 20, stiffness: 130, mass: 1 });
  return (
    <AbsoluteFill style={{ background: C.orangeBg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)`, opacity: e }}>
        <Window title="Claude Code" variant="win" width={860} height={920}>
          <div style={{ padding: 40, fontFamily: F.mono, fontSize: 28, lineHeight: 1.7, color: C.whiteDim }}>
            <div style={{ color: C.white }}>Claude Code v2.1.195</div>
            <div>Opus 4.8 with medium effort</div>
            <div style={{ marginBottom: 30 }}>C:\Users\shubh</div>
            <div style={{ color: C.white }}>&gt; /find-skills find claude skills for mobile app design</div>
            <div style={{ marginTop: 28, color: C.green }}>● Search for mobile design skills.</div>
            <div style={{ marginLeft: 28 }}>Running 1 shell command…</div>
            <div style={{ marginLeft: 28, color: "rgba(255,255,255,0.5)" }}>$ npx skills find "mobile app design"</div>
            <div style={{ marginTop: 26, color: C.rust }}>Germinating… (18s · ↓ 128 tokens)</div>
          </div>
        </Window>
      </div>
    </AbsoluteFill>
  );
};

// ── 7. Skills leaderboard (dark site) ────────────────────────────────────────
const board = [
  { n: "find-skills", org: "vercel-labs/skills", v: "2.2M" },
  { n: "frontend-design", org: "anthropics/skills", v: "597.2K" },
  { n: "vercel-react-skills", org: "vercel-labs/skills", v: "506.8K" },
  { n: "agent-browser", org: "vercel-labs/agent-browser", v: "489.7K" },
  { n: "web-design-guidelines", org: "vercel-labs/agent-skills", v: "419.6K" },
];
export const SceneLeaderboard: React.FC = () => {
  const head = useEnter(0);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <div style={{ padding: "70px 60px", fontFamily: F.body }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, color: C.white, opacity: head, marginBottom: 50 }}>
          <span style={{ fontWeight: 700, fontSize: 34 }}>▲ / Skills</span>
          <span style={{ color: C.whiteDim, fontSize: 28 }}>Topics</span>
          <span style={{ color: C.whiteDim, fontSize: 28 }}>Official</span>
          <span style={{ color: C.whiteDim, fontSize: 28 }}>Audits</span>
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 26, letterSpacing: "0.18em", color: C.whiteDim, marginBottom: 26 }}>
          SKILLS LEADERBOARD
        </div>
        <div style={{ background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: 16, padding: "22px 26px", color: C.whiteDim, fontSize: 32, marginBottom: 30, fontFamily: F.mono }}>
          Search skills…
        </div>
        <div style={{ display: "flex", gap: 34, marginBottom: 34, fontSize: 28, fontWeight: 700 }}>
          <span style={{ color: C.white }}>All Time (702,057)</span>
          <span style={{ color: C.whiteDim, fontWeight: 500 }}>Trending (24h)</span>
          <span style={{ color: C.whiteDim, fontWeight: 500 }}>Hot</span>
        </div>
        {board.map((r, i) => (
          <BoardRow key={r.n} i={i} {...r} delay={8 + i * 6} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
const BoardRow: React.FC<{ i: number; n: string; org: string; v: string; delay: number }> = ({ i, n, org, v, delay }) => {
  const e = useEnter(delay);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 0", borderBottom: `1px solid ${C.darkBorder}`, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [20, 0])}px)` }}>
      <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, color: C.whiteDim, width: 40 }}>{i + 1}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 700, fontSize: 40, color: C.white }}>{n}</span>
        <span style={{ fontFamily: F.mono, fontSize: 26, color: C.whiteDim }}>{org}</span>
      </div>
      <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 34, color: C.white }}>✓ {v}</span>
    </div>
  );
};

// ── 8. Claude composer (cream) + face ────────────────────────────────────────
export const SceneComposer: React.FC = () => {
  const e = useEnter(0);
  return (
    <AbsoluteFill style={{ flexDirection: "column" }}>
      <div style={{ height: "58%", background: C.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 30 }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 40, color: C.rust, opacity: e }}>✳ Nick returns!</div>
        <div
          style={{
            width: "100%",
            maxWidth: 860,
            background: C.creamCard,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 26,
            padding: 34,
            boxShadow: "0 22px 50px -24px rgba(32,29,26,0.35)",
            opacity: e,
            transform: `translateY(${interpolate(e, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: F.mono, fontSize: 34, color: C.ink, lineHeight: 1.5 }}>
            npx skills add http://github.com/vercel-labs/skills --skill fin
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 40, color: C.inkSoft, fontFamily: F.body, fontWeight: 700, fontSize: 28 }}>
            <span style={{ color: C.ink }}>Opus 4.8</span>
            <span>Medium</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", opacity: e }}>
          {["Write", "Create", "Strategize", "Learn", "From Calendar"].map((t) => (
            <div key={t} style={{ border: `1px solid ${C.cardBorder}`, borderRadius: 999, padding: "12px 24px", fontFamily: F.body, fontWeight: 500, fontSize: 28, color: C.inkSoft, background: C.creamCard }}>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: "42%", position: "relative" }}>
        <FacePlaceholder />
      </div>
    </AbsoluteFill>
  );
};

// ── 9. Full face ─────────────────────────────────────────────────────────────
export const SceneFace: React.FC = () => (
  <AbsoluteFill>
    <FacePlaceholder />
  </AbsoluteFill>
);
