import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./tokens";
import type { Word } from "../types";
import { NickCaption } from "./Caption";
import {
  SceneCodeIntro,
  SceneTitle,
  SceneVercel,
  SceneFileView,
  SceneSkillList,
  SceneTerminal,
  SceneLeaderboard,
  SceneComposer,
  SceneFace,
} from "./scenes";

export const NICK_TOTAL = 900; // 30s @ 30fps

// evenly distribute a script across the whole reel as word-level captions
function mkWordsEven(script: string, totalMs: number, startMs = 200): Word[] {
  const tokens = script.split(/\s+/).filter(Boolean);
  const span = (totalMs - startMs) / tokens.length;
  return tokens.map((text, i) => ({
    text,
    startMs: Math.round(startMs + i * span),
    endMs: Math.round(startMs + (i + 1) * span - 30),
  }));
}

const SCRIPT =
  "if you're using claude code you're probably missing the one skill that changes everything. " +
  "so someone from vercel built find-skills. it reads what you're working on and finds the exact skills you need. " +
  "like find me skills for mobile app design. and it pulls the top ones actually trusted by everyone. " +
  "over seven hundred thousand installs or whatever. then it installs them with one command. " +
  "and I'll be honest it's kind of magic.";

const WORDS = mkWordsEven(SCRIPT, (NICK_TOTAL / 30) * 1000);

export const NickReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Series>
        <Series.Sequence durationInFrames={78}><SceneCodeIntro /></Series.Sequence>
        <Series.Sequence durationInFrames={96}><SceneTitle /></Series.Sequence>
        <Series.Sequence durationInFrames={54}><SceneVercel /></Series.Sequence>
        <Series.Sequence durationInFrames={84}><SceneFileView /></Series.Sequence>
        <Series.Sequence durationInFrames={120}><SceneSkillList /></Series.Sequence>
        <Series.Sequence durationInFrames={108}><SceneTerminal /></Series.Sequence>
        <Series.Sequence durationInFrames={132}><SceneLeaderboard /></Series.Sequence>
        <Series.Sequence durationInFrames={108}><SceneComposer /></Series.Sequence>
        <Series.Sequence durationInFrames={120}><SceneFace /></Series.Sequence>
      </Series>

      <NickCaption words={WORDS} timeMs={timeMs} />
    </AbsoluteFill>
  );
};
