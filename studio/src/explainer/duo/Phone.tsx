import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Environment, Lightformer, Line, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { camAt, Glow, rand, X, type CamKey } from "../kit";

// The iPhone Duo as a stylised foldable: two titanium halves on a vertical spine, the inner
// screen split across both. Proportions only roughly right — the series' honesty note covers it.
const HW = 3.6; // half width
const HH = 7.6; // height
const D = 0.2; // thickness of a half

let wallpaper: THREE.CanvasTexture | null = null;
function wallpaperTexture(): THREE.CanvasTexture {
  if (wallpaper) return wallpaper;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1080;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 1024, 1080);
  grad.addColorStop(0, "#1b2a5c");
  grad.addColorStop(0.5, "#3a2f7a");
  grad.addColorStop(1, "#0d1330");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1080);
  // soft light blobs, like an Apple wallpaper
  for (const [x, y, r, col] of [[260, 760, 420, "rgba(120,160,255,0.35)"], [800, 300, 380, "rgba(255,140,200,0.22)"]] as const) {
    const b = g.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, col);
    b.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = b;
    g.fillRect(0, 0, 1024, 1080);
  }
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "600 210px -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("9:41", 512, 330);
  g.font = "500 44px -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  g.fillText("Sunday, October 25", 512, 120);
  wallpaper = new THREE.CanvasTexture(c);
  wallpaper.colorSpace = THREE.SRGBColorSpace;
  return wallpaper;
}

const halfTex = (side: 0 | 1) => {
  const t = wallpaperTexture().clone();
  t.repeat.set(0.5, 1);
  t.offset.set(side * 0.5, 0);
  t.needsUpdate = true;
  return t;
};

// the crack: a jagged line down the right half, right beside the spine, revealed top-down
const CRACK = Array.from({ length: 26 }, (_, i) => {
  const y = HH / 2 - 0.5 - (i / 25) * (HH - 1);
  return [0.22 + (rand(i) - 0.5) * 0.22, y, 0] as [number, number, number];
});

export const Phone: React.FC<{ angle: number; crack?: number; crackGlow?: number }> = ({ angle, crack = 0, crackGlow = 0 }) => {
  const [lt, rt] = useMemo(() => [halfTex(0), halfTex(1)], []);
  const titanium = (
    <meshPhysicalMaterial color="#8d939b" metalness={0.9} roughness={0.28} clearcoat={0.4} clearcoatRoughness={0.3} />
  );
  const n = Math.max(2, Math.round(crack * CRACK.length));
  const rot = -(Math.PI - (angle * Math.PI) / 180);
  return (
    <group>
      {/* left half: fixed, spine edge at x=0 */}
      <group>
        <RoundedBox args={[HW, HH, D]} radius={0.09} smoothness={4} position={[-HW / 2, 0, 0]}>
          {titanium}
        </RoundedBox>
        <mesh position={[-HW / 2 + 0.06, 0, D / 2 + 0.003]}>
          <planeGeometry args={[HW - 0.16, HH - 0.2]} />
          <meshPhysicalMaterial map={lt} emissiveMap={lt} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.15} clearcoat={1} />
        </mesh>
      </group>
      {/* right half: swings about the spine */}
      <group rotation={[0, rot, 0]}>
        <RoundedBox args={[HW, HH, D]} radius={0.09} smoothness={4} position={[HW / 2, 0, 0]}>
          {titanium}
        </RoundedBox>
        <mesh position={[HW / 2 - 0.06, 0, D / 2 + 0.003]}>
          <planeGeometry args={[HW - 0.16, HH - 0.2]} />
          <meshPhysicalMaterial map={rt} emissiveMap={rt} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.15} clearcoat={1} />
        </mesh>
        {crack > 0 ? (
          <group position={[0, 0, D / 2 + 0.01]}>
            <Line points={CRACK.slice(0, n)} color="#ffffff" lineWidth={3.2} transparent opacity={0.95} />
            {crackGlow > 0
              ? CRACK.slice(0, n).filter((_, i) => i % 4 === 0).map((p, i) => <Glow key={i} position={p} size={0.45} color={X.goldHot} opacity={0.4 * crackGlow} />)
              : null}
          </group>
        ) : null}
      </group>
      {/* the spine */}
      <mesh position={[0, 0, -D * 0.1]}>
        <cylinderGeometry args={[D * 0.55, D * 0.55, HH - 0.12, 24]} />
        {titanium}
      </mesh>
    </group>
  );
};

/** shared studio lighting: a soft key, a cool rim, and an environment for the titanium */
export const StudioLights: React.FC<{ rim?: string }> = ({ rim = "#7aa2ff" }) => (
  <>
    <ambientLight intensity={0.25} />
    <directionalLight position={[6, 8, 10]} intensity={1.6} color="#fff4e6" />
    <directionalLight position={[-8, 3, -6]} intensity={1.2} color={rim} />
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 6, 8]} scale={[10, 4, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={1.2} position={[-9, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 10, 1]} color="#a9c1ff" />
      <Lightformer form="rect" intensity={0.8} position={[9, -2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 10, 1]} color="#ffd9a8" />
    </Environment>
  </>
);

/**
 * The phone shots (hook + ending). `keys` drive the camera; `angleAt(frame)` the fold;
 * `crackAt(frame)` reveals the crack; `shake` adds a few frames of camera shake.
 */
export const PhoneShot: React.FC<{ keys: CamKey[]; angleAt: (f: number) => number; crackAt?: (f: number) => number; shakeAt?: (f: number) => number }> = ({ keys, angleAt, crackAt, shakeAt }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(keys, f, 1);
  const s = shakeAt ? shakeAt(f) : 0;
  const pos: [number, number, number] = [cam.position[0] + (rand(f) - 0.5) * 0.18 * s, cam.position[1] + (rand(f + 7) - 0.5) * 0.18 * s, cam.position[2]];
  const crack = crackAt ? crackAt(f) : 0;
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
      <PerspectiveCamera makeDefault position={pos} rotation={cam.rotation} fov={cam.fov} near={0.1} far={200} />
      <StudioLights />
      <Phone angle={angleAt(f)} crack={crack} crackGlow={crack > 0 ? 1 : 0} />
    </ThreeCanvas>
  );
};
