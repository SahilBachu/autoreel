import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { F2 } from "../../auto/theme";
import { bedCurve } from "../../auto/bed";
import { Backdrop, Captions, Counter, emphasise, Note, prog, timeLines, X } from "../kit";
import { PhoneShot } from "./Phone";
import { StackShot } from "./Stack";
import { HingeShot } from "./Hinge";
import { lines, words } from "./data";

// "Why the iPhone Duo is already cracking" — the first faceless explainer. Every scene is
// timed off the ElevenLabs word timings, so the picture lands on the words.

export const DUO_FRAMES = Math.ceil((words[words.length - 1].endMs / 1000) * 30) + 40;

const XF = 8; // crossfade frames between shots

const Fade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const op = Math.min(interpolate(f, [0, XF], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [len - XF, len], [1, 0], { extrapolateLeft: "clamp" }));
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

// the share sheet at the end: the "send this to a friend" beat, acted out
const ShareSheet: React.FC<{ typeAt: number; sendAt: number }> = ({ typeAt, sendAt }) => {
  const f = useCurrentFrame();
  const inP = prog(f, typeAt - 18, typeAt);
  const msg = "you pre-ordered one, right?";
  const typed = msg.slice(0, Math.round(msg.length * prog(f, typeAt, sendAt - 4, (t) => t)));
  const tap = prog(f, sendAt, sendAt + 6) * (1 - prog(f, sendAt + 6, sendAt + 14));
  const sent = prog(f, sendAt + 6, sendAt + 16);
  const people = [
    { n: "Sam", c: "#5B8DEF" },
    { n: "Priya", c: "#E9748B" },
    { n: "Leo", c: "#57B98A" },
    { n: "Ana", c: "#D9A441" },
  ];
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1190, opacity: inP, translate: `0 ${(1 - inP) * 60}px`, background: "#1C1D22", borderRadius: 36, padding: "34px 36px 36px", border: "1px solid rgba(255,255,255,0.08)", fontFamily: F2.sans }}>
      <div style={{ width: 90, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "-14px auto 28px" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {people.map((p, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: 180 }}>
            <div style={{ position: "relative", width: 120, height: 120, borderRadius: "50%", background: p.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, fontWeight: 700, color: "#fff" }}>
              {p.n[0]}
              {i === 0 ? (
                <div style={{ position: "absolute", right: -4, bottom: -4, width: 44, height: 44, borderRadius: "50%", background: "#0095F6", border: "5px solid #1C1D22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", opacity: inP }}>✓</div>
              ) : null}
            </div>
            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{p.n}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 34, background: "#2A2B31", borderRadius: 22, padding: "24px 26px", fontSize: 36, color: typed ? "#fff" : "rgba(255,255,255,0.4)", minHeight: 44 }}>
        {typed || "Write a message…"}
        {f % 30 < 16 && sent < 1 ? <span style={{ color: "#0095F6" }}>|</span> : null}
      </div>
      <div style={{ marginTop: 26, height: 96, borderRadius: 22, background: sent > 0 ? "#2A2B31" : "#0095F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700, color: "#fff", scale: String(1 - 0.05 * tap) }}>
        {sent > 0.5 ? "Sent" : "Send"}
      </div>
    </div>
  );
};

export const DuoExplainer: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const F = (ms: number) => Math.round((ms / 1000) * fps);
  const T = useMemo(() => timeLines(lines, words), []);
  const W = useMemo(() => emphasise(lines, words), []);
  const bed = useMemo(() => bedCurve(words, fps, durationInFrames), [fps, durationInFrames]);
  const L = (s: string) => T.find((t) => t.scene === s)!;
  // when a word is said: the nth word in that line starting with `pre`
  const at = (scene: string, pre: string, nth = 0) => {
    const t = L(scene);
    let k = 0;
    for (let i = t.firstWord; i < t.firstWord + t.words; i++) {
      if (words[i].text.toLowerCase().replace(/[^a-z0-9-]/g, "").startsWith(pre) && k++ === nth) return F(words[i].startMs);
    }
    return F(t.startMs);
  };

  const cut1 = F(L("layers").startMs) - 4;
  const cut2 = F(L("hinge").startMs) - 4;
  const cut3 = F(L("end").startMs) - 4;
  const crackAt = at("hook", "cracking");
  const fold = F(L("inside").startMs);

  const phoneLen = cut1 + XF;
  const stackLen = cut2 - cut1 + XF;
  const hingeLen = cut3 - cut2 + XF;
  const endLen = durationInFrames - cut3;

  // counter: suspects found
  const sus = frame >= F(L("s3").startMs) ? 3 : frame >= F(L("s2").startMs) ? 2 : frame >= F(L("s1").startMs) ? 1 : 0;
  const susOp = prog(frame, at("hinge", "suspects"), at("hinge", "suspects") + 10) * (1 - prog(frame, cut3 - 10, cut3));
  const noteOp = prog(frame, cut1, cut1 + 12) * (1 - prog(frame, cut3 - 10, cut3));

  const whoosh = (f: number, file: string) => (
    <Sequence from={Math.max(0, f - 8)} durationInFrames={30} layout="none">
      <Audio src={staticFile(file)} volume={0.36} />
    </Sequence>
  );
  const sfx = (f: number, file: string, v = 0.4) => (
    <Sequence from={Math.max(0, f)} durationInFrames={45} layout="none">
      <Audio src={staticFile(file)} volume={v} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ background: X.bg }}>
      <Backdrop glow={frame > cut2 && frame < cut3 ? "rgba(70,140,255,0.16)" : "rgba(120,140,190,0.14)"} />

      <Sequence from={0} durationInFrames={phoneLen}>
        <Fade len={phoneLen}>
          <PhoneShot
            keys={[
              { f: 0, pos: [11, 3.6, 29], look: [-0.9, 1.4, 0], fov: 30 },
              { f: crackAt, pos: [9.2, 2.8, 25.5], look: [-0.6, 1.2, 0], fov: 30 },
              { f: fold, pos: [7.4, 2.2, 22], look: [-0.4, 1.0, 0], fov: 30 },
              { f: phoneLen, pos: [6.4, 1.8, 18.5], look: [-0.2, 0.8, 0], fov: 30 },
            ]}
            angleAt={(f) => 150 - 20 * prog(f, 0, fold, (t) => t) - 12 * prog(f, fold, phoneLen)}
            crackAt={(f) => prog(f, crackAt, crackAt + 12)}
            shakeAt={(f) => (f >= crackAt && f < crackAt + 9 ? 1 - (f - crackAt) / 9 : 0)}
          />
        </Fade>
      </Sequence>

      <Sequence from={cut1} durationInFrames={stackLen}>
        <Fade len={stackLen}>
          <StackShot
            m={{
              explode: at("layers", "ten") - cut1,
              names: [at("layers", "cover"), at("layers", "glass", 1), at("layers", "display"), at("layers", "glass", 2), at("layers", "titanium")].map((x) => x - cut1),
              bend: F(L("bend").startMs) - cut1,
              farther: at("bend", "farther") - cut1,
              slide: at("bend", "slide") - cut1,
              end: stackLen,
            }}
          />
        </Fade>
      </Sequence>

      <Sequence from={cut2} durationInFrames={hingeLen}>
        <Fade len={hingeLen}>
          <HingeShot
            m={{
              suspects: at("hinge", "suspects") - cut2,
              s1: F(L("s1").startMs) - cut2,
              s2: F(L("s2").startMs) - cut2,
              s3: F(L("s3").startMs) - cut2,
              unknown: F(L("unknown").startMs) - cut2,
              connection: at("unknown", "connection") - cut2,
              end: hingeLen,
            }}
          />
        </Fade>
      </Sequence>

      <Sequence from={cut3} durationInFrames={endLen}>
        <Fade len={endLen + XF}>
          <PhoneShot
            keys={[
              { f: 0, pos: [10, 4, 41], look: [-0.9, -2.5, 0], fov: 30 },
              { f: endLen, pos: [9.2, 3.6, 39], look: [-0.9, -2.6, 0], fov: 30 },
            ]}
            angleAt={(f) => 150 - 110 * prog(f, 10, endLen - 20, (t) => t * t * (3 - 2 * t))}
          />
          <ShareSheet typeAt={at("end", "send") - cut3} sendAt={at("end", "pre-ordered") - cut3} />
        </Fade>
      </Sequence>

      <Captions words={W} top={300} />
      <Counter label="SUSPECTS" value={sus} total={3} op={susOp} />
      <Note text="Magnified illustration · not to scale" op={noteOp} />
      <Note text={frame > cut2 ? "Hinge after iFixit's CT-scan rebuild" : "Layers as Apple describes them"} side="right" op={noteOp} />
      <Note text="Sources: iFixit teardown · Apple · MacRumors" op={prog(frame, cut3 + 10, cut3 + 22)} bottom={70} />

      <Audio src={staticFile("explainer/duo/voice-norm.mp3")} />
      <Audio src={staticFile("music/dark-kodama-night.mp3")} volume={(fr) => 0.075 * (bed[Math.min(bed.length - 1, Math.max(0, fr))] ?? 1)} />
      {whoosh(cut1, "sfx/v4/whoosh-sweep-a.wav")}
      {whoosh(cut2, "sfx/v4/whoosh-sweep-b.wav")}
      {whoosh(cut3, "sfx/v4/whoosh-sweep-a.wav")}
      {sfx(crackAt, "sfx/v4/bass-hit.wav", 0.5)}
      {sfx(F(L("s1").startMs), "sfx/v4/click-select.wav")}
      {sfx(F(L("s2").startMs), "sfx/v4/click-select.wav")}
      {sfx(F(L("s3").startMs), "sfx/v4/click-select.wav")}
      {sfx(at("end", "send"), "sfx/v4/typing.wav", 0.3)}
      {sfx(at("end", "pre-ordered") + 6, "sfx/v4/pop.wav", 0.4)}
    </AbsoluteFill>
  );
};
