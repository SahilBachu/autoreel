import { AbsoluteFill } from "remotion";
import { colors } from "../../style/tokens";

// Clean, professional: near-black with a soft top-center spotlight and a gentle
// edge vignette for depth. No visible grain.
export const Spotlight: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.bg }}>
    {/* soft spotlight from top-center */}
    <AbsoluteFill
      style={{
        background: `radial-gradient(90% 55% at 50% 0%, ${colors.accentSoft} 0%, rgba(0,0,0,0) 60%)`,
      }}
    />
    {/* subtle vertical lift */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%)`,
      }}
    />
    {/* edge vignette */}
    <AbsoluteFill
      style={{
        boxShadow: "inset 0 0 320px 80px rgba(0,0,0,0.65)",
      }}
    />
  </AbsoluteFill>
);
