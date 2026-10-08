import React from "react";
import { Freeze, OffthreadVideo, staticFile } from "remotion";
import { useAccent } from "./theme";
import { Scene } from "./fx";
import { rise, useT } from "./kit";

// ── ClawdCard — the Clawd experiment (bot/src/lib/clawd.ts). A hand-painted cartoon shot of
// Clawd (rendered by the ClaudeAnimationBase kit in clawd/, square, 24 fps) on a paper card that
// floats over him like a sticker: it rises in tilted, settles, and the cartoon plays from the
// first frame (the shot paints itself in while the card arrives). If the camera lingers past the
// end of the clip, the last frame holds (shots end on a held pose by design).

const asset = (s: string) => (s.startsWith("http") ? s : staticFile(s));

export const ClawdCard: React.FC<{ src: string; durMs?: number }> = ({ src, durMs }) => {
  const a = useAccent();
  const { f, fps, sp } = useT();
  const e = sp(0, "bouncy");
  const last = durMs ? Math.max(0, Math.floor((durMs / 1000) * fps) - 2) : Infinity;
  const tilt = (1 - e) * -5 - 1.2; // lands with a small sticker tilt
  const video = <OffthreadVideo src={asset(src)} muted style={{ width: "100%", height: "100%", display: "block" }} />;
  return (
    <Scene>
      <div style={{ ...rise(e, 60, 0.9), transform: `${rise(e, 60, 0.9).transform} rotate(${tilt}deg)` }}>
        <div
          style={{
            width: 680,
            height: 680,
            borderRadius: 34,
            overflow: "hidden",
            background: "#F3EBDC",
            border: "10px solid #FFF5E2",
            boxShadow: `0 50px 120px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.12), 0 0 110px -40px ${a.glow}`,
          }}
        >
          {f >= last ? <Freeze frame={last}>{video}</Freeze> : video}
        </div>
      </div>
    </Scene>
  );
};
