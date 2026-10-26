import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { camAt, easeInOut, Glow, Leader, project, prog, ribbonGeometry, X, type CamKey } from "../kit";
import { StudioLights } from "./Phone";

// Apple's 10-layer inner display (polymer cover, glass, the folding panel, glass, titanium plate,
// bonded by sliding adhesives), as an exploded stack that then bends into the fold.
type Mat = "cover" | "glue" | "glass" | "oled" | "film" | "titanium";
const LAYERS: { name?: string; t: number; mat: Mat }[] = [
  { name: "polymer cover", t: 0.06, mat: "cover" },
  { t: 0.025, mat: "glue" },
  { name: "glass", t: 0.07, mat: "glass" },
  { t: 0.025, mat: "glue" },
  { name: "the display", t: 0.08, mat: "oled" },
  { t: 0.025, mat: "glue" },
  { name: "more glass", t: 0.07, mat: "glass" },
  { t: 0.025, mat: "glue" },
  { t: 0.05, mat: "film" },
  { name: "titanium plate", t: 0.09, mat: "titanium" },
];
const LEN = 8, LEG = 3.6, WIDTH = 3.2, R0 = 0.35;

let oledTex: THREE.CanvasTexture | null = null;
function oled() {
  if (oledTex) return oledTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#05060a";
  g.fillRect(0, 0, 256, 64);
  const cols = ["#ff3b4f", "#2bff7a", "#3d7bff"];
  for (let x = 0; x < 256; x += 12) for (let y = 0; y < 64; y += 16) cols.forEach((col, k) => {
    g.fillStyle = col;
    g.fillRect(x + k * 4, y + 2, 3, 12);
  });
  oledTex = new THREE.CanvasTexture(c);
  oledTex.wrapS = oledTex.wrapT = THREE.RepeatWrapping;
  oledTex.repeat.set(10, 3);
  oledTex.colorSpace = THREE.SRGBColorSpace;
  return oledTex;
}

const material = (m: Mat, glueHot: number) => {
  switch (m) {
    case "cover":
      return <meshPhysicalMaterial color="#e3ecf6" transparent opacity={0.62} roughness={0.12} clearcoat={1} />;
    case "glue":
      return <meshStandardMaterial color={X.gold} emissive={X.gold} emissiveIntensity={0.15 + 1.4 * glueHot} transparent opacity={0.3 + 0.45 * glueHot} />;
    case "glass":
      return <meshPhysicalMaterial color="#9fcdf2" transparent opacity={0.5} roughness={0.05} metalness={0.1} clearcoat={1} />;
    case "oled":
      return <meshStandardMaterial map={oled()} emissiveMap={oled()} emissive="#ffffff" emissiveIntensity={0.9} roughness={0.4} />;
    case "film":
      return <meshStandardMaterial color="#3a3e46" roughness={0.75} />;
    case "titanium":
      return <meshPhysicalMaterial color="#8d939b" metalness={0.9} roughness={0.3} clearcoat={0.3} />;
  }
};

/** centre offsets of each layer from the cover, for a given gap */
function offsets(gap: number) {
  const c: number[] = [0];
  for (let i = 1; i < LAYERS.length; i++) c.push(c[i - 1] + LAYERS[i - 1].t / 2 + gap + LAYERS[i].t / 2);
  return c;
}

/** where a layer's far (right/top) end sits, in the stack's local frame */
function farEnd(c: number, angle: number): [number, number, number] {
  const r = R0 + c;
  const top = LEN - LEG - r * angle;
  const ex = r * Math.sin(angle), ey = r * (1 - Math.cos(angle));
  return [ex + top * Math.cos(angle), ey + top * Math.sin(angle) - c, WIDTH / 2];
}

export type StackMarks = {
  explode: number; // layers line starts (local frames)
  names: number[]; // when each named layer is said (5 entries, in LAYERS order of names)
  bend: number;
  farther: number;
  slide: number;
  end: number;
};

