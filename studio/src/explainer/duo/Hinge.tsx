import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Edges, Line, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { camAt, easeInOut, Glow, Leader, project, prog, X, type CamKey } from "../kit";

// The hinge, as iFixit rebuilt it from CT scans (simplified): a central support bar with a gap
// where the display's flex cable crosses, flat plates either side, curved rails at the ends
// that guide the fold. Drawn as an x-ray: faint blue volumes with bright edges.
const GAP: [number, number] = [-0.95, -0.35]; // the cable gap in the support (y range)

const Xray: React.FC<{ args: [number, number, number]; position: [number, number, number]; hot?: number; color?: string }> = ({ args, position, hot = 0, color = X.xray }) => (
  <mesh position={position}>
    <boxGeometry args={args} />
    <meshBasicMaterial color={hot > 0 ? X.gold : color} transparent opacity={0.13 + 0.25 * hot} depthWrite={false} />
    <Edges color={hot > 0 ? X.goldHot : color} threshold={15} />
  </mesh>
);

const Rail: React.FC<{ y: number; dz: number; hot: number }> = ({ y, dz, hot }) => (
  <mesh position={[0, y, -0.05 + dz]} rotation={[-Math.PI / 2, 0, 0]}>
    <torusGeometry args={[0.85, 0.07, 10, 48, Math.PI]} />
    <meshBasicMaterial color={hot > 0 ? X.gold : X.xray} transparent opacity={0.35 + 0.4 * hot} depthWrite={false} />
  </mesh>
);

export type HingeMarks = { suspects: number; s1: number; s2: number; s3: number; unknown: number; connection: number; end: number };

