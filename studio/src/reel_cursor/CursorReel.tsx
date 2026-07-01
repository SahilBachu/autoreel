import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Word } from "../types";
import { S, SF } from "./skin";
import { DotGrid, CursorLogo, TitleSerif, AgentGrid, SpeedBars, Statement, useEnter } from "./parts";
import { Window, FacePlaceholder } from "../nick/components";
import { NickCaption } from "../nick/Caption";

export const CURSOR_TOTAL = 820;

const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const e = useEnter(0);
  return (
    <div style={{ fontFamily: SF.body, fontWeight: 700, fontSize: 26, letterSpacing: "0.22em", textTransform: "uppercase", color: S.rust, opacity: e }}>
      {text}
    </div>
  );
};

// 1. Cold-open logo cutaway + face
const SceneHook: React.FC = () => {
  const e = useEnter(0, { damping: 16, stiffness: 130, mass: 1 });
  return (
    <AbsoluteFill style={{ flexDirection: "column", background: S.black }}>
      <div style={{ height: "56%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [26, 0])}px)` }}>
          <CursorLogo onDark />
        </div>
      </div>
      <div style={{ height: "44%", position: "relative" }}>
        <FacePlaceholder />
      </div>
    </AbsoluteFill>
  );
};

// 2. Title
const SceneTitle: React.FC = () => {
  const sub = useEnter(10);
  return (
    <AbsoluteFill>
      <DotGrid />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
        <TitleSerif lines={[{ text: "Cursor" }, { text: "2.0", boxed: true }]} />
        <div style={{ fontFamily: SF.body, fontWeight: 500, fontSize: 42, color: S.inkSoft, opacity: sub }}>
          the everything-all-at-once update
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3. Parallel agents
const SceneAgents: React.FC = () => (
  <AbsoluteFill>
    <DotGrid />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 70, gap: 40 }}>
      <Kicker text="8 agents · in parallel" />
      <AgentGrid />
    </AbsoluteFill>
  </AbsoluteFill>
);

// 4. Dry aside
const SceneStatement: React.FC = () => (
  <AbsoluteFill>
    <DotGrid />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <Statement pre="a manager who does" boxed="zero work" post="— aspirational." />
    </AbsoluteFill>
  </AbsoluteFill>
);

// 5. Speed bars
const SceneSpeed: React.FC = () => (
  <AbsoluteFill>
    <DotGrid />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, gap: 46 }}>
      <Kicker text="Composer — their own model" />
      <SpeedBars />
    </AbsoluteFill>
  </AbsoluteFill>
);

// 6. Terminal on terracotta
const SceneTerminal: React.FC = () => {
  const e = useEnter(0, { damping: 20, stiffness: 130, mass: 1 });
  return (
    <AbsoluteFill style={{ background: S.orangeBg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)` }}>
        <Window title="Composer" variant="win" width={860} height={880}>
          <div style={{ padding: 40, fontFamily: SF.mono, fontSize: 28, lineHeight: 1.7, color: S.whiteDim }}>
            <div style={{ color: S.white }}>cursor composer · fast</div>
            <div style={{ marginBottom: 26 }}>~/pickle-coach</div>
            <div style={{ color: S.white }}>&gt; refactor this into Next.js, run tests</div>
            <div style={{ marginTop: 26, color: S.green }}>● spawned 8 agents</div>
            <div style={{ marginLeft: 28 }}>refactor-auth ✓ · write-tests ✓ · fix-types …</div>
            <div style={{ marginTop: 24, color: S.rust }}>done in 41s · 4× faster</div>
          </div>
        </Window>
      </div>
    </AbsoluteFill>
  );
};

// 7. Outro face
const SceneOutro: React.FC = () => (
  <AbsoluteFill>
    <FacePlaceholder />
  </AbsoluteFill>
);

function mkWordsEven(script: string, totalMs: number, startMs = 200): Word[] {
  const t = script.split(/\s+/).filter(Boolean);
  const span = (totalMs - startMs) / t.length;
  return t.map((text, i) => ({ text, startMs: Math.round(startMs + i * span), endMs: Math.round(startMs + (i + 1) * span - 30) }));
}

const SCRIPT =
  "Cursor just dropped 2.0 and it's kind of unhinged. " +
  "you can now run eight agents at once, all in parallel, each in their own little world. " +
  "it's giving middle-manager who does zero actual work and honestly aspirational. " +
  "they even shipped their own model, Composer, supposedly four times faster. " +
  "anyway i used it for an hour and crawled back to Claude Code. but we move.";

const WORDS = mkWordsEven(SCRIPT, (CURSOR_TOTAL / 30) * 1000);

export const CursorReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  return (
    <AbsoluteFill style={{ background: S.black }}>
      <Series>
        <Series.Sequence durationInFrames={70}><SceneHook /></Series.Sequence>
        <Series.Sequence durationInFrames={90}><SceneTitle /></Series.Sequence>
        <Series.Sequence durationInFrames={170}><SceneAgents /></Series.Sequence>
        <Series.Sequence durationInFrames={90}><SceneStatement /></Series.Sequence>
        <Series.Sequence durationInFrames={140}><SceneSpeed /></Series.Sequence>
        <Series.Sequence durationInFrames={110}><SceneTerminal /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><SceneOutro /></Series.Sequence>
      </Series>
      <NickCaption words={WORDS} timeMs={timeMs} />
    </AbsoluteFill>
  );
};