export const StackShot: React.FC<{ m: StackMarks }> = ({ m }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const explode = prog(f, m.explode, m.explode + 26, easeInOut);
  const bendP = prog(f, m.bend + 8, m.bend + 60, easeInOut);
  const gap = 0.42 * explode * (1 - bendP) + 0.03 * bendP;
  const wiggle = f > m.slide ? Math.sin((f - m.slide) / 7) * 0.05 * prog(f, m.slide, m.slide + 10) : 0;
  const angle = Math.PI * 0.96 * bendP + wiggle;
  const glueHot = prog(f, m.slide, m.slide + 12) * (0.7 + 0.3 * Math.sin((f - m.slide) / 4));
  const c = offsets(gap);
  const lift = c[c.length - 1] / 2; // centre the stack vertically

  const keys: CamKey[] = [
    { f: 0, pos: [6.6, 4.0, 15.5], look: [1.4, 0.5, 0], fov: 34 },
    { f: m.explode + 4, pos: [6.9, 4.1, 16.2], look: [1.4, 0.5, 0], fov: 34 },
    { f: m.explode + 34, pos: [12.4, 7.8, 27], look: [2.4, 0.7, 0], fov: 34 },
    { f: m.bend + 6, pos: [12.5, 7.8, 27.2], look: [2.4, 0.7, 0], fov: 34 },
    { f: m.bend + 50, pos: [-0.8, 2.0, 17.5], look: [-0.8, 1.2, 0], fov: 34 },
    { f: m.farther, pos: [-0.7, 2.0, 17.2], look: [-0.8, 1.2, 0], fov: 34 },
    { f: m.farther + 24, pos: [0.0, 2.2, 13.2], look: [-0.3, 1.3, 0], fov: 34 },
    { f: m.end, pos: [0.1, 2.2, 13.4], look: [-0.3, 1.3, 0], fov: 34 },
  ];
  const cam = camAt(keys, f, 1);

  const geoms = useMemo(
    () => LAYERS.map((L, i) => ribbonGeometry({ length: LEN, leg: LEG, radius: R0 + c[i], angle, width: WIDTH, thick: L.t, segs: 110 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gap.toFixed(4), angle.toFixed(4)],
  );

  // labels for the named layers, pinned to a point on each layer's flat leg
  const named = LAYERS.map((L, i) => ({ L, i })).filter((x) => x.L.name);
  const labelOp = (k: number) => prog(f, m.names[k], m.names[k] + 10) * (1 - prog(f, m.bend, m.bend + 12));
  const ends = LAYERS.map((_, i) => farEnd(c[i], angle));

  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
        <PerspectiveCamera makeDefault position={cam.position} rotation={cam.rotation} fov={cam.fov} near={0.1} far={200} />
        <StudioLights />
        <group position={[0, lift, 0]}>
          {LAYERS.map((L, i) => (
            <mesh key={i} geometry={geoms[i]} position={[0, -c[i], 0]}>
              {material(L.mat, glueHot)}
            </mesh>
          ))}
          {/* the far ends: where each layer stops once it's bent */}
          {f > m.farther
            ? ends.map((e, i) => (i === 0 || i === LAYERS.length - 1 ? <Glow key={i} position={e} size={0.42} color={i === 0 ? X.text : X.gold} opacity={0.9 * prog(f, m.farther, m.farther + 10)} /> : null))
            : null}
        </group>
      </ThreeCanvas>
      {named.map(({ L, i }, k) => {
        const p = project([1.6, lift - c[i], WIDTH / 2], cam);
        return <Leader key={i} x={p.x} y={p.y} tx={Math.max(p.x + 60, 760)} ty={p.y + (k - 2) * 18} text={L.name!} op={labelOp(k)} color={L.mat === "glass" || L.mat === "cover" ? "#cfe6ff" : L.mat === "oled" ? "#ff8fa0" : X.text} />;
      })}
      {(() => {
        const op = prog(f, m.farther + 6, m.farther + 18) * (1 - prog(f, m.slide - 6, m.slide + 6));
        // pinned to the top of each curve (always in frame), not the far ends
        const rIn = R0, rOut = R0 + c[c.length - 1];
        const a = project([rIn * Math.sin(angle / 2) , lift + rIn * (1 - Math.cos(angle / 2)), WIDTH / 2], cam);
        const b = project([rOut * Math.sin(angle / 2), lift + rOut * (1 - Math.cos(angle / 2)) - c[c.length - 1], WIDTH / 2], cam);
        return (
          <>
            <Leader x={b.x} y={b.y} tx={Math.min(700, b.x + 60)} ty={b.y + 300} text="outer layers" sub="go the long way round" op={op} color={X.gold} />
            <Leader x={a.x} y={a.y} tx={Math.max(140, a.x - 330)} ty={a.y - 260} text="inner layers" sub="take the short cut" op={op} color={X.text} />
          </>
        );
      })()}
      <Leader x={540} y={1400} tx={600} ty={1500} text="sliding adhesive" sub="lets the layers glide past each other" op={prog(f, m.slide + 4, m.slide + 16)} color={X.gold} />
    </AbsoluteFill>
  );
};