export const HingeShot: React.FC<{ m: HingeMarks }> = ({ m }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const keys: CamKey[] = [
    { f: 0, pos: [8.2, -11.5, 13], look: [0, 1.2, 0], fov: 34 },
    { f: m.suspects + 10, pos: [7.4, -10.4, 11.8], look: [0, 1.2, 0], fov: 34 },
    { f: m.s1 + 2, pos: [7.3, -10.3, 11.7], look: [0, 1.2, 0], fov: 34 },
    { f: m.s1 + 34, pos: [2.6, -4.6, 4.4], look: [0.1, 0.1, 0.05], fov: 34 },
    { f: m.s2, pos: [2.5, -4.5, 4.3], look: [0.1, 0.1, 0.05], fov: 34 },
    { f: m.s2 + 34, pos: [4.4, 8.4, 4.8], look: [0.6, 3.1, 0.3], fov: 34 },
    { f: m.s3, pos: [4.3, 8.3, 4.7], look: [0.6, 3.1, 0.3], fov: 34 },
    { f: m.s3 + 34, pos: [-4.2, -1.8, 4.2], look: [-0.9, 1.2, 0.3], fov: 34 },
    { f: m.unknown, pos: [-4.1, -1.8, 4.1], look: [-0.9, 1.2, 0.3], fov: 34 },
    { f: m.unknown + 36, pos: [7.6, -10.6, 12.4], look: [0, 1.2, 0.2], fov: 34 },
    { f: m.end, pos: [7.4, -10.4, 12.2], look: [0, 1.2, 0.2], fov: 34 },
  ];
  const cam = camAt(keys, f, 1);

  // the CT sweep at the start
  const scanY = -4.2 + 8.4 * prog(f, 4, 58, easeInOut);
  const scanOn = f < 62;
  // suspect 1: stress at the gap, pulsing with each (imagined) fold
  const s1 = prog(f, m.s1 + 20, m.s1 + 30) * (1 - prog(f, m.unknown + 30, m.unknown + 40));
  const pulse = 0.55 + 0.45 * Math.sin(Math.max(0, f - m.s1) / 5);
  // suspect 2: the rails lift toward the screen
  const s2 = prog(f, m.s2 + 30, m.s2 + 50, easeInOut);
  const dz = 0.32 * s2 * (1 - prog(f, m.unknown + 20, m.unknown + 40));
  const screenOn = prog(f, m.s2 + 20, m.s2 + 34) * (1 - prog(f, m.unknown + 20, m.unknown + 34));
  const damage = prog(f, m.s2 + 58, m.s2 + 66);
  // suspect 3: dust, pressed by the screen every close
  const s3 = prog(f, m.s3 + 26, m.s3 + 36) * (1 - prog(f, m.unknown + 30, m.unknown + 40));
  const press = f > m.s3 + 40 && f < m.unknown ? Math.max(0, Math.sin((f - m.s3 - 40) / 9)) : 0;
  const screenZ = 0.78 - 0.4 * press;
  // the "maybe it's just a connection" beat: the cable flickers
  const conn = f > m.connection ? (Math.floor((f - m.connection) / 3) % 3 === 0 ? 0.15 : 1) : 0;

  const label = (p: [number, number, number], tx: number, dy: number, text: string, op: number, color: string = X.xray, sub?: string) => {
    const s = project(p, cam);
    return <Leader x={s.x} y={s.y} tx={tx} ty={s.y + dy} text={text} sub={sub} op={op} color={color} align={tx < s.x ? "right" : "left"} />;
  };
  const introOp = prog(f, 60, 72) * (1 - prog(f, m.s1, m.s1 + 10));

  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
        <PerspectiveCamera makeDefault position={cam.position} rotation={cam.rotation} fov={cam.fov} near={0.1} far={200} />
        <ambientLight intensity={0.6} />
        {/* central support, split by the cable gap */}
        <Xray args={[0.5, 3.5 - GAP[1], 0.3]} position={[0, (3.5 + GAP[1]) / 2, 0]} hot={s1 * 0.6} />
        <Xray args={[0.5, GAP[0] + 3.5, 0.3]} position={[0, (GAP[0] - 3.5) / 2, 0]} hot={s1 * 0.6} />
        {/* flat plates */}
        <Xray args={[1.7, 7, 0.08]} position={[-1.15, 0, 0.12]} />
        <Xray args={[1.7, 7, 0.08]} position={[1.15, 0, 0.12]} />
        {/* curved rails */}
        <Rail y={2.6} dz={dz} hot={s2} />
        <Rail y={-2.6} dz={dz * 0.4} hot={0} />
        {/* the display's flex cable crossing the gap */}
        <mesh position={[0, (GAP[0] + GAP[1]) / 2, 0.02]}>
          <boxGeometry args={[3.4, 0.34, 0.03]} />
          <meshBasicMaterial color={conn > 0 ? (conn > 0.5 ? X.danger : "#3a1a16") : "#e08a3c"} transparent opacity={0.85} />
        </mesh>
        {/* stress points where the edges meet */}
        {s1 > 0
          ? ([[0.25, GAP[1], 0.16], [-0.25, GAP[1], 0.16]] as [number, number, number][]).map((p, i) => <Glow key={i} position={p} size={0.45 + 0.3 * pulse} color={X.gold} opacity={0.85 * s1 * pulse} />)
          : null}
        {/* the screen above the hinge (suspects 2 + 3), with the crack */}
        {screenOn > 0 || s3 > 0 ? (
          <group position={[0, 0, screenZ]}>
            <mesh>
              <planeGeometry args={[4.2, 7.4]} />
              <meshBasicMaterial color="#b8d8ff" transparent opacity={0.08 * Math.max(screenOn, s3)} side={THREE.DoubleSide} depthWrite={false} />
              <Edges color="#b8d8ff" />
            </mesh>
            {screenOn > 0 ? (
              <Line points={[[0.8, 3.4, 0.01], [0.86, 2.9, 0.01], [0.78, 2.5, 0.01], [0.84, 2.0, 0.01], [0.8, 1.6, 0.01]]} color={damage > 0 ? X.danger : "#ffffff"} lineWidth={3} transparent opacity={screenOn} />
            ) : null}
          </group>
        ) : null}
        {/* rail-to-crack alignment */}
        {damage > 0 ? <Line points={[[0.8, 2.6, -0.05 + dz + 0.85], [0.8, 2.6, screenZ]]} color={X.danger} lineWidth={2} dashed dashSize={0.06} gapSize={0.05} transparent opacity={damage} /> : null}
        {/* the dust speck */}
        {s3 > 0 ? (
          <>
            <mesh position={[-0.9, 0.6, 0.26]}>
              <icosahedronGeometry args={[0.07, 0]} />
              <meshBasicMaterial color={X.goldHot} />
            </mesh>
            <Glow position={[-0.9, 0.6, 0.27]} size={0.4 + 1.2 * press} color={press > 0.8 ? "#ffffff" : X.gold} opacity={s3} />
          </>
        ) : null}
        {/* the CT scan plane */}
        {scanOn ? (
          <mesh position={[0, scanY, 0.1]}>
            <boxGeometry args={[4.4, 0.012, 0.9]} />
            <meshBasicMaterial color={X.xray} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ) : null}
        {scanOn ? <Glow position={[0, scanY, 0.1]} size={1.6} color={X.xray} opacity={0.35} /> : null}
      </ThreeCanvas>

      {label([0, 1.8, 0.15], 760, -60, "central support", introOp)}
      {label([1.6, -2.2, 0.16], 800, 80, "flat plate", introOp)}
      {label([-1.3, (GAP[0] + GAP[1]) / 2, 0.04], 200, 120, "display cable", introOp, "#f0a35c")}
      {label([0.25, GAP[1], 0.16], 780, -220, "cable gap", s1 * (1 - prog(f, m.s2, m.s2 + 10)), X.gold, "edges meet on one line")}
      {label([0.8, 2.6, -0.05 + dz], 300, 260, "curved rail", prog(f, m.s2 + 36, m.s2 + 46) * (1 - prog(f, m.s3, m.s3 + 10)), X.gold)}
      {label([0.8, 2.2, screenZ], 820, -200, "the crack", damage * (1 - prog(f, m.s3, m.s3 + 10)), X.danger)}
      {label([-0.9, 0.6, 0.26], 760, 200, "one speck of dust", s3 * (1 - prog(f, m.unknown, m.unknown + 10)), X.gold)}
      {label([0.6, (GAP[0] + GAP[1]) / 2, 0.04], 790, 220, "or just a bad connection?", prog(f, m.connection, m.connection + 10), X.danger)}
    </AbsoluteFill>
  );
};
